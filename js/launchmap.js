import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

/**
 * Launch-site coordinate lookup table.
 *
 * - Keys are LAUNCH_SITE codes from the CSV.
 * - Values are [longitude, latitude] in decimal degrees.
 * - Coordinates are approximate (good enough for map placement).
 * - Add new sites by appending: CODE: [lon, lat],
 */
const LAUNCH_SITE_COORDS = {
  // Requested Asia starter set (21)
  PLMSC: [40.577, 62.925],
  TYMSC: [63.305, 45.965],
  TAISC: [111.614, 38.849],
  JSC: [100.298, 40.96],
  SRILR: [80.235, 13.719],
  XICLF: [102.027, 28.246],
  TANSC: [130.969, 30.375],
  VOSTO: [128.333, 51.817],
  KYMSC: [45.746, 48.586],
  WSC: [110.951, 19.614],
  KSCUT: [127.203, 34.432],
  DLS: [99.941, 39.781],
  YSLA: [120.959, 14.75],
  NSC: [130.444, 31.251],
  YAVNE: [34.746, 31.878],
  SVOBO: [128.333, 51.817],
  SEMLS: [46.305, 43.798],
  SCSLA: [59.529, 22.272],
  SMTS: [102.039, 47.59],
  YUN: [100.23, 25.024],
  WALES: [70.26, 31.22],

  // Extra useful sites
  AFETR: [-80.604, 28.608],
  AFWTR: [-120.61, 34.742],
  FRGUI: [-52.768, 5.236],
  SNMLP: [-49.127, -5.284],
  KOURO: [-52.65, 5.16],
};

const VALID_CONTINENTS = [
  "Asia",
  "Europe",
  "Africa",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
];

const CONTINENT_VIEWS = {
  Asia: { center: [95, 28], scale: 420 },
  Europe: { center: [18, 51], scale: 600 },
  Africa: { center: [20, 5], scale: 420 },
  "North America": { center: [-100, 40], scale: 420 },
  "South America": { center: [-60, -18], scale: 470 },
  Oceania: { center: [145, -23], scale: 520 },
  Antarctica: { center: [0, -82], scale: 900 },
};

// Easy-to-tweak camera defaults.
const CAMERA = {
  yawDeg: 15,
  pitchDeg: 75,
};

const BAR_WIDTH = 10;
const BAR_DEPTH = { dx: 6, dy: -4 };

function normalizeSiteCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function buildSiteCounts(rows, continent) {
  const filtered = rows.filter(
    (row) => String(row.CONTINENT ?? "").trim() === continent,
  );

  return d3
    .rollups(
      filtered,
      (group) => group.length,
      (row) => normalizeSiteCode(row.LAUNCH_SITE),
    )
    .map(([site, count]) => ({ site, count }))
    .filter((d) => d.site.length > 0)
    .sort((a, b) => d3.descending(a.count, b.count));
}

function polygonPath(points) {
  return `M ${points.map((p) => `${p[0]},${p[1]}`).join(" L ")} Z`;
}

function waitForTransforms() {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
}

