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
  .style("background", "black")
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

const tooltip = sticky
  .append("div")
  .attr("class", "vis-tooltip")
  .style("position", "absolute")
  .style("left", "0")
  .style("top", "0")
  .style("transform", "translate(-9999px, -9999px)")
  .style("pointer-events", "none")
  .style("z-index", "20")
  .style("min-width", "160px")
  .style("padding", "10px 12px")
  .style("border", "1px solid rgba(255, 209, 102, 0.35)")
  .style("border-radius", "10px")
  .style("background", "rgba(4, 10, 22, 0.95)")
  .style("color", "#f8fbff")
  .style("font-family", "system-ui, sans-serif")
  .style("font-size", "12px")
  .style("opacity", "0")
  .style("transition", "opacity 0.2s");

const rankingToggle = sticky
  .append("button")
  .attr("type", "button")
  .style("position", "absolute")
  .style("top", "20px")
  .style("left", "20px")
  .style("z-index", "6")
  .style("padding", "8px 14px")
  .style("border", "1px solid rgba(255, 209, 102, 0.24)")
  .style("border-radius", "999px")
  .style("background", "rgba(9, 16, 32, 0.82)")
  .style("color", "#f8fbff")
  .style("font-size", "12px")
  .style("font-weight", "600")
  .style("letter-spacing", "0.02em")
  .style("cursor", "pointer")
  .style("backdrop-filter", "blur(8px)");

const centerGlobeToggle = sticky
  .append("button")
  .attr("type", "button")
  .style("position", "absolute")
  .style("top", "58px")
  .style("left", "20px")
  .style("z-index", "6")
  .style("padding", "8px 14px")
  .style("border", "1px solid rgba(180, 223, 255, 0.2)")
  .style("border-radius", "999px")
  .style("background", "rgba(9, 16, 32, 0.82)")
  .style("color", "#f8fbff")
  .style("font-size", "12px")
  .style("font-weight", "600")
  .style("letter-spacing", "0.02em")
  .style("cursor", "pointer")
  .style("backdrop-filter", "blur(8px)");

const hoverHintOverlay = sticky
  .append("div")
  .attr("class", "launch-site-helper-note")
  .style("position", "absolute")
  .style("left", "20px")
  .style("bottom", "24px")
  .style("z-index", "4")
  .style("pointer-events", "none")
  .style("color", "rgba(226, 238, 255, 0.56)")
  .style("font-family", "system-ui, sans-serif")
  .style("font-size", "12px")
  .style("letter-spacing", "0.03em")
  .style("line-height", "7")
  .style("text-align", "left")
  .style("opacity", "0")
  .text("Hover over a bar to see launch site details");

const width = 900;
const height = 900;
const DEFAULT_GLOBE_CX = width / 2;
const CONTROLS_LEFT = 20;
const CONTROLS_TOP = 20;
const TOGGLE_STACK_GAP = 8;
const TOGGLE_HEIGHT = 30;
const RANKING_PANEL_GAP = 14;
const CONTROL_BLOCK_WIDTH = 172;
const HEADER_TITLE_X = CONTROLS_LEFT + CONTROL_BLOCK_WIDTH + 18;
const HEADER_TITLE_Y = CONTROLS_TOP + 6;
const HEADER_YEAR_Y = 124;
const HEADER_COUNT_Y = 166;
const HELPER_OVERLAY_BOTTOM = 24;
const CENTERED_SCENE_TOP = 214;
const CENTERED_SCENE_BOTTOM = 784;
const RANKING_PANEL_X = CONTROLS_LEFT;
const RANKING_PANEL_Y =
  CONTROLS_TOP + TOGGLE_HEIGHT * 2 + TOGGLE_STACK_GAP + RANKING_PANEL_GAP;
const RANKING_PANEL_WIDTH = 288;
const RANKING_PANEL_HEIGHT = 308;
const RANKING_PANEL_HEADER_HEIGHT = 58;
const RANKING_PANEL_LABEL_WIDTH = 58;
const RANKING_PANEL_BAR_WIDTH = 150;
const RANKING_PANEL_VALUE_X = 220;
const RANKING_ROW_HEIGHT = 24;
const RANKING_BAR_HEIGHT = 12;
const CONTENT_PADDING_X = 36;

const titleOverlay = sticky
  .append("div")
  .attr("class", "payload-title-overlay")
  .style("position", "absolute")
  .style("left", HEADER_TITLE_X + "px")
  .style("top", HEADER_TITLE_Y + "px")
  .style("z-index", "4")
  .style("pointer-events", "none")
  .style("color", "rgba(226, 238, 255, 0.74)")
  .style("font-family", "system-ui, sans-serif")
  .style("font-size", "24px")
  .style("font-weight", "700")
  .style("letter-spacing", "0.01em")
  .style("line-height", "1.1")
  .style("white-space", "nowrap")
  .style("opacity", "0")
  .style("transform", "translate(0, 0)")
  .text("Payloads in orbit 1957-2025");

