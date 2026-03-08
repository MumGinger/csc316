import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const mount = d3.select("#leo-timeline")
  .style("position", "relative")
  .style("height", "900vh")
  .style("background", "#05070a")
  .style("margin-top", "0")
  .style("padding-top", "50vh");

const sticky = mount.append("div")
  .style("position", "sticky")
  .style("top", "0")
  .style("height", "100vh")
  .style("width", "100%")
  .style("margin-top", "0")
  .style("align-self", "start")
  .style("overflow", "hidden");

const width = 900;
const height = 900;
const svg = sticky.append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("width", "100%")
  .style("height", "100%");

const tEarthR = 300;
const dEarthR = 45;
const tCy = height + 50;
const dCy = height / 2;
const timelineY = 820;

const densityLayer = svg.append("g").style("opacity", 0);
const globalAxisLayer = svg.append("g").style("opacity", 0);
const satLayer = svg.append("g");
const earthLayer = svg.append("g");
const uiLayer = svg.append("g");
const timelineG = uiLayer.append("g").attr("class", "timeline-ui");

const rScaleGlobal = d3.scalePow().exponent(0.45).domain([0, 40000]).range([dEarthR, width / 2 - 40]);

const events = [
  { year: 1957, label: "Sputnik 1" },
  { year: 1962, label: "Telstar" },
  { year: 1990, label: "Hubble" },
  { year: 1998, label: "ISS" },
  { year: 2019, label: "Starlink" }
];

