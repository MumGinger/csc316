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
  const margin = { top: 20, right: 30, bottom: 110, left: 30 };
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  const radius = Math.min(width / 2.2, height * 0.95);

  container.append("h2")
    .style("margin", "0 0 6px 0")
    .style("font-family", "sans-serif")
    .style("font-size", "22px")
    .style("font-weight", "700")
    .text("CRASH Clock: Time to Potential Collision in Low Earth Orbit");

  container.append("div")
    .style("margin", "0 0 14px 0")
    .style("font-family", "sans-serif")
    .style("font-size", "14px")
    .style("color", "#444")
    .text("Expected time to a potential collision fell from 164 days in 2018 to 3.8 days by 26 January 2026");

  const svg = container.append("svg")
    .attr("width", outerWidth)
    .attr("height", outerHeight)
    .style("display", "block")
    .style("margin", "0 auto");

  const g = svg.append("g")
    .attr("transform", `translate(${outerWidth / 2}, ${margin.top + radius + 40})`);

  // no gradient defs — keep the arc minimal and neutral

  const daysMin = d3.min(parsed, d => d.days);
  const daysMax = d3.max(parsed, d => d.days);

  // Left = max days, right = min days
  // Top semicircle from -180° to 0°
  const angleScale = d3.scaleLinear()
    .domain([daysMax, daysMin])
    .range([-Math.PI, 0]);

  // background arc removed — minimal gauge without arc

  // no colored progress arc — minimal gauge only

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
      .attr("stroke", "#777")
      .attr("stroke-width", 1.2);

    ticks.append("text")
      .attr("x", lx)
      .attr("y", ly + 4)
      .attr("text-anchor", "middle")
      .style("font-family", "sans-serif")
      .style("font-size", "11px")
      .style("fill", "#333")
      .text(value);
  });

  const centerGroup = g.append("g");

  const valueText = centerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -10)
    .style("font-family", "sans-serif")
    .style("font-size", "34px")
    .style("font-weight", "700")
    .style("fill", "#111");

  centerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 18)
    .style("font-family", "sans-serif")
    .style("font-size", "13px")
    .style("fill", "#555")
    .text("expected time to potential collision");

  const dateText = centerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 40)
    .style("font-family", "sans-serif")
    .style("font-size", "13px")
    .style("fill", "#666");

  const needleGroup = g.append("g").attr("class", "needle");

  needleGroup.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", radius * 0.74)
    .attr("y2", 0)
    .attr("stroke", "#222")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  needleGroup.append("circle")
    .attr("r", 8)
    .attr("fill", "#222");

  // no floating tooltip — center text displays current date and value

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

  container.append("div")
    .style("margin", "14px 0 0 0")
    .style("font-family", "sans-serif")
    .style("font-size", "13px")
    .style("color", "#333")
    .text("The CRASH Clock is an environmental indicator of collision risk in low Earth orbit (LEO). It asks: if all manoeuvres were to stop, how long would it take until a potential collision occurs between tracked artificial objects, including satellites, debris, and abandoned rocket bodies?");

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