const svg = sticky
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("width", "100%")
  .style("height", "100%")
  .style("cursor", "grab");

const tEarthR = 300;
const dEarthR = 34;
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
const BAR_HEIGHT_MAX_RATIO = 0.3;
const BAR_MIN_VISIBLE_COUNT = 12;
const BAR_LABEL_MIN_COUNT = 100;
const GLOBE_PHASE_END = 0.45;
const DENSITY_PHASE_START = 0.75;
const DISPLAY_SCROLL_EASING = 0.14;
const DENSITY_RING_COUNT = 350;
const DENSITY_OUTER_RADIUS = 372;
const POPUP_WINDOW_P = 0.15;

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
const satLayer = svg.append("g").style("pointer-events", "all");
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

const rankingCard = sticky
  .append("div")
  .attr("class", "ranking-panel-card")
  .style("position", "absolute")
  .style("left", RANKING_PANEL_X + "px")
  .style("top", RANKING_PANEL_Y + "px")
  .style("width", RANKING_PANEL_WIDTH + "px")
  .style("height", RANKING_PANEL_HEIGHT + "px")
  .style("pointer-events", "none")
  .style("opacity", "0")
  .style("z-index", "4");

const rankingSvg = rankingCard
  .append("svg")
  .attr("viewBox", `0 0 ${RANKING_PANEL_WIDTH} ${RANKING_PANEL_HEIGHT}`)
  .style("width", "100%")
  .style("height", "100%")
  .style("display", "block");

const rankingLayer = rankingSvg.append("g").attr("class", "ranking-panel");

const rScaleGlobal = d3
  .scalePow()
  .exponent(0.45)
  .domain([0, 40000])
  .range([dEarthR, DENSITY_OUTER_RADIUS]);

