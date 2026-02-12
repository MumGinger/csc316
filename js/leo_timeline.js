import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const mount = d3.select("#leo-timeline");
if (mount.empty()) {
  throw new Error("Missing #leo-timeline container");
}

const width = 920;
const height = 560;
const earthRadius = 250;
const cx = width / 2;
const cy = height + 120;
const MAX_RENDERED = 1500;

const parseDate = d3.utcParse("%Y-%m-%d");
const fmt = d3.format(",");

const controls = mount
  .append("div")
  .style("display", "flex")
  .style("gap", "12px")
  .style("align-items", "center")
  .style("justify-content", "center")
  .style("margin", "8px 0 10px 0")
  .style("flex-wrap", "wrap");

const yearLabel = controls
  .append("strong")
  .style("min-width", "64px")
  .text("----");

const slider = controls
  .append("input")
  .attr("type", "range")
  .style("width", "420px");

// NEW: type filter controls
const filterWrap = mount
  .append("div")
  .style("display", "flex")
  .style("gap", "14px")
  .style("justify-content", "center")
  .style("align-items", "center")
  .style("margin", "0 0 10px 0")
  .style("flex-wrap", "wrap");

filterWrap.append("span").style("font-weight", "600").text("Show:");

const TYPE_OPTIONS = [
  { value: "PAY", label: "Payloads" },
  { value: "R/B", label: "Rocket bodies" },
  { value: "DEB", label: "Debris" }
];

const selectedTypes = new Set(TYPE_OPTIONS.map((d) => d.value));

TYPE_OPTIONS.forEach((opt) => {
  const lbl = filterWrap.append("label").style("display", "inline-flex").style("gap", "6px").style("align-items", "center");
  lbl.append("input")
    .attr("type", "checkbox")
    .attr("value", opt.value)
    .property("checked", true)
    .on("change", (event) => {
      if (event.target.checked) selectedTypes.add(opt.value);
      else selectedTypes.delete(opt.value);

      // allow zero selections; render explicit empty state
      renderYear(+slider.property("value"));
    });

  lbl.append("span").text(opt.label);
});

const svg = mount
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("width", "100%")
  .style("max-width", `${width}px`)
  .style("background", "radial-gradient(circle at 50% 15%, #1a2a4f, #0b1020 60%, #080b15)");

const defs = svg.append("defs");
const grad = defs.append("linearGradient").attr("id", "earthGrad").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
grad.append("stop").attr("offset", "0%").attr("stop-color", "#2f79ff");
grad.append("stop").attr("offset", "60%").attr("stop-color", "#1b4fb9");
grad.append("stop").attr("offset", "100%").attr("stop-color", "#0f2f70");

const stars = d3.range(140).map((i) => {
  const rng = mulberry32(1000 + i);
  return { x: rng() * width, y: rng() * (height * 0.65), r: rng() * 1.5 + 0.4, a: rng() * 0.6 + 0.2 };
});
svg.append("g")
  .selectAll("circle")
  .data(stars)
  .join("circle")
  .attr("cx", (d) => d.x)
  .attr("cy", (d) => d.y)
  .attr("r", (d) => d.r)
  .attr("fill", "#fff")
  .attr("opacity", (d) => d.a);

svg.append("circle")
  .attr("cx", cx)
  .attr("cy", cy)
  .attr("r", earthRadius + 12)
  .attr("fill", "none")
  .attr("stroke", "#78b5ff")
  .attr("stroke-opacity", 0.25)
  .attr("stroke-width", 14);

svg.append("circle")
  .attr("cx", cx)
  .attr("cy", cy)
  .attr("r", earthRadius)
  .attr("fill", "url(#earthGrad)")
  .attr("stroke", "#a6d4ff")
  .attr("stroke-opacity", 0.35)
  .attr("stroke-width", 2);

const satLayer = svg.append("g");
let satSel = satLayer.selectAll("circle");

const countText = svg.append("text")
  .attr("x", width / 2)
  .attr("y", height * 0.35)
  .attr("text-anchor", "middle")
  .style("font-size", "48px")
  .style("font-weight", "800")
  .style("fill", "#ffffff")
  .text("0");

const countLabel = svg.append("text")
  .attr("x", width / 2)
  .attr("y", height * 0.35 + 28)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#d9e7ff")
  .text("LEO satellites in selected year");

const renderedNote = svg.append("text")
  .attr("x", width / 2)
  .attr("y", height * 0.35 + 48)
  .attr("text-anchor", "middle")
  .style("font-size", "11px")
  .style("fill", "#a9bce0")
  .text("");

const timelineY = 70;
const axisG = svg.append("g").attr("transform", `translate(0, ${timelineY})`);
const innovationsG = svg.append("g");

// Add an in-vis timeline track and moving red pin marker.
const pinTrack = svg.append("line")
  .attr("x1", 70)
  .attr("x2", width - 70)
  .attr("y1", timelineY)
  .attr("y2", timelineY)
  .attr("stroke", "#ffffff")
  .attr("stroke-opacity", 0.2)
  .attr("stroke-width", 6)
  .attr("stroke-linecap", "round");

const pinG = svg.append("g");
pinG.append("line")
  .attr("x1", 0)
  .attr("x2", 0)
  .attr("y1", timelineY - 36)
  .attr("y2", timelineY + 6)
  .attr("stroke", "#ff4d4f")
  .attr("stroke-width", 2);

pinG.append("circle")
  .attr("cx", 0)
  .attr("cy", timelineY - 40)
  .attr("r", 7)
  .attr("fill", "#ff4d4f")
  .attr("stroke", "#ffd6d6")
  .attr("stroke-width", 1.5);