async function init() {
  const rawData = await d3.tsv("data/satcat.tsv");

  const processedData = rawData.map((d, i) => {
    const alt = +d.Altitude || +d.Perigee || 0;
    const launchYear = d.Launch_Date ? new Date(d.Launch_Date).getUTCFullYear() : 1957;
    if (alt <= 0) return null;

    const rng = mulberry32(i);
    return {
      id: d.NORAD_CAT_ID || i,
      altitude: alt,
      launchYear,
      type: d.Type,
      decayYear: d.Decay_Date ? new Date(d.Decay_Date).getUTCFullYear() : 9999,
      baseAngle: (rng() * 2 * Math.PI),
      drift: (0.02 + rng() * 0.05),
      relativeAlt: (alt / 2000) * 450,
      isLeo: alt <= 2000
    };
  }).filter(d => d !== null).filter(d => d.type[0] === "P");

  const startYear = 1952;
  const endYear = 2025;

  const satelliteCountScale = d3.scaleLog().domain([1957, endYear]).range([1, processedData.length]).clamp(true);
  const yearScale = d3.scaleLinear().domain([0.05, 0.65]).range([startYear, endYear]).clamp(true);
  const xTimeline = d3.scaleLinear().domain([startYear, endYear]).range([100, width - 100]);

  timelineG.append("line")
    .attr("x1", xTimeline(startYear)).attr("x2", xTimeline(endYear))
    .attr("y1", timelineY).attr("y2", timelineY)
    .attr("stroke", "rgba(255,255,255,0.15)").attr("stroke-width", 6).attr("stroke-linecap", "round");

  const innovs = timelineG.selectAll(".innov").data(events).join("g");
  innovs.append("line")
    .attr("x1", d => xTimeline(d.year)).attr("x2", d => xTimeline(d.year))
    .attr("y1", timelineY - 15).attr("y2", timelineY)
    .attr("stroke", "#ff9a76").attr("stroke-width", 1.5);
  innovs.append("text")
    .attr("x", d => xTimeline(d.year)).attr("y", timelineY - 22)
    .attr("text-anchor", "middle").style("fill", "#ff9a76").style("font-size", "11px")
    .text(d => d.label);

  const pinG = timelineG.append("g");
  pinG.append("line").attr("y1", timelineY - 35).attr("y2", timelineY + 5).attr("stroke", "#ff4d4f").attr("stroke-width", 2);
  pinG.append("circle").attr("cy", timelineY - 38).attr("r", 6).attr("fill", "#ff4d4f");
  const pinText = pinG.append("text").attr("y", timelineY - 50).attr("text-anchor", "middle").style("fill", "#ff4d4f").style("font-weight", "bold");

  const bins = d3.bin().domain([0, 40000]).thresholds(300)(processedData.map(d => d.altitude));
  const colorDensity = d3.scaleSequential(d3.interpolateInferno)
    .domain([0, Math.log10(d3.max(bins, b => b.length / (b.x1 - b.x0) + 1))]);

  densityLayer.selectAll("path").data(bins).join("path")
    .attr("d", b => d3.arc().startAngle(0).endAngle(2 * Math.PI)({ innerRadius: rScaleGlobal(b.x0), outerRadius: rScaleGlobal(b.x1) }))
    .attr("fill", b => colorDensity(Math.log10((b.length / (b.x1 - b.x0)) + 1)));

  const yearText = uiLayer.append("text")
    .attr("x", width / 2).attr("y", 120).attr("text-anchor", "middle")
    .style("font-size", "100px").style("font-weight", "900")
    .style("fill", "rgba(255, 255, 255, 0.1)").text(startYear);

  const countText = uiLayer.append("text")
    .attr("x", width / 2).attr("y", 160).attr("text-anchor", "middle")
    .style("font-size", "20px").style("fill", "#ffd166").text("0 Satellites");

  const labelText = uiLayer.append("text")
    .attr("x", 0).attr("y", 100).attr("text-anchor", "middle")
    .style("font-size", "30px").style("fill", "white").text("Payloads in orbit 1957-2025");

  const labelTextB = uiLayer.append("text")
    .attr("x", 0).attr("y", 100).attr("text-anchor", "middle").attr("opacity", 0)
    .style("font-size", "30px").style("fill", "white").text("Orbital Density 2026");

  const globalAxis = d3.axisLeft(rScaleGlobal).ticks(6).tickFormat(d => d === 0 ? "" : `${d}km`);
  globalAxisLayer.append("g").call(globalAxis).style("color", "#ff9a76");

  const earthCircle = earthLayer.append("circle")
    .attr("cx", width / 2).attr("fill", "#1b4fb9").attr("stroke", "#78b5ff").attr("stroke-width", 2);

  window.addEventListener("scroll", () => {
    const rect = mount.node().getBoundingClientRect();
    const scrollP = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
    const zoomP = Math.max(0, (scrollP - 0.65) / 0.35);
    const currentYear = Math.floor(yearScale(scrollP));

    yearText.text(currentYear).style("opacity", 1 - (zoomP * 2));
    pinG.attr("transform", `translate(${xTimeline(currentYear)}, 0)`);
    pinText.text(currentYear);
    timelineG.style("opacity", 1 - (zoomP * 1.5));

    const currentCy = d3.interpolateNumber(tCy, dCy)(zoomP);
    const currentR = d3.interpolateNumber(tEarthR, dEarthR)(zoomP);

    earthCircle.attr("cy", currentCy).attr("r", currentR);
    satLayer.style("opacity", 1 - zoomP);

    densityLayer.style("opacity", zoomP).attr("transform", `translate(${width / 2}, ${currentCy})`);
    globalAxisLayer.style("opacity", zoomP > 0.4 ? (zoomP - 0.4) * 2 : 0).attr("transform", `translate(${width / 2 - 15}, ${currentCy})`);
  });

  // sat animation
  d3.timer((elapsed) => {
    const t = elapsed / 1000;
    const rect = mount.node().getBoundingClientRect();
    const scrollP = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
    const zoomP = Math.max(0, (scrollP - 0.65) / 0.35);
    const currentYear = yearScale(scrollP);
    const currentCy = d3.interpolateNumber(tCy, dCy)(zoomP);
    const currentR = d3.interpolateNumber(tEarthR, dEarthR)(zoomP);

    const targetCount = Math.floor(satelliteCountScale(currentYear));
    const activeSats = processedData
      .filter(d => d.launchYear <= currentYear && d.decayYear > currentYear && d.isLeo)
      .slice(0, targetCount);

    countText.text(`${activeSats.length.toLocaleString()} Satellites`).style("opacity", 1 - zoomP);
    labelText
      .style("opacity", 1 - (zoomP * 2))
      .attr("transform", `translate(0, ${-zoomP * 20})`);

    labelTextB
      .style("opacity", (zoomP - 0.5) * 2)
      .attr("transform", `translate(0, ${(1 - zoomP) * 20})`);


    const drawnSats = activeSats.slice(0, Math.max(targetCount / 40, 1));
    const circles = satLayer.selectAll("circle").data(drawnSats, d => d.id);

    circles.join(
      enter => enter.append("circle").attr("r", 1.2).attr("fill", "#ffd166").style("opacity", 0)
        .call(enter => enter.transition().duration(300).style("opacity", 0.8)),
      update => update,
      exit => exit.remove()
    )
      .attr("cx", d => width / 2 + Math.cos(d.baseAngle + t * d.drift) * (currentR + d.relativeAlt))
      .attr("cy", d => currentCy + Math.sin(d.baseAngle + t * d.drift) * (currentR + d.relativeAlt));
  });
}


function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

init();