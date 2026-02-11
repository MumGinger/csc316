// js/launchmap.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

/**
 * IMPORTANT: Your CSV has no lat/lon.
 * You must provide launch-site coords (prototype approximations are OK).
 * Format: [lon, lat]
 */
const siteCoords = new Map([
  // Asia / USSR-Russia / China / India / Japan (approx prototypes)
  ["PLMSC", [40.577, 62.925]], // Plesetsk
  ["TYMSC", [63.342, 45.965]], // Baikonur
  ["SRILR", [80.23, 13.72]], // Sriharikota
  ["XICLF", [102.027, 28.246]], // Xichang
  ["JSC", [100.298, 40.96]], // Jiuquan (prototype)
  ["WSC", [110.951, 19.614]], // Wenchang (prototype)
  ["TAISC", [111.0, 38.85]], // Taiyuan (prototype)
  ["TANSC", [130.968, 30.375]], // Tanegashima (prototype)
  ["VOSTO", [146.25, -20.4]], // placeholder if used (verify)
  ["KYMSC", [49.06, 46.0]], // Kapustin Yar (prototype)

  // North America examples (if you later view NA)
  ["AFETR", [-80.604, 28.608]], // Cape Canaveral
  ["AFWTR", [-120.61, 34.742]], // Vandenberg
]);

// Only show “real” continents (your file also has Airspace/Mobile/Unknown)
const CANON_CONTINENTS = new Set([
  "Asia",
  "Europe",
  "Africa",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
]);

// map view per continent (tweak rotate/scale to get the “angled” feel you want)
const continentView = {
  Asia: { rotate: [-90, -20], scale: 420 },
  Europe: { rotate: [-15, -35], scale: 520 },
  Africa: { rotate: [-20, 10], scale: 520 },
  "North America": { rotate: [100, -25], scale: 460 },
  "South America": { rotate: [70, 10], scale: 520 },
  Oceania: { rotate: [-150, 10], scale: 600 },
  Antarctica: { rotate: [0, 90], scale: 380 },
};

function normalize(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

// Screen-space direction for the “angled” bars (like your sketch)
const BAR_U = normalize(0.55, -1.0);

export async function renderLaunchMap({
  containerSelector = "#launchmap",
  dropdownSelector = "#continent",
  csvPath = "data/satcat_with_continent.csv",
  worldTopoPath = "data/land-110m.json",
  defaultContinent = "Asia",
  width = 1100,
  height = 650,
} = {}) {
  const container = d3.select(containerSelector);
  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("style").text(`
    .land { fill:#f3f3f3; stroke:#aaa; stroke-width:0.6px; }
    .sphere { fill:#fff; stroke:#999; stroke-width:1px; }
    .site { fill:#5bd37b; stroke:rgba(0,0,0,0.25); stroke-width:0.8px; }
    .bar { fill:#f2c04a; stroke:rgba(0,0,0,0.25); stroke-width:0.8px; }
    .label { font:12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif; fill:#222; }
    .warn { font:12px system-ui; fill:#d33; }
    .title { font-weight:700; font-size:16px; }
  `);

  const gMap = svg.append("g");
  const gBars = svg.append("g");
  const gSites = svg.append("g");
  const gLabels = svg.append("g");

  const projection = d3.geoOrthographic();
  const geoPath = d3.geoPath(projection);

  const [world, data] = await Promise.all([
    d3.json(worldTopoPath),
    d3.csv(csvPath, d3.autoType),
  ]);

  const land = feature(world, world.objects.land);

  // dropdown options from your dataset, filtered to canonical continents
  const continents = Array.from(new Set(data.map((d) => d.CONTINENT)))
    .filter((c) => CANON_CONTINENTS.has(c))
    .sort();

  const select = d3.select(dropdownSelector);
  select
    .selectAll("option")
    .data(continents)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);

  const initial = continents.includes(defaultContinent)
    ? defaultContinent
    : continents[0];
  select.property("value", initial);

  function draw(continent) {
    const view = continentView[continent] ?? continentView.Asia;

    projection
      .scale(view.scale)
      .translate([width * 0.52, height * 0.58])
      .rotate(view.rotate)
      .clipAngle(90);

    gMap.selectAll("*").remove();
    gBars.selectAll("*").remove();
    gSites.selectAll("*").remove();
    gLabels.selectAll("*").remove();

    // sphere + land
    gMap
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sphere")
      .attr("d", geoPath);
    gMap.append("path").datum(land).attr("class", "land").attr("d", geoPath);

    // filter rows by continent
    const filtered = data.filter((d) => d.CONTINENT === continent);

    // group by LAUNCH_SITE -> count
    const bySite = d3
      .rollups(
        filtered,
        (v) => v.length,
        (d) => d.LAUNCH_SITE,
      )
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => d3.descending(a.count, b.count));

    // build points with coords
    const points = [];
    const missing = [];
    for (const s of bySite) {
      const lonlat = siteCoords.get(s.site);
      if (!lonlat) {
        missing.push(s.site);
        continue;
      }
      const xy = projection(lonlat);
      if (!xy) continue; // clipped
      points.push({ ...s, x: xy[0], y: xy[1] });
    }

    const maxCount = d3.max(points, (d) => d.count) ?? 1;
    const hScale = d3.scaleLinear().domain([0, maxCount]).range([0, 140]);

    // site dots
    gSites
      .selectAll("circle")
      .data(points, (d) => d.site)
      .join("circle")
      .attr("class", "site")
      .attr("r", 5.5)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    // bars (angled rectangles)
    const barW = 10;

    gBars
      .selectAll("path")
      .data(points, (d) => d.site)
      .join("path")
      .attr("class", "bar")
      .attr("d", (d) => {
        const h = hScale(d.count);
        const x0 = d.x,
          y0 = d.y;
        const x1 = x0 + BAR_U.dx * h;
        const y1 = y0 + BAR_U.dy * h;

        const px = -BAR_U.dy;
        const py = BAR_U.dx;

        const A = [x0 + px * (barW / 2), y0 + py * (barW / 2)];
        const B = [x0 - px * (barW / 2), y0 - py * (barW / 2)];
        const C = [x1 - px * (barW / 2), y1 - py * (barW / 2)];
        const D = [x1 + px * (barW / 2), y1 + py * (barW / 2)];

        return `M ${A[0]},${A[1]} L ${B[0]},${B[1]} L ${C[0]},${C[1]} L ${D[0]},${D[1]} Z`;
      });

    // exact count labels
    gLabels
      .selectAll("text.count")
      .data(points, (d) => d.site)
      .join("text")
      .attr("class", "label count")
      .attr("x", (d) => d.x + 10)
      .attr("y", (d) => d.y - hScale(d.count) + 2)
      .text((d) => d.count);

    // title
    gLabels
      .append("text")
      .attr("class", "label title")
      .attr("x", 14)
      .attr("y", 28)
      .text(`Launch Sites — ${continent}`);

    // missing coords warning
    if (missing.length) {
      gLabels
        .append("text")
        .attr("class", "warn")
        .attr("x", 14)
        .attr("y", 52)
        .text(
          `Missing coords for: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? " ..." : ""}`,
        );
    }
  }

  draw(initial);
  select.on("change", () => draw(select.property("value")));
}
