import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Chart dimensions
const margin = { top: 40, right: 10, bottom: 60, left: 60 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const container = d3.select("#manufacturer");

// Create SVG
const svg = container.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .style("font-family", "sans-serif")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Scales that will be updated
let x = d3.scaleLinear().range([0, width]);
let y = d3.scaleLinear().range([height, 0]);

// Axes
let xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
let yAxis = d3.axisLeft(y);

// Axis groups
const xAxisGroup = svg.append("g")
  .attr("class", "x-axis axis")
  .attr("transform", `translate(0,${height})`);

const yAxisGroup = svg.append("g")
  .attr("class", "y-axis axis");

// Axis titles
const yAxisTitle = svg.append("text")
  .attr("class", "axis-title")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -45)
  .attr("text-anchor", "middle");

const xAxisTitle = svg.append("text")
  .attr("class", "x-axis-title")
  .attr("x", width / 2)
  .attr("y", height + 40)
  .attr("text-anchor", "middle");

let seriesGroup = svg.append("g").attr("class", "series");

container.style("position", "relative");
const tooltip = container.append("div").attr("class", "manufacturer-tooltip");

// Data holder
let _data = [];

Object.defineProperty(window, 'data', {
  get: function() { return _data; },
  set: function(value) { _data = value; updateVisualization(); }
});

// Dropdown
const rankingSelect = d3.select("#ranking-type");
if (!rankingSelect.empty()) {
  rankingSelect.on("change", updateVisualization);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const sel = d3.select("#ranking-type");
    if (!sel.empty()) sel.on("change", updateVisualization);
  });
}

// Loading data
function loadData() {
  d3.tsv("data/satcat.tsv").then(raw => {
    const parsed = raw.map(d => {
      const ldateRaw = d.LDate || "";
      let year = null;
      if (ldateRaw && typeof ldateRaw === 'string' && ldateRaw.length >= 4) {
        const y4 = ldateRaw.slice(0,4);
        const yi = parseInt(y4, 10);
        if (!Number.isNaN(yi)) year = yi;
      } else if (ldateRaw) {
        const dt = new Date(ldateRaw);
        if (!isNaN(dt)) year = dt.getFullYear();
      }

      // Selection of variables and cleaning for NAs
      const rawMan = d.Manufacturer;
      const trimmedMan = rawMan && typeof rawMan === 'string' ? rawMan.trim() : "";
      const manufacturer = (trimmedMan && trimmedMan !== "-" && trimmedMan.toUpperCase() !== "N/A") ? trimmedMan : null;
      const rawState = d.State;
      const state = (rawState && typeof rawState === 'string' && rawState.trim()) ? rawState.trim() : null;

  return { ...d, year, manufacturer, state };
    }).filter(d => {
      if (d.year === null) return false;
      const t = d.Type && typeof d.Type === 'string' ? d.Type.trim().charAt(0).toUpperCase() : null;
      return t === 'P';
    });

    _data = parsed;

    // initialize year slider
    const years = Array.from(new Set(_data.map(d => d.year))).sort((a, b) => a - b);
    if (years.length > 0) {
      const minY = years[0];
      const maxY = years[years.length - 1];
      const slider = d3.select("#year-slider");
      const sliderVal = d3.select("#year-slider-value");
      if (!slider.empty()) {
        slider.attr("min", minY).attr("max", maxY).attr("step", 1).property("value", maxY);
        sliderVal.text(maxY);
        slider.on("input", () => {
          sliderVal.text(slider.property("value"));
          updateVisualization();
        });
      }
    }
    updateVisualization();
  })
}

loadData();

