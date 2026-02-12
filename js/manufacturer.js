import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Chart dimensions
// Chart dimensions
const margin = { top: 40, right: 10, bottom: 60, left: 60 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const container = d3.select("#manufacturer");

// Create SVG using the project's preferred structure
const svg = container.append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .style("font-family", "sans-serif")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Scales that will be updated
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

// Axes
const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
const yAxis = d3.axisLeft(y);

// Axis groups
const xAxisGroup = svg.append("g")
  .attr("class", "x-axis axis")
  .attr("transform", `translate(0,${height})`);

const yAxisGroup = svg.append("g")
  .attr("class", "y-axis axis");

// Optional y-axis title
const yAxisTitle = svg.append("text")
  .attr("class", "axis-title")
  .attr("x", 0)
  .attr("y", -15)
  .attr("text-anchor", "middle");

// X-axis title placed under the axis
const xAxisTitle = svg.append("text")
  .attr("class", "x-axis-title")
  .attr("x", width / 2)
  .attr("y", height + 40)
  .attr("text-anchor", "middle");

// Container group for series
let seriesGroup = svg.append("g").attr("class", "series");

// Tooltip
container.style("position", "relative");
const tooltip = container.append("div")
  .attr("class", "manufacturer-tooltip")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("background", "rgba(255,255,255,0.95)")
  .style("border", "1px solid #999")
  .style("padding", "6px 8px")
  .style("font-size", "12px")
  .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
  .style("border-radius", "4px")
  .style("display", "none");

// Data holder
let _data = [];

Object.defineProperty(window, 'data', {
  get: function() { return _data; },
  set: function(value) { _data = value; updateVisualization(); }
});

// Listen to dropdown changes. Attach immediately if the element exists, otherwise wait for DOMContentLoaded.
const rankingSelect = d3.select("#ranking-type");
if (!rankingSelect.empty()) {
  rankingSelect.on("change", updateVisualization);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const sel = d3.select("#ranking-type");
    if (!sel.empty()) sel.on("change", updateVisualization);
  });
}

// Load TSV once
function loadData() {
  d3.tsv("data/satcat.tsv").then(raw => {
    const parsed = raw.map(d => {
      const ldateRaw = d.LDate ?? d.LDATE ?? d.Ldate ?? d.LAUNCH_DATE ?? "";
      let year = null;
      if (ldateRaw && typeof ldateRaw === 'string' && ldateRaw.length >= 4) {
        const y4 = ldateRaw.slice(0,4);
        const yi = parseInt(y4, 10);
        if (!Number.isNaN(yi)) year = yi;
      } else if (ldateRaw) {
        const dt = new Date(ldateRaw);
        if (!isNaN(dt)) year = dt.getFullYear();
      }

      const rawMan = (d.Manufacturer ?? d.MANUFACTURER ?? d.manufacturer ?? d.Manuf ?? d.Mfr ?? "");
      const trimmedMan = rawMan && typeof rawMan === 'string' ? rawMan.trim() : "";
      const manufacturer = (trimmedMan && trimmedMan !== "-" && trimmedMan.toUpperCase() !== "N/A") ? trimmedMan : null;

      const rawOwner = (d.OWNER ?? d.Owner ?? d.owner ?? "");
        const owner = (rawOwner && typeof rawOwner === 'string' && rawOwner.trim()) ? rawOwner.trim() : "Unknown";

        // State / Country: prefer explicit STATE column, otherwise fall back to owner
        const rawState = (d.STATE ?? d.State ?? d.state ?? "");
        const state = (rawState && typeof rawState === 'string' && rawState.trim()) ? rawState.trim() : owner;

      return { ...d, year, manufacturer, owner, state };
    }).filter(d => d.year !== null);

    // store into window.data to trigger update
    data = parsed;
  }).catch(err => {
    console.error("Error loading satcat.tsv:", err);
    container.append("div").text("Failed to load satellite data. See console for details.");
  });
}

loadData();

function updateVisualization() {
  if (!window.data || window.data.length === 0) return;

  const selected = d3.select("#ranking-type").property("value"); // 'manufacturer' or 'owner'
  // 'owner' option actually maps to state/country grouping
  const groupKey = selected === 'owner' ? 'state' : 'manufacturer';

  // Build years set from data
  const years = Array.from(new Set(window.data.map(d => d.year))).sort((a, b) => a - b);
  if (years.length === 0) return;

  // Group keys (manufacturers or owners)
  let groups = Array.from(new Set(window.data.map(d => d[groupKey]).filter(v => v !== null))).sort();

  // If grouping by state and some rows are missing, ensure Unknown is present
  if (groupKey === 'state' && !groups.includes('Unknown')) groups.push('Unknown');

  // Build counts map
  const counts = new Map();
  groups.forEach(g => {
    const m = new Map();
    years.forEach(y => m.set(y, 0));
    counts.set(g, m);
  });

  window.data.forEach(d => {
    const g = d[groupKey];
    if (!g) return; // skip null manufacturers
    const map = counts.get(g);
    if (map) map.set(d.year, (map.get(d.year) || 0) + 1);
  });

  const series = groups.map(g => ({
    key: g,
    values: years.map(y => ({ year: y, count: counts.get(g).get(y) }))
  }));

  // Compute top 15
  const totals = series.map(s => ({ key: s.key, total: d3.sum(s.values, v => v.count) }));
  totals.sort((a, b) => d3.descending(a.total, b.total));
  const top = totals.slice(0, 15).map(d => d.key);

  const maxCount = d3.max(series, s => d3.max(s.values, v => v.count)) || 1;

  x.domain([years[0], years[years.length - 1]]);
  y.domain([0, maxCount]).nice();

  // color scale
  const color = groups.length <= 10
    ? d3.scaleOrdinal().domain(groups).range(d3.schemeCategory10)
    : d3.scaleOrdinal().domain(groups).range(groups.map((_, i) => d3.interpolateRainbow(i / Math.max(1, groups.length - 1))));

  // update axes
  xAxis.tickValues(years.filter((_, i) => {
    // choose up to 10 ticks evenly
    const step = Math.ceil(years.length / 10);
    return (i % step) === 0;
  }));

  xAxisGroup.transition().duration(500).call(xAxis);
  yAxisGroup.transition().duration(500).call(yAxis);
  yAxisTitle.text("# of Satellites");
  xAxisTitle.text("Launch Year");

  // clear previous series
  seriesGroup.selectAll("g.series-item").remove();

  const lineGen = d3.line()
    .defined(d => d.count !== null)
    .x(d => x(d.year))
    .y(d => y(d.count));

  const items = seriesGroup.selectAll("g.series-item")
    .data(series, d => d.key)
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

  // points
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