pinG.append("text")
  .attr("class", "pin-year")
  .attr("x", 0)
  .attr("y", timelineY - 52)
  .attr("text-anchor", "middle")
  .style("font-size", "11px")
  .style("font-weight", "700")
  .style("fill", "#ffd6d6");

const innovationEvents = [
  { year: 1957, label: "Sputnik 1" },
  { year: 1962, label: "Telstar era" },
  { year: 1990, label: "Hubble" },
  { year: 1997, label: "Iridium" },
  { year: 2019, label: "Starlink era" }
];

const data = await d3.csv("data/satcat.csv", (d, i) => {
  const launchDate = parseDate(d.LAUNCH_DATE);
  const decayDate = d.DECAY_DATE ? parseDate(d.DECAY_DATE) : null;
  const apogee = toNum(d.APOGEE);
  const period = toNum(d.PERIOD);
  const norad = +d.NORAD_CAT_ID || i + 1;
  const objectType = (d.OBJECT_TYPE || "").trim();

  const isEarth = d.ORBIT_CENTER === "EA";
  const leoByApogee = Number.isFinite(apogee) && apogee <= 2000;
  const leoByPeriod = Number.isFinite(period) && period <= 127;
  const isLeo = isEarth && (leoByApogee || leoByPeriod);

  if (!launchDate || !isLeo) return null;

  const rng = mulberry32(norad);
  const baseAngle = Math.PI + rng() * Math.PI;
  const baseRadius = earthRadius + 35 + rng() * 190;
  const drift = (0.08 + rng() * 0.20) * (rng() < 0.5 ? -1 : 1);

  return {
    ...d,
    objectType,
    launchDate,
    decayDate,
    norad,
    baseAngle,
    baseRadius,
    drift
  };
});

const leoData = data.filter(Boolean).sort((a, b) => d3.ascending(a.launchDate, b.launchDate));
if (!leoData.length) {
  mount.append("p").text("No LEO records found.");
  throw new Error("No usable LEO data.");
}

const minYear = d3.min(leoData, (d) => d.launchDate.getUTCFullYear());
const maxYear = Math.min(new Date().getUTCFullYear(), d3.max(leoData, (d) => d.launchDate.getUTCFullYear()));

slider.attr("min", minYear).attr("max", maxYear).attr("step", 1).attr("value", minYear);
yearLabel.text(minYear);

const xYear = d3.scaleLinear().domain([minYear, maxYear]).range([70, width - 70]);
axisG.call(d3.axisBottom(xYear).ticks(Math.max(4, Math.floor((maxYear - minYear) / 8))).tickFormat(d3.format("d")));
axisG.selectAll("text").style("fill", "#dce7ff");
axisG.selectAll("line,path").style("stroke", "#8ea8d4");

const visibleInnovations = innovationEvents.filter((e) => e.year >= minYear && e.year <= maxYear);
innovationsG.selectAll("line")
  .data(visibleInnovations)
  .join("line")
  .attr("x1", (d) => xYear(d.year))
  .attr("x2", (d) => xYear(d.year))
  .attr("y1", 22)
  .attr("y2", timelineY - 2)
  .attr("stroke", "#ff9a76")
  .attr("stroke-width", 1.2)
  .attr("opacity", 0.9);

innovationsG.selectAll("circle")
  .data(visibleInnovations)
  .join("circle")
  .attr("cx", (d) => xYear(d.year))
  .attr("cy", 22)
  .attr("r", 3.4)
  .attr("fill", "#ff7a45");

innovationsG.selectAll("text")
  .data(visibleInnovations)
  .join("text")
  .attr("x", (d) => xYear(d.year))
  .attr("y", 16)
  .attr("text-anchor", "middle")
  .style("font-size", "10px")
  .style("fill", "#ffd7c7")
  .text((d) => d.label);

let currentActive = [];

function activeAtYear(year) {
  const t = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  return leoData.filter((d) =>
    selectedTypes.has(d.objectType) &&
    d.launchDate <= t &&
    (!d.decayDate || d.decayDate > t)
  );
}

function subsample(arr, maxCount) {
  if (arr.length <= maxCount) return arr;
  const step = Math.ceil(arr.length / maxCount);
  return arr.filter((_, i) => i % step === 0);
}

function renderYear(year) {
  const active = activeAtYear(year);
  currentActive = active;

  const visible = subsample(active, MAX_RENDERED);
  satSel = satLayer
    .selectAll("circle")
    .data(visible, (d) => d.norad)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("r", 2.2)
          .attr("fill", "#ffd166")
          .attr("stroke", "#fff4c7")
          .attr("stroke-width", 0.3)
          .attr("opacity", 0.95),
      (update) => update,
      (exit) => exit.remove()
    );

  countText.text(fmt(active.length));
  renderedNote.text(active.length > MAX_RENDERED ? `showing ${fmt(visible.length)} animated points` : "");
  yearLabel.text(year);

  // Sync the in-vis red pin with the slider year.
  const px = xYear(year);
  pinG.attr("transform", `translate(${px},0)`);
  pinG.select("text.pin-year").text(year);
}

slider.on("input", (event) => renderYear(+event.target.value));
renderYear(minYear);

d3.timer((elapsed) => {
  if (!currentActive.length) return;
  const t = elapsed / 1000;
  const crowdFactor = 1 + Math.min(2, currentActive.length / 3500);

  satSel
    .attr("cx", (d) => cx + Math.cos(d.baseAngle + t * d.drift * crowdFactor) * d.baseRadius)
    .attr("cy", (d) => cy + Math.sin(d.baseAngle + t * d.drift * crowdFactor) * d.baseRadius);
});

function toNum(v) {
  const n = +v;
  return Number.isFinite(n) ? n : NaN;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}