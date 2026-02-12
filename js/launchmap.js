// js/launchmap.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

/**
 * IMPORTANT (read):
 * To get the "paper on desk" effect, you MUST add CSS to your page:
 *
 * #launchmap {
 *   perspective: 1100px;
 *   perspective-origin: 50% 45%;
 * }
 * #launchmap svg {
 *   transform-style: preserve-3d;
 *   overflow: visible;
 * }
 *
 * This file applies a CSS 3D transform to the MAP PLANE only (map + dots),
 * then measures the on-screen dot positions and draws BARS in an un-tilted overlay
 * so bars rise straight up (VR-style).
 */

const LAUNCH_SITE_COORDS = {
  // --- Asia starter set requested (21 site codes) ---
  PLMSC: [40.577, 62.925], // Plesetsk Cosmodrome (Russia)
  TYMSC: [63.305, 45.965], // Baikonur Cosmodrome (Kazakhstan)
  TAISC: [111.614, 38.849], // Taiyuan Satellite Launch Center (China)
  JSC: [100.298, 40.96], // Jiuquan Satellite Launch Center (China)
  SRILR: [80.235, 13.719], // Satish Dhawan Space Centre, Sriharikota (India)
  XICLF: [102.027, 28.246], // Xichang Satellite Launch Center (China)
  TANSC: [130.969, 30.375], // Tanegashima Space Center (Japan)
  VOSTO: [128.333, 51.817], // Vostochny Cosmodrome (Russia)
  KYMSC: [45.746, 48.586], // Kapustin Yar (Russia)
  WSC: [110.951, 19.614], // Wenchang Space Launch Site (China)
  KSCUT: [127.203, 34.432], // Naro Space Center, Goheung (South Korea)
  DLS: [99.941, 39.781], // Dongfeng / Jiuquan area (China)
  YSLA: [120.959, 14.75], // Luzon placeholder
  NSC: [130.444, 31.251], // Uchinoura Space Center (Japan)
  YAVNE: [34.746, 31.878], // Palmachim / Yavne area (Israel)
  SVOBO: [128.333, 51.817], // Svobodny Cosmodrome (Russia)
  SEMLS: [46.305, 43.798], // Semnan Space Center (Iran, approx)
  SCSLA: [59.529, 22.272], // Arabian Sea suborbital (approx)
  SMTS: [102.039, 47.59], // Mongolia test site (approx)
  YUN: [100.23, 25.024], // Yunnan region (approx)
  WALES: [70.26, 31.22], // Pakistan test area (approx)

  // --- Helpful non-Asia defaults ---
  AFETR: [-80.604, 28.608], // Cape Canaveral
  AFWTR: [-120.61, 34.742], // Vandenberg
  FRGUI: [-52.768, 5.236], // Kourou region
  SNMLP: [-49.127, -5.284], // Alcantara
  KOURO: [-52.65, 5.16], // Kourou alt
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

function normalizeSiteCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function buildSiteCounts(rows, continent) {
  const filtered = rows.filter(
    (row) => String(row.CONTINENT || "").trim() === continent,
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

function getExtentForProjectedSites(projectedSites, width, height) {
  if (!projectedSites.length) {
    return {
      xMin: width * 0.2,
      xMax: width * 0.8,
      yMin: height * 0.25,
      yMax: height * 0.75,
    };
  }
  return {
    xMin: d3.min(projectedSites, (d) => d.x),
    xMax: d3.max(projectedSites, (d) => d.x),
    yMin: d3.min(projectedSites, (d) => d.y),
    yMax: d3.max(projectedSites, (d) => d.y),
  };
}

function polygonPath(points) {
  return `M ${points.map((p) => `${p[0]},${p[1]}`).join(" L ")} Z`;
}

// Spread bar bases to reduce overlaps, while keeping them near their original anchors.
function spreadBars(barsData, width, height) {
  const nodes = barsData.map((d) => ({ ...d, x: d.bx, y: d.by }));

  const sim = d3
    .forceSimulation(nodes)
    .force("x", d3.forceX((d) => d.bx).strength(0.25))
    .force("y", d3.forceY((d) => d.by).strength(0.25))
    .force("collide", d3.forceCollide(14))
    .stop();

  for (let i = 0; i < 60; i++) sim.tick();

  for (const n of nodes) {
    n.x = Math.max(10, Math.min(width - 10, n.x));
    n.y = Math.max(10, Math.min(height - 10, n.y));
  }
  return nodes;
}

export async function renderLaunchMap({
  containerSelector = "#launchmap",
  dropdownSelector = "#continent",
  csvPath = "data/satcat_with_continent.csv",
  worldTopoPath = "data/land-110m.json",
  defaultContinent = "Asia",

  // Internal coordinate system (viewBox). SVG will auto-fit its container.
  width = 1100,
  height = 680,
} = {}) {
  const container = d3.select(containerSelector);
  const dropdown = d3.select(dropdownSelector);

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

  const projection = d3.geoMercator();
  const geoPath = d3.geoPath(projection);

  // Rebuild SVG each time (incl. on resize) so viewBox stays correct and overlay measures correctly.
  let resizeObserver = null;

  function buildSvg() {
    container.selectAll("*").remove();

    // Responsive SVG: auto-fit container (fixes overlap/layout weirdness from fixed px SVGs)
    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto")
      .style("display", "block")
      .style("background", "#fbfcff")
      .classed("map3d", true);

    // Two-layer architecture
    const gPlane = svg.append("g").attr("class", "plane");
    const gMap = gPlane.append("g").attr("class", "map-layer");
    const gSites = gPlane.append("g").attr("class", "site-layer");

    const gOverlay = svg.append("g").attr("class", "overlay");
    const gBars = gOverlay.append("g").attr("class", "bar-layer");
    const gLabels = gOverlay.append("g").attr("class", "label-layer");

    // ---- Apply CSS 3D transform to the plane (paper on desk) ----
    // Fix 1: translateY pushes tilted plane down so it won't intrude into UI above (dropdown).
    const yawDeg = 10;
    const pitchDeg = 75;
    const planeScale = 1.1;
    const planeTranslateY = 70; // tune if needed

    gPlane
      .style("transform-box", "fill-box")
      .style("transform-origin", "50% 50%")
      .style(
        "transform",
        `translateY(${planeTranslateY}px) rotateY(${yawDeg}deg) rotateX(${pitchDeg}deg) scale(${planeScale})`,
      );

    // Screen -> SVG coords helper (works with viewBox scaling)
    function screenToSvg(svgNode, screenX, screenY) {
      const svgRect = svgNode.getBoundingClientRect();
      const x = (screenX - svgRect.left) * (width / svgRect.width);
      const y = (screenY - svgRect.top) * (height / svgRect.height);
      return { x, y };
    }

    // Draw bars AFTER plane is rendered + CSS transformed
    function drawBarsFromDots(plotted, barHeightScale) {
      gBars.selectAll("*").remove();
      // keep overlay title/legend, clear only bar-related labels
      gLabels
        .selectAll(".bar-label, .site-label, .count-label, .leader")
        .remove();

      const barW = 10;
      const depth = { dx: 8, dy: 7 };

      const svgNode = svg.node();
      const dotNodes = gSites.selectAll("circle.site").nodes();
      const baseBySite = new Map();

      // Measure each dot on screen, convert to SVG coords, and ROOT bars from dot "bottom"
      for (const node of dotNodes) {
        const site = node.getAttribute("data-site");
        const bb = node.getBoundingClientRect();
        const cx = bb.left + bb.width / 2;
        const cy = bb.top + bb.height / 2;

        const p = screenToSvg(svgNode, cx, cy);

        // Fix 2: root bars from dot bottom (not center)
        const dotR = Number(node.getAttribute("r")) || 5.5;
        p.y += dotR;

        baseBySite.set(site, p);
      }

      const barsData = plotted
        .map((d) => {
          const base = baseBySite.get(d.site);
          if (!base) return null;
          return { ...d, bx: base.x, by: base.y };
        })
        .filter(Boolean);

      // Fix 3: reduce overlaps by spreading bases + leader lines
      const spaced = spreadBars(barsData, width, height);

      // leader lines (dot -> bar base)
      gBars
        .selectAll("line.leader")
        .data(spaced, (d) => d.site)
        .join("line")
        .attr("class", "leader")
        .attr("x1", (d) => d.bx)
        .attr("y1", (d) => d.by)
        .attr("x2", (d) => d.x)
        .attr("y2", (d) => d.y)
        .attr("stroke", "#111827")
        .attr("stroke-opacity", 0.18)
        .attr("stroke-width", 1);

      const barGroups = gBars
        .selectAll("g.bar3d")
        .data(spaced, (d) => d.site)
        .join("g")
        .attr("class", "bar3d");

      barGroups.each(function (d) {
        const g = d3.select(this);
        g.selectAll("*").remove();

        const h = barHeightScale(d.count);
        const x = d.x;
        const y = d.y;

        const A = [x - barW / 2, y];
        const B = [x + barW / 2, y];
        const C = [x + barW / 2, y - h];
        const D = [x - barW / 2, y - h];

        const A2 = [A[0] + depth.dx, A[1] + depth.dy];
        const B2 = [B[0] + depth.dx, B[1] + depth.dy];
        const C2 = [C[0] + depth.dx, C[1] + depth.dy];
        const D2 = [D[0] + depth.dx, D[1] + depth.dy];

        const front = [A, B, C, D];
        const side = [B, B2, C2, C];
        const top = [D, C, C2, D2];

        g.append("path")
          .attr("d", polygonPath(side))
          .attr("fill", "#d9a93f")
          .attr("stroke", "#b98a12")
          .attr("stroke-width", 0.9)
          .attr("opacity", 0.95);

        g.append("path")
          .attr("d", polygonPath(front))
          .attr("fill", "#f2c14c")
          .attr("stroke", "#b98a12")
          .attr("stroke-width", 0.9)
          .attr("opacity", 0.95);

        g.append("path")
          .attr("d", polygonPath(top))
          .attr("fill", "#ffd56a")
          .attr("stroke", "#b98a12")
          .attr("stroke-width", 0.9)
          .attr("opacity", 0.95);
      });

      // Count labels (overlay, readable)
      gLabels
        .selectAll("text.count-label")
        .data(spaced, (d) => d.site)
        .join("text")
        .attr("class", "count-label")
        .attr("x", (d) => d.x + depth.dx + 8)
        .attr("y", (d) => d.y - barHeightScale(d.count) + depth.dy - 6)
        .text((d) => d.count)
        .attr("font-size", 13)
        .attr("font-weight", 700)
        .attr("fill", "#1f2430");

      // Site labels (overlay, readable)
      gLabels
        .selectAll("text.site-label")
        .data(spaced, (d) => d.site)
        .join("text")
        .attr("class", "site-label")
        .attr("x", (d) => d.x + 7)
        .attr("y", (d) => d.y + 18)
        .text((d) => d.site)
        .attr("font-size", 11)
        .attr("fill", "#374151");
    }

    function draw(continent) {
      const view = CONTINENT_VIEWS[continent] || CONTINENT_VIEWS.Asia;

      projection
        .scale(view.scale)
        .center(view.center)
        .translate([width * 0.5, height * 0.57])
        .precision(0.5);

      gMap.selectAll("*").remove();
      gSites.selectAll("*").remove();
      gBars.selectAll("*").remove();

      // Map background + graticule + land (on the plane)
      gMap
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#eef4ff");

      gMap
        .append("path")
        .datum(d3.geoGraticule10())
        .attr("d", geoPath)
        .attr("fill", "none")
        .attr("stroke", "#d6e2f7")
        .attr("stroke-width", 0.6)
        .attr("opacity", 0.6);

      gMap
        .append("path")
        .datum(land)
        .attr("d", geoPath)
        .attr("fill", "#f5f8f2")
        .attr("stroke", "#8ea78d")
        .attr("stroke-width", 0.8);

      const siteCounts = buildSiteCounts(rows, continent);
      const missingCodes = [];

      const plotted = siteCounts
        .map((d) => {
          const lonLat = LAUNCH_SITE_COORDS[d.site];
          if (
            !lonLat ||
            lonLat.length !== 2 ||
            !Number.isFinite(lonLat[0]) ||
            !Number.isFinite(lonLat[1])
          ) {
            missingCodes.push(d.site);
            return null;
          }

          const projected = projection(lonLat);
          if (!projected) return null;

          return {
            ...d,
            lon: lonLat[0],
            lat: lonLat[1],
            x: projected[0],
            y: projected[1],
          };
        })
        .filter(Boolean)
        .filter(
          (d) =>
            d.x >= -50 && d.x <= width + 50 && d.y >= -50 && d.y <= height + 50,
        );

      if (missingCodes.length > 0) {
        const uniqueMissing = Array.from(new Set(missingCodes));
        console.warn(
          `[launchmap] Missing LAUNCH_SITE coordinates (${uniqueMissing.length}): ${uniqueMissing.join(", ")}`,
        );
      }

      const maxCount = d3.max(plotted, (d) => d.count) || 1;
      const barHeightScale = d3
        .scaleSqrt()
        .domain([0, maxCount])
        .range([0, Math.max(80, Math.min(220, height * 0.28))]);

      // Dots on plane (tilted with map)
      gSites
        .selectAll("circle.site")
        .data(plotted, (d) => d.site)
        .join("circle")
        .attr("class", "site")
        .attr("data-site", (d) => d.site)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", 5.5)
        .attr("fill", "#71db8f")
        .attr("stroke", "#2f8c4c")
        .attr("stroke-width", 1.1)
        .attr("opacity", 0.95);

      // Title/legend in overlay (readable) — clear + redraw
      gLabels.selectAll("*").remove();

      gLabels
        .append("text")
        .attr("x", 20)
        .attr("y", 32)
        .attr("font-size", 20)
        .attr("font-weight", 700)
        .attr("fill", "#12213a")
        .text(`Launch Sites in ${continent}`);

      gLabels
        .append("text")
        .attr("x", 20)
        .attr("y", 54)
        .attr("font-size", 12)
        .attr("fill", "#41506b")
        .text(
          "Dot = launch site on paper, bar = launch count rising up (upright)",
        );

      if (missingCodes.length > 0) {
        gLabels
          .append("text")
          .attr("x", 20)
          .attr("y", 74)
          .attr("font-size", 12)
          .attr("fill", "#9f1239")
          .text(
            "Some site coordinates are missing. Check console for site codes to add.",
          );
      }

      const extent = getExtentForProjectedSites(plotted, width, height);
      gLabels
        .append("rect")
        .attr("x", Math.max(0, extent.xMin - 22))
        .attr("y", Math.max(0, extent.yMin - 32))
        .attr("width", Math.min(width, extent.xMax - extent.xMin + 44))
        .attr("height", Math.min(height, extent.yMax - extent.yMin + 56))
        .attr("fill", "none")
        .attr("stroke", "#000000")
        .attr("stroke-opacity", 0.06)
        .attr("stroke-width", 1)
        .lower();

      // Wait for CSS 3D transform to apply before measuring dots
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          drawBarsFromDots(plotted, barHeightScale);
        });
      });
    }

    return { svg, draw };
  }

  // initial render
  let built = buildSvg();
  built.draw(initialContinent);

  // dropdown interaction
  dropdown.on("change", (event) => {
    const selected = event?.target?.value || dropdown.property("value");
    built.draw(selected);
  });

  // auto-fit / re-measure on resize
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(() => {
    const selected = dropdown.property("value") || initialContinent;
    built = buildSvg();
    built.draw(selected);
  });
  resizeObserver.observe(container.node());
}