// UPDATE VIS FUNCTION
function updateVisualization() {
  if (!_data || _data.length === 0) return;

  const selected = d3.select("#ranking-type").property("value");
  const groupKey = selected === 'owner' ? 'state' : 'manufacturer';

  const years = Array.from(new Set(_data.map(d => d.year))).sort((a, b) => a - b);
  if (years.length === 0) return;

  const slider = d3.select("#year-slider");
  const selectedYear = slider.empty() ? years[years.length - 1] : +slider.property("value");
  const visibleYears = years.filter(y => y <= selectedYear);
  if (visibleYears.length === 0) return;

  // build groups
  let groups = Array.from(new Set(_data.map(d => d[groupKey]).filter(v => v !== null))).sort();
  if (groupKey === 'state' && !groups.includes('Unknown')) groups.push('Unknown');


  const counts = new Map();
  groups.forEach(g => {
    const m = new Map();
    years.forEach(y => m.set(y, 0));
    counts.set(g, m);
  });

  _data.forEach(d => {
    const g = d[groupKey];
    if (!g) return;
    const map = counts.get(g);
    if (map) map.set(d.year, (map.get(d.year) || 0) + 1);
  });

  // FILTERING FOR VISIBLE YEARS
  const series = groups.map(g => ({
    key: g,
    values: visibleYears.map(y => ({ year: y, count: counts.get(g).get(y) }))
  }));

  const totals = series.map(s => ({ key: s.key, total: d3.sum(s.values, v => v.count) }));
  totals.sort((a, b) => d3.descending(a.total, b.total));
  const top = totals.slice(0, 10).map(d => d.key);

  const filteredSeries = series.filter(s => top.includes(s.key));

  const maxCount = d3.max(filteredSeries, s => d3.max(s.values, v => v.count)) || 1;

  // Filtering 
  x.domain([visibleYears[0], visibleYears[visibleYears.length - 1]]);

  y.domain([0, Math.ceil(1.1 * maxCount)]);

  // color
  const color = top.length <= 10
    ? d3.scaleOrdinal().domain(top).range(d3.schemeCategory10)
    : d3.scaleOrdinal().domain(top).range(top.map((_, i) => d3.interpolateRainbow(i / Math.max(1, top.length - 1))));

  // Years every 5
  xAxis.tickValues(visibleYears.filter((_, i) => {
    const step = Math.ceil(visibleYears.length / 20);
    return (i % step) === 0;
  }));

  xAxisGroup.transition().duration(500).call(xAxis);

  const yTickFormat = d => (d >= 1000 ? d3.format('.0s')(d) : d3.format('.0f')(d));
  yAxis.ticks(6).tickFormat(yTickFormat);
  yAxisGroup.transition().duration(500).call(yAxis);

  yAxisTitle.text("Number of satellites");
  xAxisTitle.text("Launch Year");

  // draw
  seriesGroup.selectAll("g.series-item").remove();

  const lineGen = d3.line()
    .defined(d => d.count !== null)
    .x(d => x(d.year))
    .y(d => y(d.count));

  const items = seriesGroup.selectAll("g.series-item")
    .data(filteredSeries, d => d.key)
    .enter()
    .append("g")
      .attr("class", "series-item");

  items.append("path")
    .attr("d", d => lineGen(d.values))
    .attr("fill", "none")
    .attr("stroke", d => color(d.key))
    .attr("stroke-width", d => top.includes(d.key) ? 1.8 : 1.0)
    .attr("opacity", d => top.includes(d.key) ? 0.95 : 0.12)
    .attr("id", d => `series-${CSS.escape(d.key)}`);

  items.selectAll("circle")
    .data(d => d.values.map(v => ({ key: d.key, ...v })))
    .enter()
    .append("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.count))
      .attr("r", d => top.includes(d.key) ? 2.8 : 1.6)
      .attr("fill", d => color(d.key))
      .attr("opacity", d => top.includes(d.key) ? 0.9 : 0.08)
      .each(function(d) {
        if (top.includes(d.key)) {
          d3.select(this)
            .on("mouseover", (event, dd) => onPointHover(event, dd, groupKey))
            .on("mousemove", (event, dd) => onPointMove(event, dd))
            .on("mouseout", (event, dd) => onPointOut(event, dd));
        }
      });

  function highlightKey(k) {
    seriesGroup.selectAll("path")
      .transition().duration(120)
      .attr("opacity", d => (k === null || d.key === k) ? 0.95 : 0.12)
      .attr("stroke-width", d => (k === d.key) ? 3 : 1.2);
    seriesGroup.selectAll("circle")
      .transition().duration(120)
      .attr("opacity", d => (k === null || d.key === k) ? 0.95 : 0.06)
      .attr("r", d => (k === d.key) ? 3.2 : 1.8);
  }

  function onPointHover(event, d, groupKey) {
    highlightKey(d.key);
    tooltip.style("display", "block");
    updateTooltipContent(d);
  }

  function onPointMove(event, d) {
    const rect = container.node().getBoundingClientRect();
    const left = event.clientX - rect.left + 12;
    const top = event.clientY - rect.top + 12;
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
    updateTooltipContent(d);
  }

  function onPointOut(event, d) {
    highlightKey(null);
    tooltip.style("display", "none");
  }

  function updateTooltipContent(d) {
    const label = d.key;
    tooltip.html(`<strong>${label}</strong><br/>Year: ${d.year}<br/>Satellites: ${d.count}`);
  }
}

