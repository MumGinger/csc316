import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const data = [
  { date: "2018-01-01", label: "1 Jan 2018", days: 164 },
  { date: "2019-01-01", label: "1 Jan 2019", days: 119 },
  { date: "2020-01-01", label: "1 Jan 2020", days: 102 },
  { date: "2021-01-01", label: "1 Jan 2021", days: 62 },
  { date: "2022-01-01", label: "1 Jan 2022", days: 26 },
  { date: "2023-01-01", label: "1 Jan 2023", days: 11 },
  { date: "2024-01-01", label: "1 Jan 2024", days: 6.8 },
  { date: "2025-01-01", label: "1 Jan 2025", days: 6.8 },
  { date: "2025-06-25", label: "25 Jun 2025", days: 5.5 },
  { date: "2026-01-26", label: "26 Jan 2026", days: 3.8 }
];

let initialized = false;

export default function initCrashViz(containerId = "crash-viz") {
  if (initialized) return;

  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;

  container.selectAll("*").remove();
  container.style("position", "relative");

  const parsed = data
    .map(d => ({ ...d, dateObj: new Date(d.date) }))
    .sort((a, b) => a.dateObj - b.dateObj);

    const outerWidth = Math.max(420, Math.min(920, container.node().getBoundingClientRect().width || 700));
    const outerHeight = 520;
    const margin = { top: 36, right: 30, bottom: 36, left: 60 };
    const width = outerWidth - margin.left - margin.right;
    const height = outerHeight - margin.top - margin.bottom;
  const lcHeight = Math.min(160, Math.floor(height * 0.38));
    const lcWidth = width;
  const availForGauge = Math.max(120, height - lcHeight - 20);
  const radius = Math.min(width / 2.2, availForGauge * 0.9);
  const verticalGap = 40; 

    const svg = container.append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("font-family", "sans-serif")
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const lcG = svg.append('g').attr('class', 'line-chart');

  const xLC = d3.scaleTime()
    .domain(d3.extent(parsed, d => d.dateObj))
    .range([0, lcWidth]);

  const yLC = d3.scaleLinear()
    .domain([0, d3.max(parsed, d => d.days)])
    .range([lcHeight, 0]);

  const xAxisLC = d3.axisBottom(xLC).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat('%Y'));
  const yAxisLC = d3.axisLeft(yLC).ticks(4);

  const lineLC = d3.line()
    .x(d => xLC(d.dateObj))
    .y(d => yLC(d.days))
    .curve(d3.curveMonotoneX);

  lcG.append('path')
    .datum(parsed)
    .attr('d', lineLC)
    .attr('fill', 'none')
    .attr('stroke', '#eb1c1cff')
    .attr('stroke-width', 2.5)
    .attr('opacity', 0.95);

  const xAxisG = lcG.append('g')
    .attr('transform', `translate(0, ${lcHeight})`)
    .call(xAxisLC);

  xAxisG.selectAll('text')
    .style('fill', '#ddd')
    .style('font-size', '11px');

  const yAxisG = lcG.append('g')
    .call(yAxisLC);

  yAxisG.selectAll('text')
    .style('fill', '#ddd')
    .style('font-size', '11px');

  
  yAxisG.append('text')
    .attr('transform', `rotate(-90)`) 
    .attr('x', -lcHeight / 2)
    .attr('y', -40)
    .attr('text-anchor', 'middle')
    .style('fill', '#ddd')
    .attr('fill', '#ddd')
    .style('font-family', 'sans-serif')
    .style('font-size', '12px')
    .text('days');

  const points = lcG.selectAll('circle.point')
    .data(parsed)
    .enter()
    .append('circle')
    .attr('class', 'point')
    .attr('cx', d => xLC(d.dateObj))
    .attr('cy', d => yLC(d.days))
    .attr('r', 4.5)
    .attr('fill', '#fff')
    .attr('stroke', '#1a1a1a')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      try { updateGauge(d, false); } catch (e) {}
      d3.select(this).transition().duration(120).attr('r', 6);
    })
    .on('mouseout', function() {
      d3.select(this).transition().duration(120).attr('r', 4.5);
    });

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${lcHeight + radius + verticalGap})`);


  const daysMin = d3.min(parsed, d => d.days);
  const daysMax = d3.max(parsed, d => d.days);

  const angleScale = d3.scaleLinear()
    .domain([daysMax, daysMin])
    .range([-Math.PI, 0]);

  const tickValues = [164, 120, 100, 60, 25, 10, 3.8];
  const ticks = g.append("g");

  tickValues.forEach(value => {
    const a = angleScale(value);
    const x1 = Math.cos(a) * radius * 0.76;
    const y1 = Math.sin(a) * radius * 0.76;
    const x2 = Math.cos(a) * radius * 0.95;
    const y2 = Math.sin(a) * radius * 0.95;

    const lx = Math.cos(a) * radius * 1.06;
    const ly = Math.sin(a) * radius * 1.06;

    ticks.append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "#bbb")
      .attr("stroke-width", 1.2);

    ticks.append("text")
      .attr("x", lx)
      .attr("y", ly + 4)
      .attr("text-anchor", "middle")
      .style("font-family", "sans-serif")
      .style("font-size", "11px")
      .style("fill", "#ddd")
      .text(value);
  });

  const centerGroup = g.append("g");

  const valueText = centerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -10)
    .style("font-family", "sans-serif")
    .style("font-size", "34px")
    .style("font-weight", "700")
    .style("fill", "#fff");

  centerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 18)
    .style("font-family", "sans-serif")
    .style("font-size", "13px")
    .style("fill", "#ccc")
    .text("expected time to potential collision");

  const dateText = centerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 40)
    .style("font-family", "sans-serif")
    .style("font-size", "13px")
    .style("fill", "#bbb");

  const needleGroup = g.append("g").attr("class", "needle");

  needleGroup.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", radius * 0.74)
    .attr("y2", 0)
    .attr("stroke", "#fff")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  needleGroup.append("circle")
    .attr("r", 8)
    .attr("fill", "#fff");


  function updateGauge(d, instant = false) {
    const angle = angleScale(d.days);
    const deg = angle * 180 / Math.PI;

    if (instant) {
      needleGroup.attr("transform", `rotate(${deg})`);
      valueText.text(`${d.days} days`);
    } else {
      const previousAngle = needleGroup.node().__angle ?? angleScale(parsed[0].days);
      const interpAngle = d3.interpolateNumber(previousAngle, angle);
      const previousValue = needleGroup.node().__value ?? parsed[0].days;
      const interpValue = d3.interpolateNumber(previousValue, d.days);

      needleGroup.transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .attrTween("transform", function() {
          return function(t) {
            const a = interpAngle(t);
            return `rotate(${a * 180 / Math.PI})`;
          };
        });

      valueText.transition()
        .duration(1000)
        .tween("text", function() {
          const el = d3.select(this);
          return function(t) {
            const val = interpValue(t);
            el.text(`${d3.format(".1f")(val).replace(".0", "")} days`);
          };
        });
    }

    needleGroup.node().__angle = angle;
    needleGroup.node().__value = d.days;

    dateText.text(d.label);
  }

  async function playSequence() {
    for (let i = 0; i < parsed.length; i++) {
      updateGauge(parsed[i], i === 0);
      await new Promise(r => setTimeout(r, 1400));
      if (i < parsed.length - 1) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
  }

  updateGauge(parsed[0], true);
  playSequence().catch(() => {});
  initialized = true;
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("crash-viz");
  if (!container) return;

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        initCrashViz("crash-viz");
        observer.disconnect();
      }
    });
  }, { threshold: 0.15 });

  obs.observe(container);
});