function dotLocalPointToSvgViaCTM(dotNode, svgNode, localX, localY) {
  const dotCTM = dotNode.getScreenCTM();
  const svgCTM = svgNode.getScreenCTM();
  if (!dotCTM || !svgCTM) return null;

  const pt = svgNode.createSVGPoint();
  pt.x = localX;
  pt.y = localY;
  const screenPt = pt.matrixTransform(dotCTM);
  const svgPt = screenPt.matrixTransform(svgCTM.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

function dotScreenCenterToSvg(dotNode, svgNode, viewWidth, viewHeight) {
  const dotRect = dotNode.getBoundingClientRect();
  const svgRect = svgNode.getBoundingClientRect();

  if (!dotRect.width || !dotRect.height || !svgRect.width || !svgRect.height) {
    return null;
  }

  const screenX = dotRect.left + dotRect.width / 2;
  const screenY = dotRect.top + dotRect.height / 2;

  return {
    x: ((screenX - svgRect.left) * viewWidth) / svgRect.width,
    y: ((screenY - svgRect.top) * viewHeight) / svgRect.height,
  };
}

export async function renderLaunchMap({
  containerSelector = "#launchmap",
  dropdownSelector = "#continent",
  csvPath = "data/satcat_with_continent.csv",
  worldTopoPath = "data/land-110m.json",
  defaultContinent = "Asia",
  width = 1100,
  height = 680,
} = {}) {
  const container = d3.select(containerSelector);
  const dropdown = d3.select(dropdownSelector);
  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("class", "map3d")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "#f8fbff");

  // gPlane is the only layer that gets CSS 3D transform.
  const gPlane = svg.append("g").attr("class", "map-plane");
  const gMapPlane = gPlane.append("g").attr("class", "map-land");
  const gDots = gPlane.append("g").attr("class", "map-dots");

  // Overlay layers stay untransformed so bars remain upright in screen space.
  const gBarsOverlay = svg.append("g").attr("class", "bars-overlay");
  const gLabelsOverlay = svg.append("g").attr("class", "labels-overlay");

  gPlane.node().style.transformOrigin = "center";
  gPlane.node().style.transform = `rotateY(${CAMERA.yawDeg}deg) rotateX(${CAMERA.pitchDeg}deg)`;

  const projection = d3.geoMercator();
  const geoPath = d3.geoPath(projection);

  const [rows, topo] = await Promise.all([
    d3.csv(csvPath),
    d3.json(worldTopoPath),
  ]);
  const land = feature(topo, topo.objects.land);

  const validSet = new Set(VALID_CONTINENTS);
  const continentOptions = Array.from(
    new Set(
      rows
        .map((d) => String(d.CONTINENT ?? "").trim())
        .filter((c) => validSet.has(c)),
    ),
  ).sort((a, b) => VALID_CONTINENTS.indexOf(a) - VALID_CONTINENTS.indexOf(b));

  dropdown
    .selectAll("option")
    .data(continentOptions)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);

  const initialContinent = continentOptions.includes(defaultContinent)
    ? defaultContinent
    : continentOptions[0] || "Asia";
  dropdown.property("value", initialContinent);

  async function draw(continent) {
    const view = CONTINENT_VIEWS[continent] || CONTINENT_VIEWS.Asia;

    projection
      .scale(view.scale)
      .center(view.center)
      .translate([width * 0.5, height * 0.58])
      .precision(0.5);

    gMapPlane.selectAll("*").remove();
    gDots.selectAll("*").remove();
    gBarsOverlay.selectAll("*").remove();
    gLabelsOverlay.selectAll("*").remove();

    gMapPlane
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#edf4ff");

    gMapPlane
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("d", geoPath)
      .attr("fill", "none")
      .attr("stroke", "#d4e1f5")
      .attr("stroke-width", 0.7)
      .attr("opacity", 0.8);

    gMapPlane
      .append("path")
      .datum(land)
      .attr("d", geoPath)
      .attr("fill", "#f3f8f0")
      .attr("stroke", "#87a786")
      .attr("stroke-width", 0.8);

    const siteCounts = buildSiteCounts(rows, continent);
    const missingCodes = [];

    const projectedSites = siteCounts
      .map((d) => {
        const lonLat = LAUNCH_SITE_COORDS[d.site];
        if (
          !lonLat ||
          !Number.isFinite(lonLat[0]) ||
          !Number.isFinite(lonLat[1])
        ) {
          missingCodes.push(d.site);
          return null;
        }

        const p = projection(lonLat);
        if (!p) return null;

        return { site: d.site, count: d.count, x: p[0], y: p[1] };
      })
      .filter(Boolean)
      .filter(
        (d) =>
          d.x >= -80 && d.x <= width + 80 && d.y >= -80 && d.y <= height + 80,
      );

    if (missingCodes.length) {
      const uniqueMissing = Array.from(new Set(missingCodes));
      console.warn(
        `[launchmap] Missing LAUNCH_SITE coordinates (${uniqueMissing.length}): ${uniqueMissing.join(", ")}`,
      );
    }

    const dots = gDots
      .selectAll("circle.site")
      .data(projectedSites, (d) => d.site)
      .join("circle")
      .attr("class", "site")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 5)
      .attr("fill", "#72de8f")
      .attr("stroke", "#2f8d4d")
      .attr("stroke-width", 1);

    // Wait until CSS 3D transform is applied, then sample visual dot positions.
    await waitForTransforms();

    const svgNode = svg.node();
    const baseBySite = new Map();

    dots.each(function (d) {
      const localX = Number(this.getAttribute("cx")) || d.x;
      const localY = Number(this.getAttribute("cy")) || d.y;

      // Primary method: transform local dot point through CTM (precise anchor).
      let base = dotLocalPointToSvgViaCTM(this, svgNode, localX, localY);

      // Fallback method requested in spec: bbox-center conversion.
      if (!base) {
        base = dotScreenCenterToSvg(this, svgNode, width, height);
      }

      if (base) baseBySite.set(d.site, base);
    });

    const barsData = projectedSites
      .map((d) => {
        const base = baseBySite.get(d.site);
        return base ? { ...d, baseX: base.x, baseY: base.y } : null;
      })
      .filter(Boolean);

    const maxCount = d3.max(barsData, (d) => d.count) || 1;
    const barHeightScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([0, 140]);

    const bars = gBarsOverlay
      .selectAll("g.bar3d")
      .data(barsData, (d) => d.site)
      .join("g")
      .attr("class", "bar3d");

    // Side face (darker)
    bars
      .append("path")
      .attr("fill", "#c08f1d")
      .attr("stroke", "#9f7416")
      .attr("stroke-width", 0.5)
      .attr("d", (d) => {
        const h = barHeightScale(d.count);
        const B = [d.baseX + BAR_WIDTH / 2, d.baseY];
        const C = [d.baseX + BAR_WIDTH / 2, d.baseY - h];
        const B2 = [B[0] + BAR_DEPTH.dx, B[1] + BAR_DEPTH.dy];
        const C2 = [C[0] + BAR_DEPTH.dx, C[1] + BAR_DEPTH.dy];
        return polygonPath([B, B2, C2, C]);
      });

    // Front face (main)
    bars
      .append("path")
      .attr("fill", "#f2c14c")
      .attr("stroke", "#b98a12")
      .attr("stroke-width", 0.6)
      .attr("d", (d) => {
        const h = barHeightScale(d.count);
        const A = [d.baseX - BAR_WIDTH / 2, d.baseY];
        const B = [d.baseX + BAR_WIDTH / 2, d.baseY];
        const C = [d.baseX + BAR_WIDTH / 2, d.baseY - h];
        const D = [d.baseX - BAR_WIDTH / 2, d.baseY - h];
        return polygonPath([A, B, C, D]);
      });

    // Top face (lighter)
    bars
      .append("path")
      .attr("fill", "#ffd978")
      .attr("stroke", "#c59c33")
      .attr("stroke-width", 0.5)
      .attr("d", (d) => {
        const h = barHeightScale(d.count);
        const C = [d.baseX + BAR_WIDTH / 2, d.baseY - h];
        const D = [d.baseX - BAR_WIDTH / 2, d.baseY - h];
        const C2 = [C[0] + BAR_DEPTH.dx, C[1] + BAR_DEPTH.dy];
        const D2 = [D[0] + BAR_DEPTH.dx, D[1] + BAR_DEPTH.dy];
        return polygonPath([D, C, C2, D2]);
      });

    // Draw a small base marker in overlay so bars visibly stem from each mapped point.
    gBarsOverlay
      .selectAll("circle.bar-base")
      .data(barsData, (d) => d.site)
      .join("circle")
      .attr("class", "bar-base")
      .attr("cx", (d) => d.baseX)
      .attr("cy", (d) => d.baseY)
      .attr("r", 2.4)
      .attr("fill", "#2f8d4d")
      .attr("opacity", 0.9);

    gLabelsOverlay
      .selectAll("text.count-label")
      .data(barsData, (d) => d.site)
      .join("text")
      .attr("class", "count-label")
      .attr("x", (d) => d.baseX + BAR_DEPTH.dx + 2)
      .attr("y", (d) => d.baseY - barHeightScale(d.count) + BAR_DEPTH.dy - 8)
      .text((d) => d.count)
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .attr("fill", "#1f2937");

    gLabelsOverlay
      .selectAll("text.site-label")
      .data(barsData, (d) => d.site)
      .join("text")
      .attr("class", "site-label")
      .attr("x", (d) => d.baseX + 8)
      .attr("y", (d) => d.baseY + 15)
      .text((d) => d.site)
      .attr("font-size", 11)
      .attr("fill", "#374151");

    gLabelsOverlay
      .append("text")
      .attr("x", 20)
      .attr("y", 30)
      .attr("font-size", 20)
      .attr("font-weight", 700)
      .attr("fill", "#14213d")
      .text(`Launch Sites in ${continent}`);

    gLabelsOverlay
      .append("text")
      .attr("x", 20)
      .attr("y", 52)
      .attr("font-size", 12)
      .attr("fill", "#4b5563")
      .text("Map plane uses CSS perspective; bars stay upright in overlay");

    if (missingCodes.length) {
      gLabelsOverlay
        .append("text")
        .attr("x", 20)
        .attr("y", 72)
        .attr("font-size", 12)
        .attr("fill", "#9f1239")
        .text(
          "Some site coordinates are missing. Open console for site codes to add.",
        );
    }
  }

  await draw(initialContinent);

  dropdown.on("change", async (event) => {
    const selected = event?.target?.value || dropdown.property("value");
    await draw(selected);
  });
}