const events = [
  {
    year: 1957,
    targetP: 0.1,
    label: "Sputnik 1",
    annotation:
      "Oct 4, 1957: The Soviet Union launched Sputnik 1, the world's first artificial satellite. The 58 cm aluminum sphere orbited Earth every 96 minutes, transmitting a radio beep heard worldwide — marking the dawn of the Space Age.",
  },
  {
    year: 1962,
    targetP: 0.22,
    label: "Telstar",
    annotation:
      "Jul 10, 1962: AT&T's Telstar 1 became the first active communications satellite, relaying the first live transatlantic TV pictures and telephone calls — transforming global communications and inspiring a worldwide hit song.",
  },
  {
    year: 1990,
    targetP: 0.35,
    label: "Hubble",
    annotation:
      "Apr 24, 1990: Deployed by Space Shuttle Discovery, the Hubble Space Telescope revolutionized astronomy. After a 1993 corrective servicing mission it captured imagery spanning billions of light-years, reshaping our understanding of the universe.",
  },
  {
    year: 1998,
    targetP: 0.48,
    label: "ISS",
    annotation:
      "Nov 20, 1998: Russia launched Zarya, the first ISS module. A joint project of 15 nations, the International Space Station has been continuously inhabited since Nov 2000 — the largest human-made structure ever placed in orbit.",
  },
  {
    targetP: 0.55,
    annotation:
      "Over time, satellites are retiring less often. Longer lifespans and delayed disposal mean objects linger in LEO, keeping the region crowded.",
  },
  {
    year: 2019,
    targetP: 0.66,
    label: "Starlink",
    annotation:
      "May 23, 2019: SpaceX launched its first 60 Starlink satellites, beginning the largest constellation in history. By 2025, over 6,000 Starlink satellites orbit Earth, providing global broadband and dramatically reshaping the orbital environment.",
  },
  {
    targetP: 1,
    annotation:
      "85–90% of cataloged objects are in Low Earth Orbit (LEO). This is where critical infrastructure lives: the ISS, Starlink, Earth imaging, and science missions. High utilization means higher collision risk, and unlike GEO, there is no strong incentive to move objects to graveyard orbits.",
  },
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
  let targetScrollP = readScrollProgress();
  let displayScrollP = targetScrollP;
  let lastFrameAt = performance.now();
  let lastVisibleSatelliteYear = null;
  let lastVisibleSatellites = [];
  let hoveredLaunchSiteCode = null;
  let isRankingPanelVisible = true;
  let isGlobeCentered = true;
  let lastRankingPanelKey = null;

  function getLayoutMetrics(state = latestSceneState) {
    const sceneLeft = CONTENT_PADDING_X;
    const sceneRight = width - CONTENT_PADDING_X;
    const sceneWidth = Math.max(280, sceneRight - sceneLeft);
    const sceneCenterX = width / 2;
    const centeredGlobeY = (CENTERED_SCENE_TOP + CENTERED_SCENE_BOTTOM) / 2;
    const storytellingGlobeY = state?.currentCy ?? tCy;

    return {
      sceneLeft,
      sceneRight,
      sceneWidth,
      headerLeft: 180,
      headerCenterX: sceneCenterX,
      globeCenterX: width / 2,
      globeCenterY: isGlobeCentered ? centeredGlobeY : storytellingGlobeY,
    };
  }

  function getGlobeCenterX() {
    return getLayoutMetrics().globeCenterX;
  }

  function setRankingToggleLabel() {
    rankingToggle.text(
      isRankingPanelVisible ? "Top 10 Ranking: On" : "Top 10 Ranking: Off",
    );
  }

  function setCenterGlobeToggleLabel() {
    centerGlobeToggle.text(
      isGlobeCentered ? "Center Globe: On" : "Center Globe: Off",
    );
  }

  function hideTooltip() {
    tooltip
      .style("opacity", "0")
      .style("transform", "translate(-9999px, -9999px)");
  }

  function buildLaunchSiteTooltipHtml(site, count = null) {
    const countMarkup =
      count === null
        ? ""
        : `<div style="margin-top:6px; color:rgba(255, 240, 194, 0.88);">${count.toLocaleString()} cumulative launches</div>`;

    return (
      `<div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#ffd166; margin-bottom:4px;">${site.siteCode}</div>` +
      `<div style="font-size:14px; font-weight:700; color:#ffffff; margin-bottom:4px;">${site.siteName}</div>` +
      `<div style="color:rgba(226, 238, 255, 0.82);">${site.country}</div>` +
      countMarkup
    );
  }

  function showTooltipAtSvg(svgX, svgY, html, isRightSide = true) {
    const bounds = svg.node().getBoundingClientRect();
    const scaleX = bounds.width / width;
    const scaleY = bounds.height / height;
    const screenX = svgX * scaleX + (isRightSide ? 18 : -18);
    const screenY = svgY * scaleY - 10;

    tooltip
      .style("opacity", "1")
      .style("transform", `translate(${screenX}px, ${screenY}px)`)
      .style("transform-origin", isRightSide ? "top left" : "top right")
      .html(html);
  }

  function showTooltipAtClient(clientX, clientY, html, isRightSide = true) {
    const bounds = sticky.node().getBoundingClientRect();
    const screenX = clientX - bounds.left + (isRightSide ? 18 : -18);
    const screenY = clientY - bounds.top - 10;

    tooltip
      .style("opacity", "1")
      .style("transform", `translate(${screenX}px, ${screenY}px)`)
      .style("transform-origin", isRightSide ? "top left" : "top right")
      .html(html);
  }

  function renderLaunchTooltip(site) {
    if (!site) {
      hideTooltip();
      return;
    }

    showTooltipAtSvg(
      site.tipX,
      site.tipY,
      buildLaunchSiteTooltipHtml(site, site.count ?? null),
      site.labelX >= getGlobeCenterX(),
    );
  }

  function buildTopLaunchSiteRanking(resolvedYear) {
    if (resolvedYear < LAUNCH_START_YEAR) return [];

    const clampedYear = Math.min(resolvedYear, endYear);
    return (cumulativeSiteCountsByYear.get(clampedYear) || [])
      .slice(0, 10)
      .slice()
      .reverse();
  }

  function updateRankingPanel(state, resolvedYear) {
    const panelOpacity = isRankingPanelVisible
      ? Math.max(0, Math.min(state.timelineOpacity * 0.96, state.barsOpacity))
      : 0;

    rankingCard
      .style("opacity", String(panelOpacity))
      .style("pointer-events", isRankingPanelVisible ? "auto" : "none");
    if (!isRankingPanelVisible) return;

    const rankingKey = `${resolvedYear}:${isRankingPanelVisible}`;
    if (rankingKey === lastRankingPanelKey) return;
    lastRankingPanelKey = rankingKey;

    const rankedSites = buildTopLaunchSiteRanking(resolvedYear);
    const rowHeight = RANKING_ROW_HEIGHT;
    const xBar = d3
      .scaleLinear()
      .domain([0, Math.max(1, globalLaunchSiteMaxCount)])
      .range([0, RANKING_PANEL_BAR_WIDTH])
      .clamp(true);

    rankingTitle.text("Top 10 Launch Stations");
    rankingSubtitle.text(
      resolvedYear < LAUNCH_START_YEAR
        ? "No launch data yet"
        : `Cumulative launches through ${Math.min(resolvedYear, endYear)}`,
    );

    const rows = rankingRowsLayer
      .selectAll("g.rank-row")
      .data(rankedSites, (d) => d.site);

    const rowsEnter = rows.enter().append("g").attr("class", "rank-row");
    rowsEnter.append("rect").attr("class", "rank-hover-bg");
    rowsEnter.append("rect").attr("class", "rank-hit");
    rowsEnter.append("text").attr("class", "rank-label");
    rowsEnter.append("rect").attr("class", "rank-bar");
    rowsEnter.append("text").attr("class", "rank-value");

    const rowsMerged = rowsEnter.merge(rows);

    rowsMerged
      .attr("transform", (_, i) => `translate(0, ${i * rowHeight})`)
      .style("cursor", "pointer")
      .on("mousemove", function (event, d) {
        d3.select(this)
          .select("rect.rank-hover-bg")
          .attr("fill", "rgba(255, 209, 102, 0.08)");
        d3.select(this)
          .select("rect.rank-bar")
          .attr("fill", "rgba(255, 221, 114, 0.98)");
        showTooltipAtClient(
          event.clientX,
          event.clientY,
          buildLaunchSiteTooltipHtml(d, d.count),
          true,
        );
      })
      .on("mouseleave", function () {
        d3.select(this)
          .select("rect.rank-hover-bg")
          .attr("fill", "rgba(255, 209, 102, 0)");
        d3.select(this)
          .select("rect.rank-bar")
          .attr("fill", "rgba(242, 193, 76, 0.92)");
        hideTooltip();
      });

    rowsMerged
      .select("rect.rank-hover-bg")
      .attr("x", -6)
      .attr("y", -2)
      .attr("rx", 8)
      .attr("width", RANKING_PANEL_WIDTH - 26)
      .attr("height", rowHeight - 4)
      .attr("fill", "rgba(255, 209, 102, 0)");

    rowsMerged
      .select("rect.rank-hit")
      .attr("x", -6)
      .attr("y", -2)
      .attr("width", RANKING_PANEL_WIDTH - 26)
      .attr("height", rowHeight - 4)
      .attr("fill", "transparent");

    rowsMerged
      .select("text.rank-label")
      .attr("x", 0)
      .attr("y", rowHeight / 2)
      .attr("dominant-baseline", "middle")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .style("letter-spacing", "0.04em")
      .style("fill", "rgba(226, 238, 255, 0.88)")
      .text((d) => d.siteCode || d.site);

    rowsMerged
      .select("rect.rank-bar")
      .attr("x", RANKING_PANEL_LABEL_WIDTH)
      .attr("y", (rowHeight - RANKING_BAR_HEIGHT) / 2)
      .attr("rx", 6)
      .attr("height", RANKING_BAR_HEIGHT)
      .attr("width", (d) => xBar(d.count))
      .attr("fill", "rgba(242, 193, 76, 0.92)")
      .attr("stroke", "rgba(255, 221, 114, 0.85)")
      .attr("stroke-width", 0.6);

    rowsMerged
      .select("text.rank-value")
      .attr("x", RANKING_PANEL_VALUE_X)
      .attr("y", rowHeight / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("fill", "rgba(255, 240, 194, 0.88)")
      .text((d) => d.count.toLocaleString());

    rows.exit().remove();
  }

  setRankingToggleLabel();
  rankingToggle.on("click", () => {
    isRankingPanelVisible = !isRankingPanelVisible;
    lastRankingPanelKey = null;
    setRankingToggleLabel();
    if (latestSceneState) {
      applySceneState(latestSceneState);
      updateRankingPanel(
        latestSceneState,
        Math.floor(latestSceneState.currentYear),
      );
    }
  });

  setCenterGlobeToggleLabel();
  centerGlobeToggle.on("click", () => {
    isGlobeCentered = !isGlobeCentered;
    setCenterGlobeToggleLabel();
    if (latestSceneState) {
      applySceneState(latestSceneState);
    }
  });

  timelineG
    .append("line")
    .attr("x1", xTimeline(startYear))
    .attr("x2", xTimeline(endYear))
    .attr("y1", timelineY)
    .attr("y2", timelineY)
    .attr("stroke", "rgba(255,255,255,0.15)")
    .attr("stroke-width", 6)
    .attr("stroke-linecap", "round");

  const timelineEvents = events.filter((d) => d.year !== undefined);

  const innovs = timelineG
    .selectAll(".innov")
    .data(timelineEvents)
    .join("g")
    .attr("class", "innov");

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

  const densityBins = d3
    .bin()
    .domain([0, 40000])
    .thresholds(DENSITY_RING_COUNT)(processedData.map((d) => d.altitude))
    .filter((b) => b.length > 0);

  const densityArc = d3
    .arc()
    .startAngle(0)
    .endAngle(2 * Math.PI);

  const maxDensityLog = Math.log10(
    d3.max(densityBins, (b) => b.length / (b.x1 - b.x0)) + 1,
  );

  const colorDensity = d3
    .scaleSequential(d3.interpolateInferno)
    .domain([0, maxDensityLog]);

  densityLayer
    .selectAll("path")
    .data(densityBins)
    .join("path")
    .attr("d", (b) =>
      densityArc({
        innerRadius: rScaleGlobal(b.x0),
        outerRadius: rScaleGlobal(b.x1),
      }),
    )
    .attr("fill", (b) =>
      colorDensity(Math.log10(b.length / (b.x1 - b.x0) + 1)),
    );

  const yearText = uiLayer
    .append("text")
    .attr("x", HEADER_TITLE_X)
    .attr("y", 120)
    .attr("text-anchor", "middle")
    .style("font-size", "100px")
    .style("font-weight", "900")
    .style("fill", "rgba(226, 238, 255, 0.68)")
    .text(startYear);

  const countText = uiLayer
    .append("text")
    .attr("x", HEADER_TITLE_X)
    .attr("y", 160)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("fill", "#ffd166")
    .text("0 Satellites");

  const densityTitleOverlay = sticky
    .append("div")
    .attr("class", "density-title-overlay")
    .style("position", "absolute")
    .style("left", HEADER_TITLE_X + "px")
    .style("top", HEADER_TITLE_Y + 100 + "px")
    .style("z-index", "4")
    .style("pointer-events", "none")
    .style("color", "rgba(226, 238, 255, 0.74)")
    .style("font-family", "system-ui, sans-serif")
    .style("font-size", "24px")
    .style("font-weight", "700")
    .style("letter-spacing", "0.01em")
    .style("line-height", "1.1")
    .style("white-space", "nowrap")
    .style("opacity", "0")
    .style("transform", "translate(-50%, 20px)")
    .text("Orbital Density 2026");

  rankingLayer
    .append("rect")
    .attr("width", RANKING_PANEL_WIDTH)
    .attr("height", RANKING_PANEL_HEIGHT)
    .attr("rx", 18)
    .attr("fill", "rgba(6, 12, 24, 0.74)")
    .attr("stroke", "rgba(255, 209, 102, 0.18)")
    .attr("stroke-width", 1);

  const rankingTitle = rankingLayer
    .append("text")
    .attr("x", 16)
    .attr("y", 24)
    .style("font-size", "16px")
    .style("font-weight", "700")
    .style("fill", "rgba(248, 251, 255, 0.96)")
    .text("Top 10 Launch Stations");

  const rankingSubtitle = rankingLayer
    .append("text")
    .attr("x", 16)
    .attr("y", 43)
    .style("font-size", "11px")
    .style("fill", "rgba(226, 238, 255, 0.66)");

  rankingLayer
    .append("line")
    .attr("x1", 16)
    .attr("x2", RANKING_PANEL_WIDTH - 16)
    .attr("y1", RANKING_PANEL_HEADER_HEIGHT)
    .attr("y2", RANKING_PANEL_HEADER_HEIGHT)
    .attr("stroke", "rgba(255, 255, 255, 0.08)")
    .attr("stroke-width", 1);

  const rankingRowsLayer = rankingLayer
    .append("g")
    .attr("transform", `translate(16, ${RANKING_PANEL_HEADER_HEIGHT + 12})`);

  const legendG = uiLayer
    .append("g")
    .attr("class", "density-legend")
    .attr("transform", `translate(${width - 220}, ${height - 180})`)
    .style("opacity", 0);

  const legendGradientId = "density-gradient";
  const legendGradient = defs
    .append("linearGradient")
    .attr("id", legendGradientId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  const legendSteps = 10;
  legendGradient
    .selectAll("stop")
    .data(d3.range(legendSteps))
    .join("stop")
    .attr("offset", (d) => `${(d / (legendSteps - 1)) * 100}%`)
    .attr("stop-color", (d) => d3.interpolateInferno(d / (legendSteps - 1)));

  legendG
    .append("rect")
    .attr("width", 180)
    .attr("height", 12)
    .attr("rx", 4)
    .attr("fill", `url(#${legendGradientId})`);

  legendG
    .append("text")
    .attr("y", -10)
    .style("fill", "rgba(226, 238, 255, 0.8)")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Orbital Density (Objects / km)");

  const tickValues = [1, 10, 100];

  legendG
    .selectAll(".legend-tick")
    .data(tickValues)
    .join("g")
    .attr("class", "legend-tick")
    .attr("transform", (d) => {
      const logVal = Math.log10(d + 1);
      const xPos = (logVal / maxDensityLog) * 180;
      return `translate(${xPos}, 0)`;
    })
    .call((g) => {
      g.append("line")
        .attr("y1", 0)
        .attr("y2", 16)
        .attr("stroke", "rgba(255, 255, 255, 0.3)");

      g.append("text")
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .style("fill", "rgba(226, 238, 255, 0.7)")
        .style("font-size", "10px")
        .style("font-family", "monospace")
        .text((d) => d);
    });

  const globalAxis = d3
    .axisLeft(rScaleGlobal)
    .ticks(6)
    .tickFormat((d) => (d === 0 ? "" : `${d}km`));

  globalAxisLayer.append("g").call(globalAxis).style("color", "#ff9a76");

  const popupDiv = sticky.append("div").attr("class", "leo-popup");
  const popupTitle = popupDiv.append("div").attr("class", "leo-popup__title");
  const popupBody = popupDiv.append("div").attr("class", "leo-popup__body");

  function readScrollProgress() {
    const rect = mount.node().getBoundingClientRect();
    return Math.min(
      1,
      Math.max(0, -rect.top / (rect.height - window.innerHeight)),
    );
  }

  function updateTooltip(data, event) {
    if (!data) {
      hideTooltip();
      return;
    }

    const [mX, mY] = d3.pointer(event, sticky.node());
    const isRightSide = mX >= width / 2;
    const x = mX + (isRightSide ? -180 : 20);
    const y = mY - 40;

    let htmlContent = "";

    if (data.siteCode) {
      htmlContent = `
      <div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#ffd166; margin-bottom:4px;">${data.siteCode}</div>
      <div style="font-size:14px; font-weight:700; color:#ffffff; margin-bottom:4px;">${data.siteName}</div>
      <div style="color:rgba(226, 238, 255, 0.82);">${data.country}</div>
      <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.1); color:#6bff66;">
        Total Launches: ${data.count.toLocaleString()}
      </div>
    `;
    } else {
      htmlContent = `
      <div style="font-size:11px; color:#ffd166; margin-bottom:4px;">NORAD ID: ${data.id}</div>
      <div style="font-size:14px; font-weight:700; color:#ffffff; margin-bottom:4px;">Payload</div>
      <div style="color:rgba(226, 238, 255, 0.82);">Alt: ${Math.round(data.altitude)} km</div>
      <div style="color:rgba(226, 238, 255, 0.82);">Launched: ${data.launchYear}</div>
    `;
    }

    tooltip
      .style("opacity", "1")
      .style("transform", `translate(${x}px, ${y}px)`)
      .html(htmlContent);
  }

  function buildSceneState(scrollP) {
    const zoomP = Math.max(0, (scrollP - 0.65) / 0.35);
    const currentYear = yearScale(scrollP);
    const globeShrinkP = d3.easeCubicOut(zoomP);
    const currentCy = d3.interpolateNumber(tCy, dCy)(globeShrinkP);
    const currentR = d3.interpolateNumber(tEarthR, dEarthR)(globeShrinkP);
    const phase = getTransitionPhase(zoomP);
    const handoffP = clamp(
      (zoomP - GLOBE_PHASE_END) / (DENSITY_PHASE_START - GLOBE_PHASE_END),
      0,
      1,
    );

    const globeOpacity =
      phase === "globe"
        ? 1
        : phase === "handoff"
          ? 1 - d3.easeCubicInOut(Math.min(1, handoffP * 1.05))
          : 0;

    const barsOpacity =
      phase === "globe"
        ? 1
        : 1 - d3.easeCubicIn(clamp((zoomP - GLOBE_PHASE_END) / 0.18, 0, 1));

    const satelliteOpacity =
      phase === "globe"
        ? 1
        : 1 - d3.easeCubicIn(clamp((zoomP - 0.5) / 0.26, 0, 1));

    const timelineOpacity = 1 - d3.easeCubicIn(clamp(zoomP / 0.58, 0, 1));
    const densityOpacity = d3.easeCubicOut(clamp((zoomP - 0.44) / 0.3, 0, 1));
    const radialAxisOpacity = d3.easeCubicOut(
      clamp((zoomP - 0.58) / 0.18, 0, 1),
    );
    const densityTitleOpacity = d3.easeCubicOut(
      clamp((zoomP - 0.54) / 0.2, 0, 1),
    );
    const orbitTitleOpacity = 1 - d3.easeCubicIn(clamp(zoomP / 0.42, 0, 1));

    const satelliteDrawRatio =
      phase === "globe"
        ? 0.028
        : phase === "handoff"
          ? d3.interpolateNumber(0.018, 0.006)(handoffP)
          : 0.004;

    return {
      scrollP,
      zoomP,
      phase,
      handoffP,
      currentYear,
      currentCy,
      currentR,
      globeOpacity,
      barsOpacity,
      satelliteOpacity,
      timelineOpacity,
      densityOpacity,
      radialAxisOpacity,
      densityTitleOpacity,
      orbitTitleOpacity,
      satelliteDrawRatio,
    };
  }

  function applySceneState(state) {
    latestSceneState = state;
    const layout = getLayoutMetrics(state);
    const globeCenterX = layout.globeCenterX;
    const globeCenterY = layout.globeCenterY;

    const sceneOpacity = Math.min(
      state.timelineOpacity * 0.92,
      state.barsOpacity,
    );

    const controlsOpacity =
      1 - d3.easeCubicIn(clamp((state.zoomP - 0.6) / 0.2, 0, 1));

    yearText
      .attr("x", layout.headerCenterX)
      .attr("y", HEADER_YEAR_Y)
      .text(Math.floor(state.currentYear))
      .style("opacity", Math.max(0, state.timelineOpacity * 1.05));

    countText
      .attr("x", layout.headerCenterX)
      .attr("y", HEADER_COUNT_Y)
      .style("opacity", state.timelineOpacity);

    titleOverlay
      .style("opacity", String(state.orbitTitleOpacity))
      .style("transform", `translate(0, ${-state.handoffP * 28}px)`);

    densityTitleOverlay
      .style("left", `${layout.headerCenterX + 50}px`)
      .style("top", `${HEADER_TITLE_Y}px`)
      .style("opacity", String(state.densityTitleOpacity));

    hoverHintOverlay.style("opacity", String(Math.max(0, sceneOpacity * 0.82)));

    rankingToggle
      .style("opacity", String(controlsOpacity))
      .style("pointer-events", controlsOpacity < 0.05 ? "none" : "auto");

    centerGlobeToggle
      .style("opacity", String(controlsOpacity))
      .style("pointer-events", controlsOpacity < 0.05 ? "none" : "auto");

    pinG.attr(
      "transform",
      `translate(${xTimeline(Math.floor(state.currentYear))}, 0)`,
    );
    pinText.text(Math.floor(state.currentYear));
    timelineG.style("opacity", state.timelineOpacity);

    earthGlow
      .attr("cx", globeCenterX)
      .attr("cy", globeCenterY)
      .attr("r", state.currentR * 1.12)
      .style(
        "opacity",
        Math.max(state.globeOpacity * 0.72, state.densityOpacity * 0.22),
      );

    earthCircle
      .attr("cx", globeCenterX)
      .attr("cy", globeCenterY)
      .attr("r", state.currentR);

    globeShade
      .attr("cx", globeCenterX)
      .attr("cy", globeCenterY + state.currentR * 0.12)
      .attr("rx", state.currentR * 0.88)
      .attr("ry", state.currentR * 0.92)
      .style("opacity", state.globeOpacity);

    globeHighlight
      .attr("cx", globeCenterX)
      .attr("cy", globeCenterY - state.currentR * 0.28)
      .attr("rx", state.currentR * 0.5)
      .attr("ry", state.currentR * 0.24)
      .style("opacity", state.globeOpacity * 0.9);

    defs
      .select(`#${globeClipId} circle`)
      .attr("cx", globeCenterX)
      .attr("cy", globeCenterY)
      .attr("r", state.currentR);

    satLayer.style("opacity", state.satelliteOpacity);
    globeLayer.style("opacity", state.globeOpacity);
    launchBarLayer.style("opacity", state.barsOpacity);
    legendG.style("opacity", state.densityOpacity);

    if (state.barsOpacity < 0.08) {
      hoveredLaunchSiteCode = null;
      hideTooltip();
    }

    densityLayer
      .style("opacity", state.densityOpacity)
      .attr("transform", `translate(${globeCenterX}, ${globeCenterY})`);

    globalAxisLayer
      .style("opacity", state.radialAxisOpacity)
      .attr("transform", `translate(${globeCenterX - 15}, ${globeCenterY})`);
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
    const layout = getLayoutMetrics(state);
    const dx = point.x - layout.globeCenterX;
    const dy = point.y - layout.globeCenterY;
    return Math.hypot(dx, dy) <= state.currentR;
  }

  function setCursor(isDragging, isHoveringGlobe) {
    svg.style(
      "cursor",
      isDragging
        ? "grabbing"
        : hoveredLaunchSiteCode
          ? "pointer"
          : isHoveringGlobe
            ? "grab"
            : "default",
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

    const layout = getLayoutMetrics(state);
    const globeCenter = [layout.globeCenterX, layout.globeCenterY];
    const visibleCenterGeo = [
      rotationState.displayLon,
      rotationState.displayLat,
    ];
    const rotation = [-rotationState.displayLon, -rotationState.displayLat, 0];

    globeProjection
      .clipAngle(90)
      .translate(globeCenter)
      .scale(state.currentR)
      .rotate(rotation);

    globeGraticule.attr("d", globePath(graticule));
    globeLand.attr("d", globePath(land));

    const visibleContinentLabels = CONTINENT_LABELS.map((label) => {
      const angularDistance = d3.geoDistance(label.lonLat, visibleCenterGeo);
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

    const maxBarHeight = state.currentR * BAR_HEIGHT_MAX_RATIO;
    const barHeightScale = d3
      .scaleSqrt()
      .domain([
        BAR_MIN_VISIBLE_COUNT,
        Math.max(BAR_MIN_VISIBLE_COUNT + 1, globalLaunchSiteMaxCount),
      ])
      .range([0, maxBarHeight])
      .clamp(true);

    const visibleBars = activeLaunchSites
      .map((d) => {
        const angularDistance = d3.geoDistance(d.lonLat, visibleCenterGeo);
        if (angularDistance >= Math.PI / 2 - 0.03) return null;

        const projected = globeProjection(d.lonLat);
        if (!projected) return null;

        const baseX = projected[0];
        const baseY = projected[1];
        const radialDx = baseX - globeCenter[0];
        const radialDy = baseY - globeCenter[1];
        const radialLength = Math.hypot(radialDx, radialDy) || 1;
        const ux = radialDx / radialLength;
        const uy = radialDy / radialLength;
        const barLength =
          d.count < BAR_MIN_VISIBLE_COUNT ? 0 : barHeightScale(d.count);
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
          showLabel: d.count >= BAR_LABEL_MIN_COUNT,
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
      .style("opacity", 1)
      .on("pointerenter", (event, d) => {
        hoveredLaunchSiteCode = d.site;
        renderLaunchTooltip(d);
        setCursor(false, true);
      })
      .on("pointerleave", () => {
        hoveredLaunchSiteCode = null;
        hideTooltip();
        setCursor(false, false);
      });

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
      .attr("text-anchor", (d) =>
        d.labelX >= globeCenter[0] ? "start" : "end",
      )
      .attr("dominant-baseline", "middle")
      .attr("font-size", (d) => d.labelFontSize + "px")
      .attr("font-weight", 700)
      .attr("fill", (d) => (d.isNewlyActive ? "#fff1b8" : "#ffd166"))
      .attr("stroke", "rgba(5, 7, 10, 0.72)")
      .attr("stroke-width", 1.5)
      .attr("paint-order", "stroke")
      .style("display", (d) => (d.showLabel ? null : "none"))
      .text((d) => (d.showLabel ? d.count.toLocaleString() : ""));

    if (hoveredLaunchSiteCode) {
      const hoveredSite = visibleBars.find(
        (d) => d.site === hoveredLaunchSiteCode,
      );
      if (hoveredSite && state.barsOpacity > 0.08) {
        renderLaunchTooltip(hoveredSite);
      } else {
        hoveredLaunchSiteCode = null;
        hideTooltip();
      }
    }
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
    if (
      !rotationState.dragging ||
      event.pointerId !== rotationState.pointerId
    ) {
      return;
    }

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
    hoveredLaunchSiteCode = null;
    hideTooltip();
    setCursor(false, false);
  });

  window.addEventListener("scroll", () => {
    targetScrollP = readScrollProgress();
  });

  applySceneState(buildSceneState(displayScrollP));

  d3.timer((elapsed) => {
    const now = performance.now();
    const dt = now - lastFrameAt;
    lastFrameAt = now;

    const lerp =
      1 - Math.pow(1 - DISPLAY_SCROLL_EASING, Math.max(1, dt / 16.67));
    displayScrollP += (targetScrollP - displayScrollP) * lerp;

    const t = elapsed / 1000;
    const state = buildSceneState(displayScrollP);
    applySceneState(state);

    const resolvedYear = Math.floor(state.currentYear);
    const targetCount = Math.floor(satelliteCountScale(state.currentYear));

    if (resolvedYear !== lastVisibleSatelliteYear) {
      lastVisibleSatellites = processedData
        .filter(
          (d) =>
            d.launchYear <= resolvedYear &&
            d.decayYear > resolvedYear &&
            d.isLeo,
        )
        .slice(0, targetCount);
      lastVisibleSatelliteYear = resolvedYear;
    }

    updateRankingPanel(state, resolvedYear);

    countText
      .text(`${lastVisibleSatellites.length.toLocaleString()} Satellites`)
      .style("opacity", state.timelineOpacity);

    densityTitleOverlay
      .style("opacity", String(state.densityTitleOpacity))
      .style(
        "transform",
        `translate(-50%, ${d3.interpolateNumber(20, 0)(state.densityTitleOpacity)}px)`,
      );

    updateGlobe(elapsed, state);

    let activePopupEvent = null;
    let minPDiff = Infinity;

    for (const ev of events) {
      const diff = Math.abs(state.scrollP - ev.targetP);
      if (diff < minPDiff) {
        minPDiff = diff;
        activePopupEvent = ev;
      }
    }

    const popupOpacity =
      minPDiff < POPUP_WINDOW_P ? 1 - minPDiff / POPUP_WINDOW_P : 0;

    if (activePopupEvent) {
      popupTitle.text(activePopupEvent.label || "Orbital Overview");
      popupBody.text(activePopupEvent.annotation);
      popupDiv.style("opacity", popupOpacity);
    }

    const drawnSats = lastVisibleSatellites.slice(
      0,
      Math.max(targetCount / 40, 1),
    );
    const circles = satLayer.selectAll("circle").data(drawnSats, (d) => d.id);

    circles
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("r", 1.2)
            .attr("fill", "#ffd166")
            .style("stroke", "transparent")
            .style("stroke-width", "12px")
            .style("cursor", "pointer")
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
          getGlobeCenterX() +
          Math.cos(d.baseAngle + t * d.drift) *
            (state.currentR + d.relativeAlt),
      )
      .attr(
        "cy",
        (d) =>
          getLayoutMetrics(state).globeCenterY +
          Math.sin(d.baseAngle + t * d.drift) *
            (state.currentR + d.relativeAlt),
      )
      .on("pointerenter", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(100)
          .attr("r", 5)
          .attr("fill", "#fff");

        updateTooltip(d, event);
      })
      .on("pointerleave", (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(100)
          .attr("r", 1.2)
          .attr("fill", "#ffd166");

        updateTooltip(null);
      });
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

function getTransitionPhase(zoomP) {
  if (zoomP < GLOBE_PHASE_END) return "globe";
  if (zoomP < DENSITY_PHASE_START) return "handoff";
  return "density";
}

function sampleEvenly(items, count) {
  if (count >= items.length) return items;
  if (count <= 0) return [];

  const step = items.length / count;
  const sampled = [];
  for (let i = 0; i < count; i += 1) {
    sampled.push(items[Math.floor(i * step)]);
  }
  return sampled;
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
