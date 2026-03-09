import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";
import {
  CONTINENT_LABELS,
  buildCumulativeLaunchSiteCounts,
} from "./launchmap_shared.js";

const mount = d3
  .select("#leo-timeline")
  .style("position", "relative")
  .style("height", "900vh")
  .style("background", "#05070a")
  .style("margin-top", "0")
  .style("padding-top", "50vh");

const sticky = mount
  .append("div")
  .style("position", "sticky")
  .style("top", "0")
  .style("height", "100vh")
  .style("width", "100%")
  .style("margin-top", "0")
  .style("align-self", "start")
  .style("overflow", "hidden");

const width = 900;
const height = 900;
const svg = sticky
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("width", "100%")
  .style("height", "100%")
  .style("cursor", "grab");

const tEarthR = 300;
const dEarthR = 45;
const tCy = height + 50;
const dCy = height / 2;
const timelineY = 820;
const globeClipId = "leo-globe-clip";
const AUTO_ROTATION_SPEED = 2.5;
const DEFAULT_GLOBE_LAT = 12;
const DEFAULT_GLOBE_LON_OFFSET = -25;
const MANUAL_RETURN_DELAY = 2400;
const DRAG_LON_SENSITIVITY = 0.28;
const DRAG_LAT_SENSITIVITY = 0.22;
const MAX_MANUAL_LAT = 80;
const ROTATION_LERP = 0.08;
const LAUNCH_START_YEAR = 1957;
const MAX_GLOBE_SITES = 18;
const BAR_SCALE_STABILITY = 0.35;

const defs = svg.append("defs");
defs
  .append("clipPath")
  .attr("id", globeClipId)
  .append("circle")
  .attr("cx", width / 2);

defs
  .append("radialGradient")
  .attr("id", "leo-earth-glow")
  .selectAll("stop")
  .data([
    { offset: "0%", color: "rgba(186,229,255,0.18)" },
    { offset: "65%", color: "rgba(80,150,255,0.08)" },
    { offset: "100%", color: "rgba(80,150,255,0)" },
  ])
  .join("stop")
  .attr("offset", (d) => d.offset)
  .attr("stop-color", (d) => d.color);

const densityLayer = svg.append("g").style("opacity", 0);
const globalAxisLayer = svg.append("g").style("opacity", 0);
const earthLayer = svg.append("g");
const satLayer = svg.append("g");
const uiLayer = svg.append("g");
const timelineG = uiLayer.append("g").attr("class", "timeline-ui");

const earthGlow = earthLayer
  .append("circle")
  .attr("cx", width / 2)
  .attr("fill", "url(#leo-earth-glow)");

const earthCircle = earthLayer
  .append("circle")
  .attr("cx", width / 2)
  .attr("fill", "#1b4fb9")
  .attr("stroke", "#78b5ff")
  .attr("stroke-width", 2);

const globeLayer = earthLayer.append("g").attr("class", "globe-layer");
const globeMapLayer = globeLayer
  .append("g")
  .attr("clip-path", `url(#${globeClipId})`);
const globeGraticule = globeMapLayer
  .append("path")
  .attr("fill", "none")
  .attr("stroke", "rgba(180, 223, 255, 0.28)")
  .attr("stroke-width", 0.8);
const globeLand = globeMapLayer
  .append("path")
  .attr("fill", "rgba(138, 198, 255, 0.48)")
  .attr("stroke", "rgba(208, 237, 255, 0.45)")
  .attr("stroke-width", 0.8);
const globeShade = globeMapLayer
  .append("ellipse")
  .attr("cx", width / 2)
  .attr("fill", "rgba(3, 11, 25, 0.20)");
const globeHighlight = globeLayer
  .append("ellipse")
  .attr("cx", width / 2)
  .attr("fill", "rgba(255, 255, 255, 0.07)")
  .attr("pointer-events", "none");
const continentLabelLayer = globeLayer
  .append("g")
  .attr("class", "continent-labels");
const launchBarLayer = globeLayer.append("g").attr("class", "launch-bars");

const rScaleGlobal = d3
  .scalePow()
  .exponent(0.45)
  .domain([0, 40000])
  .range([dEarthR, width / 2 - 40]);

const events = [
  { year: 1957, label: "Sputnik 1" },
  { year: 1962, label: "Telstar" },
  { year: 1990, label: "Hubble" },
  { year: 1998, label: "ISS" },
  { year: 2019, label: "Starlink" },
];

const globeProjection = d3.geoOrthographic().precision(0.4).clipAngle(90);
const globePath = d3.geoPath(globeProjection);
const graticule = d3.geoGraticule10();

async function init() {
  const [rawData, launchRows, topo] = await Promise.all([
    d3.tsv("data/satcat.tsv"),
    d3.csv("data/satcat_with_continent.csv"),
    d3.json("data/land-110m.json"),
  ]);

  const land = feature(topo, topo.objects.land);

  const processedData = rawData
    .map((d, i) => {
      const alt = +d.Altitude || +d.Perigee || 0;
      const launchYear = d.Launch_Date
        ? new Date(d.Launch_Date).getUTCFullYear()
        : 1957;
      if (alt <= 0) return null;

      const rng = mulberry32(i);
      return {
        id: d.NORAD_CAT_ID || i,
        altitude: alt,
        launchYear,
        type: d.Type,
        decayYear: d.Decay_Date
          ? new Date(d.Decay_Date).getUTCFullYear()
          : 9999,
        baseAngle: rng() * 2 * Math.PI,
        drift: 0.02 + rng() * 0.05,
        relativeAlt: (alt / 2000) * 450,
        isLeo: alt <= 2000,
      };
    })
    .filter((d) => d !== null)
    .filter((d) => String(d.type ?? "").startsWith("P"));

  const startYear = 1952;
  const endYear = 2025;

  const launchSiteTimeline = buildCumulativeLaunchSiteCounts(launchRows, {
    startYear: LAUNCH_START_YEAR,
    endYear,
    excludeSites: ["UNK", "SUBL"],
  });
  const cumulativeSiteCountsByYear = launchSiteTimeline.countsByYear;
  const maxSiteCountByYear = launchSiteTimeline.maxCountByYear;
  const globalLaunchSiteMaxCount = launchSiteTimeline.maxCount;

  const satelliteCountScale = d3
    .scaleLog()
    .domain([1957, endYear])
    .range([1, processedData.length])
    .clamp(true);
  const yearScale = d3
    .scaleLinear()
    .domain([0.05, 0.65])
    .range([startYear, endYear])
    .clamp(true);
  const xTimeline = d3
    .scaleLinear()
    .domain([startYear, endYear])
    .range([100, width - 100]);

  const rotationState = {
    displayLon: DEFAULT_GLOBE_LON_OFFSET,
    displayLat: DEFAULT_GLOBE_LAT,
    manualLon: DEFAULT_GLOBE_LON_OFFSET,
    manualLat: DEFAULT_GLOBE_LAT,
    autoLonOffset: 0,
    lastAutoBaseLon: DEFAULT_GLOBE_LON_OFFSET,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    lastInteractionAt: -Infinity,
  };

  let latestSceneState = null;

  timelineG
    .append("line")
    .attr("x1", xTimeline(startYear))
    .attr("x2", xTimeline(endYear))
    .attr("y1", timelineY)
    .attr("y2", timelineY)
    .attr("stroke", "rgba(255,255,255,0.15)")
    .attr("stroke-width", 6)
    .attr("stroke-linecap", "round");

  const innovs = timelineG.selectAll(".innov").data(events).join("g");
  innovs
    .append("line")
    .attr("x1", (d) => xTimeline(d.year))
    .attr("x2", (d) => xTimeline(d.year))
    .attr("y1", timelineY - 15)
    .attr("y2", timelineY)
    .attr("stroke", "#ff9a76")
    .attr("stroke-width", 1.5);
  innovs
    .append("text")
    .attr("x", (d) => xTimeline(d.year))
    .attr("y", timelineY - 22)
    .attr("text-anchor", "middle")
    .style("fill", "#ff9a76")
    .style("font-size", "11px")
    .text((d) => d.label);

  const pinG = timelineG.append("g");
  pinG
    .append("line")
    .attr("y1", timelineY - 35)
    .attr("y2", timelineY + 5)
    .attr("stroke", "#ff4d4f")
    .attr("stroke-width", 2);
  pinG
    .append("circle")
    .attr("cy", timelineY - 38)
    .attr("r", 6)
    .attr("fill", "#ff4d4f");
  const pinText = pinG
    .append("text")
    .attr("y", timelineY - 50)
    .attr("text-anchor", "middle")
    .style("fill", "#ff4d4f")
    .style("font-weight", "bold");

  const bins = d3.bin().domain([0, 40000]).thresholds(300)(
    processedData.map((d) => d.altitude),
  );
  const colorDensity = d3
    .scaleSequential(d3.interpolateInferno)
    .domain([0, Math.log10(d3.max(bins, (b) => b.length / (b.x1 - b.x0) + 1))]);

  densityLayer
    .selectAll("path")
    .data(bins)
    .join("path")
    .attr("d", (b) =>
      d3
        .arc()
        .startAngle(0)
        .endAngle(2 * Math.PI)({
        innerRadius: rScaleGlobal(b.x0),
        outerRadius: rScaleGlobal(b.x1),
      }),
    )
    .attr("fill", (b) =>
      colorDensity(Math.log10(b.length / (b.x1 - b.x0) + 1)),
    );

  const yearText = uiLayer
    .append("text")
    .attr("x", width / 2)
    .attr("y", 120)
    .attr("text-anchor", "middle")
    .style("font-size", "100px")
    .style("font-weight", "900")
    .style("fill", "rgba(226, 238, 255, 0.68)")
    .text(startYear);

  const countText = uiLayer
    .append("text")
    .attr("x", width / 2)
    .attr("y", 160)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("fill", "#ffd166")
    .text("0 Satellites");

  const labelText = uiLayer
    .append("text")
    .attr("x", 0)
    .attr("y", 100)
    .attr("text-anchor", "middle")
    .style("font-size", "30px")
    .style("fill", "rgba(226, 238, 255, 0.68)")
    .text("Payloads in orbit 1957-2025");

  const labelTextB = uiLayer
    .append("text")
    .attr("x", 0)
    .attr("y", 100)
    .attr("text-anchor", "middle")
    .attr("opacity", 0)
    .style("font-size", "30px")
    .style("fill", "white")
    .text("Orbital Density 2026");

  const globalAxis = d3
    .axisLeft(rScaleGlobal)
    .ticks(6)
    .tickFormat((d) => (d === 0 ? "" : `${d}km`));
  globalAxisLayer.append("g").call(globalAxis).style("color", "#ff9a76");

  function readSceneState() {
    const rect = mount.node().getBoundingClientRect();
    const scrollP = Math.min(
      1,
      Math.max(0, -rect.top / (rect.height - window.innerHeight)),
    );
    const zoomP = Math.max(0, (scrollP - 0.65) / 0.35);
    const currentYear = yearScale(scrollP);
    const currentCy = d3.interpolateNumber(tCy, dCy)(zoomP);
    const currentR = d3.interpolateNumber(tEarthR, dEarthR)(zoomP);
    const globeOpacity = 1 - d3.easeCubicIn(Math.min(1, zoomP * 1.4));

    return {
      scrollP,
      zoomP,
      currentYear,
      currentCy,
      currentR,
      globeOpacity,
    };
  }

  function applySceneState(state) {
    latestSceneState = state;

    yearText
      .text(Math.floor(state.currentYear))
      .style("opacity", Math.max(0, 1 - state.zoomP * 2));
    pinG.attr(
      "transform",
      `translate(${xTimeline(Math.floor(state.currentYear))}, 0)`,
    );
    pinText.text(Math.floor(state.currentYear));
    timelineG.style("opacity", Math.max(0, 1 - state.zoomP * 1.5));

    earthGlow
      .attr("cy", state.currentCy)
      .attr("r", state.currentR * 1.12)
      .style("opacity", state.globeOpacity * 0.9);
    earthCircle.attr("cy", state.currentCy).attr("r", state.currentR);
    globeShade
      .attr("cy", state.currentCy + state.currentR * 0.12)
      .attr("rx", state.currentR * 0.88)
      .attr("ry", state.currentR * 0.92)
      .style("opacity", state.globeOpacity);
    globeHighlight
      .attr("cy", state.currentCy - state.currentR * 0.28)
      .attr("rx", state.currentR * 0.5)
      .attr("ry", state.currentR * 0.24)
      .style("opacity", state.globeOpacity * 0.9);

    defs
      .select(`#${globeClipId} circle`)
      .attr("cy", state.currentCy)
      .attr("r", state.currentR);

    satLayer.style("opacity", 1 - state.zoomP);
    globeLayer.style("opacity", state.globeOpacity);

    densityLayer
      .style("opacity", state.zoomP)
      .attr("transform", `translate(${width / 2}, ${state.currentCy})`);
    globalAxisLayer
      .style("opacity", state.zoomP > 0.4 ? (state.zoomP - 0.4) * 2 : 0)
      .attr("transform", `translate(${width / 2 - 15}, ${state.currentCy})`);
  }

  function getPointerPosition(event) {
    const bounds = svg.node().getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * width,
      y: ((event.clientY - bounds.top) / bounds.height) * height,
    };
  }

  function isPointerOnGlobe(point, state) {
    if (!state || state.globeOpacity < 0.08) return false;
    const dx = point.x - width / 2;
    const dy = point.y - state.currentCy;
    return Math.hypot(dx, dy) <= state.currentR;
  }

  function setCursor(isDragging, isHoveringGlobe) {
    svg.style(
      "cursor",
      isDragging ? "grabbing" : isHoveringGlobe ? "grab" : "default",
    );
  }

  function autoCenterLon(elapsed) {
    return wrapDegrees(
      DEFAULT_GLOBE_LON_OFFSET + (elapsed / 1000) * AUTO_ROTATION_SPEED,
    );
  }

  function updateGlobe(elapsed, state) {
    const autoBaseLon = autoCenterLon(elapsed);
    rotationState.lastAutoBaseLon = autoBaseLon;
    const autoLon = wrapDegrees(autoBaseLon + rotationState.autoLonOffset);
    const autoLat = DEFAULT_GLOBE_LAT;
    const now = performance.now();
    const returnToAuto =
      !rotationState.dragging &&
      now - rotationState.lastInteractionAt > MANUAL_RETURN_DELAY;

    if (returnToAuto) {
      rotationState.manualLon = autoLon;
      rotationState.manualLat = autoLat;
    }

    rotationState.displayLon = wrapDegrees(
      rotationState.displayLon +
        shortestAngleDelta(rotationState.displayLon, rotationState.manualLon) *
          ROTATION_LERP,
    );
    rotationState.displayLat = clamp(
      rotationState.displayLat +
        (rotationState.manualLat - rotationState.displayLat) * ROTATION_LERP,
      -MAX_MANUAL_LAT,
      MAX_MANUAL_LAT,
    );

    const rotation = [-rotationState.displayLon, -rotationState.displayLat, 0];

    globeProjection
      .translate([width / 2, state.currentCy])
      .scale(state.currentR)
      .rotate(rotation);

    globeGraticule.attr("d", globePath(graticule));
    globeLand.attr("d", globePath(land));

    const visibleContinentLabels = CONTINENT_LABELS.map((label) => {
      const angularDistance = d3.geoDistance(label.lonLat, [
        rotationState.displayLon,
        rotationState.displayLat,
      ]);
      if (angularDistance >= Math.PI / 2 - 0.08) return null;

      const projected = globeProjection(label.lonLat);
      if (!projected) return null;

      return {
        ...label,
        x: projected[0],
        y: projected[1],
        depth: Math.cos(angularDistance),
      };
    })
      .filter(Boolean)
      .sort((a, b) => d3.ascending(a.depth, b.depth));

    continentLabelLayer
      .selectAll("text.continent-label")
      .data(visibleContinentLabels, (d) => d.name)
      .join(
        (enter) => enter.append("text").attr("class", "continent-label"),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", Math.max(5, state.currentR * 0.045))
      .attr("font-weight", 500)
      .attr("letter-spacing", "0.06em")
      .attr("fill", "rgba(226, 238, 255, 0.68)")
      .attr("stroke", "rgba(16, 33, 73, 0.55)")
      .attr("stroke-width", 2)
      .attr("paint-order", "stroke")
      .style("text-transform", "uppercase")
      .text((d) => d.name);

    const resolvedYear = Math.floor(state.currentYear);
    const clampedYear = Math.min(resolvedYear, endYear);
    const activeLaunchSites =
      resolvedYear < LAUNCH_START_YEAR
        ? []
        : (cumulativeSiteCountsByYear.get(clampedYear) || []).slice(
            0,
            MAX_GLOBE_SITES,
          );
    const yearMaxCount =
      resolvedYear < LAUNCH_START_YEAR
        ? 0
        : maxSiteCountByYear.get(clampedYear) || 0;
    const stabilizedMaxCount = Math.max(
      yearMaxCount,
      globalLaunchSiteMaxCount * BAR_SCALE_STABILITY,
      1,
    );
    const yearBarLengthScale = d3
      .scaleLinear()
      .domain([0, stabilizedMaxCount])
      .range([0.18, 1])
      .clamp(true);

    const visibleBars = activeLaunchSites
      .map((d) => {
        const centerGeo = [rotationState.displayLon, rotationState.displayLat];
        const angularDistance = d3.geoDistance(d.lonLat, centerGeo);
        if (angularDistance >= Math.PI / 2 - 0.03) return null;

        const projected = globeProjection(d.lonLat);
        if (!projected) return null;

        const baseX = projected[0];
        const baseY = projected[1];
        const radialDx = baseX - width / 2;
        const radialDy = baseY - state.currentCy;
        const radialLength = Math.hypot(radialDx, radialDy) || 1;
        const ux = radialDx / radialLength;
        const uy = radialDy / radialLength;
        const barLength = yearBarLengthScale(d.count) * state.currentR * 0.34;
        const tipX = baseX + ux * barLength;
        const tipY = baseY + uy * barLength;
        const widthPx = Math.max(2.5, state.currentR * 0.018);
        const depthPx = Math.max(2, widthPx * 0.75);
        const faces = buildBarFaces(baseX, baseY, tipX, tipY, widthPx, depthPx);
        const labelOffset = Math.max(10, state.currentR * 0.028);

        return {
          ...d,
          depth: Math.cos(angularDistance),
          faces,
          baseX,
          baseY,
          tipX,
          tipY,
          labelX: tipX + ux * labelOffset,
          labelY: tipY + uy * labelOffset,
          labelFontSize: Math.max(9, Math.min(14, 9 + barLength * 0.06)),
          isNewlyActive: d.firstActiveYear === resolvedYear,
        };
      })
      .filter(Boolean)
      .sort((a, b) => d3.ascending(a.depth, b.depth));

    const bars = launchBarLayer
      .selectAll("g.globe-bar")
      .data(visibleBars, (d) => d.site)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "globe-bar");
          g.append("path").attr("class", "bar-side");
          g.append("path").attr("class", "bar-front");
          g.append("path").attr("class", "bar-cap");
          g.append("circle").attr("class", "bar-anchor");
          g.append("text").attr("class", "bar-count");
          return g;
        },
        (update) => update,
        (exit) => exit.remove(),
      )
      .style("opacity", 1);

    bars
      .select("path.bar-side")
      .attr("d", (d) => d.faces.side)
      .attr("fill", (d) =>
        d.isNewlyActive
          ? "rgba(219, 165, 44, 0.98)"
          : "rgba(191, 135, 23, 0.92)",
      )
      .attr("stroke", "rgba(146, 101, 14, 0.95)")
      .attr("stroke-width", 0.6);

    bars
      .select("path.bar-front")
      .attr("d", (d) => d.faces.front)
      .attr("fill", (d) =>
        d.isNewlyActive
          ? "rgba(255, 221, 114, 0.98)"
          : "rgba(242, 193, 76, 0.95)",
      )
      .attr("stroke", "rgba(185, 138, 18, 0.95)")
      .attr("stroke-width", 0.7);

    bars
      .select("path.bar-cap")
      .attr("d", (d) => d.faces.cap)
      .attr("fill", (d) =>
        d.isNewlyActive
          ? "rgba(255, 235, 158, 0.98)"
          : "rgba(255, 217, 120, 0.95)",
      )
      .attr("stroke", "rgba(197, 156, 51, 0.95)")
      .attr("stroke-width", 0.5);

    bars
      .select("circle.bar-anchor")
      .attr("cx", (d) => d.baseX)
      .attr("cy", (d) => d.baseY)
      .attr("r", Math.max(1.8, state.currentR * 0.01))
      .attr("fill", (d) => (d.isNewlyActive ? "#bcffb3" : "#6bff66"))
      .attr("opacity", (d) => (d.isNewlyActive ? 0.9 : 0.75));

    bars
      .select("text.bar-count")
      .attr("x", (d) => d.labelX)
      .attr("y", (d) => d.labelY)
      .attr("text-anchor", (d) => (d.labelX >= width / 2 ? "start" : "end"))
      .attr("dominant-baseline", "middle")
      .attr("font-size", (d) => `${d.labelFontSize}px`)
      .attr("font-weight", 700)
      .attr("fill", (d) => (d.isNewlyActive ? "#fff1b8" : "#ffd166"))
      .attr("stroke", "rgba(5, 7, 10, 0.72)")
      .attr("stroke-width", 1.5)
      .attr("paint-order", "stroke")
      .text((d) => d.count.toLocaleString());
  }

  svg.on("pointermove", (event) => {
    const point = getPointerPosition(event);

    if (rotationState.dragging && event.pointerId === rotationState.pointerId) {
      event.preventDefault();
      const dx = point.x - rotationState.lastX;
      const dy = point.y - rotationState.lastY;
      rotationState.manualLon = wrapDegrees(
        rotationState.manualLon - dx * DRAG_LON_SENSITIVITY,
      );
      rotationState.manualLat = clamp(
        rotationState.manualLat + dy * DRAG_LAT_SENSITIVITY,
        -MAX_MANUAL_LAT,
        MAX_MANUAL_LAT,
      );
      rotationState.lastX = point.x;
      rotationState.lastY = point.y;
      rotationState.lastInteractionAt = performance.now();
      setCursor(true, true);
      return;
    }

    setCursor(false, isPointerOnGlobe(point, latestSceneState));
  });

  svg.on("pointerdown", (event) => {
    const point = getPointerPosition(event);
    if (!isPointerOnGlobe(point, latestSceneState)) return;

    event.preventDefault();
    rotationState.dragging = true;
    rotationState.pointerId = event.pointerId;
    rotationState.lastX = point.x;
    rotationState.lastY = point.y;
    rotationState.manualLon = rotationState.displayLon;
    rotationState.manualLat = rotationState.displayLat;
    rotationState.lastInteractionAt = performance.now();
    svg.node().setPointerCapture(event.pointerId);
    setCursor(true, true);
  });

  function endDrag(event) {
    if (!rotationState.dragging || event.pointerId !== rotationState.pointerId)
      return;
    if (svg.node().hasPointerCapture(event.pointerId)) {
      svg.node().releasePointerCapture(event.pointerId);
    }
    rotationState.autoLonOffset = wrapDegrees(
      rotationState.displayLon - rotationState.lastAutoBaseLon,
    );
    rotationState.dragging = false;
    rotationState.pointerId = null;
    rotationState.lastInteractionAt = performance.now();
    const point = getPointerPosition(event);
    setCursor(false, isPointerOnGlobe(point, latestSceneState));
  }

  svg.on("pointerup", endDrag);
  svg.on("pointercancel", endDrag);
  svg.on("pointerleave", () => {
    if (rotationState.dragging) return;
    setCursor(false, false);
  });

  window.addEventListener("scroll", () => {
    applySceneState(readSceneState());
  });

  applySceneState(readSceneState());

  d3.timer((elapsed) => {
    const t = elapsed / 1000;
    const state = readSceneState();
    applySceneState(state);

    const targetCount = Math.floor(satelliteCountScale(state.currentYear));
    const activeSats = processedData
      .filter(
        (d) =>
          d.launchYear <= state.currentYear &&
          d.decayYear > state.currentYear &&
          d.isLeo,
      )
      .slice(0, targetCount);

    countText
      .text(`${activeSats.length.toLocaleString()} Satellites`)
      .style("opacity", 1 - state.zoomP);
    labelText
      .style("opacity", Math.max(0, 1 - state.zoomP * 2))
      .attr("transform", `translate(0, ${-state.zoomP * 20})`);

    labelTextB
      .style("opacity", Math.max(0, (state.zoomP - 0.5) * 2))
      .attr("transform", `translate(0, ${(1 - state.zoomP) * 20})`);

    updateGlobe(elapsed, state);

    const drawnSats = activeSats.slice(0, Math.max(targetCount / 40, 1));
    const circles = satLayer.selectAll("circle").data(drawnSats, (d) => d.id);

    circles
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("r", 1.2)
            .attr("fill", "#ffd166")
            .style("opacity", 0)
            .call((enter) =>
              enter.transition().duration(300).style("opacity", 0.8),
            ),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr(
        "cx",
        (d) =>
          width / 2 +
          Math.cos(d.baseAngle + t * d.drift) *
            (state.currentR + d.relativeAlt),
      )
      .attr(
        "cy",
        (d) =>
          state.currentCy +
          Math.sin(d.baseAngle + t * d.drift) *
            (state.currentR + d.relativeAlt),
      );
  });
}

function buildBarFaces(baseX, baseY, tipX, tipY, widthPx, depthPx) {
  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy * widthPx;
  const py = ux * widthPx;
  const offsetX = ux * depthPx + px * 0.35;
  const offsetY = uy * depthPx + py * 0.35;

  const A = [baseX - px, baseY - py];
  const B = [baseX + px, baseY + py];
  const C = [tipX + px, tipY + py];
  const D = [tipX - px, tipY - py];
  const B2 = [B[0] + offsetX, B[1] + offsetY];
  const C2 = [C[0] + offsetX, C[1] + offsetY];
  const D2 = [D[0] + offsetX, D[1] + offsetY];

  return {
    front: polygonPath([A, B, C, D]),
    side: polygonPath([B, B2, C2, C]),
    cap: polygonPath([D, C, C2, D2]),
  };
}

function polygonPath(points) {
  return `M ${points.map((p) => `${p[0]},${p[1]}`).join(" L ")} Z`;
}

function wrapDegrees(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function shortestAngleDelta(from, to) {
  return wrapDegrees(to - from);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

init();
