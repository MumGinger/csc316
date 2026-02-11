import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

/**
 * Launch site coordinate lookup table.
 *
 * - Keys are LAUNCH_SITE codes from the CSV.
 * - Values are [longitude, latitude] in decimal degrees.
 * - Coordinates are approximate and intended for visualization.
 * - To add/update a site, add another line in the same format:
 *     CODE: [lon, lat],
 */
const LAUNCH_SITE_COORDS = {
  // --- Asia starter set requested (21 site codes) ---
  PLMSC: [40.577, 62.925], // Plesetsk Cosmodrome (Russia)
  TYMSC: [63.305, 45.965], // Baikonur Cosmodrome (Kazakhstan)
  TAISC: [111.614, 38.849], // Taiyuan Satellite Launch Center (China)
  JSC: [100.298, 40.960], // Jiuquan Satellite Launch Center (China)
  SRILR: [80.235, 13.719], // Satish Dhawan Space Centre, Sriharikota (India)
  XICLF: [102.027, 28.246], // Xichang Satellite Launch Center (China)
  TANSC: [130.969, 30.375], // Tanegashima Space Center (Japan)
  VOSTO: [128.333, 51.817], // Vostochny Cosmodrome (Russia)
  KYMSC: [45.746, 48.586], // Kapustin Yar (Russia)
  WSC: [110.951, 19.614], // Wenchang Space Launch Site (China)
  KSCUT: [127.203, 34.432], // Naro Space Center, Goheung (South Korea)
  DLS: [99.941, 39.781], // Dongfeng / Jiuquan area (China)
  YSLA: [120.959, 14.750], // Approx. Luzon coastal launch area placeholder
  NSC: [130.444, 31.251], // Uchinoura Space Center (Japan)
  YAVNE: [34.746, 31.878], // Palmachim / Yavne area (Israel)
  SVOBO: [128.333, 51.817], // Svobodny Cosmodrome (Russia)
  SEMLS: [46.305, 43.798], // Approx. Semnan Space Center (Iran)
  SCSLA: [59.529, 22.272], // Approx. Suborbital launch area near Oman/Arabian Sea
  SMTS: [102.039, 47.590], // Approx. Sainshand region test site
  YUN: [100.230, 25.024], // Approx. Yunnan region (China)
  WALES: [70.260, 31.220], // Approx. western launch/test area in Pakistan

  // --- Helpful non-Asia defaults so other continents still work out-of-the-box ---
  AFETR: [-80.604, 28.608], // Cape Canaveral (USA)
  AFWTR: [-120.610, 34.742], // Vandenberg (USA)
  FRGUI: [-52.768, 5.236], // Guiana Space Centre (French Guiana)
  SNMLP: [-49.127, -5.284], // Alcantara Launch Center (Brazil)
  KOURO: [-52.650, 5.160], // Alternate code sometimes used for Kourou
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
  Asia: { rotate: [-95, -20], scale: 330 },
  Europe: { rotate: [-15, -43], scale: 420 },
  Africa: { rotate: [-20, 5], scale: 360 },
  "North America": { rotate: [100, -25], scale: 340 },
  "South America": { rotate: [62, 12], scale: 370 },
  Oceania: { rotate: [-150, 15], scale: 420 },
  Antarctica: { rotate: [0, 90], scale: 290 },
};

// Unit vector controlling bar angle in screen space (up and slightly right).
const BAR_DIRECTION = (() => {
  const dx = 0.55;
  const dy = -1;
  const length = Math.hypot(dx, dy) || 1;
  return { dx: dx / length, dy: dy / length };
})();

function normalizeSiteCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function buildSiteCounts(rows, continent) {
  const filtered = rows.filter((row) => String(row.CONTINENT || "").trim() === continent);

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
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("background", "#fbfcff");

  const gMap = svg.append("g").attr("class", "map-layer");
  const gBars = svg.append("g").attr("class", "bar-layer");
  const gSites = svg.append("g").attr("class", "site-layer");
  const gLabels = svg.append("g").attr("class", "label-layer");

  const projection = d3.geoOrthographic();
  const geoPath = d3.geoPath(projection);

  const [rows, topo] = await Promise.all([d3.csv(csvPath), d3.json(worldTopoPath)]);
  const land = feature(topo, topo.objects.land);

  const validSet = new Set(VALID_CONTINENTS);
  const continentOptions = Array.from(
    new Set(rows.map((d) => String(d.CONTINENT ?? "").trim()).filter((c) => validSet.has(c))),
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

  function draw(continent) {
    const view = CONTINENT_VIEWS[continent] || CONTINENT_VIEWS.Asia;

    projection
      .scale(view.scale)
      .translate([width * 0.5, height * 0.56])
      .rotate(view.rotate)
      .clipAngle(90)
      .precision(0.5);

    gMap.selectAll("*").remove();
    gBars.selectAll("*").remove();
    gSites.selectAll("*").remove();
    gLabels.selectAll("*").remove();

    // Globe background and graticule for visual context.
    gMap
      .append("path")
      .datum({ type: "Sphere" })
      .attr("d", geoPath)
      .attr("fill", "#eef4ff")
      .attr("stroke", "#a5b8d6")
      .attr("stroke-width", 1.1);

    gMap
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("d", geoPath)
      .attr("fill", "none")
      .attr("stroke", "#d6e2f7")
      .attr("stroke-width", 0.6)
      .attr("opacity", 0.7);

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
        if (!lonLat || lonLat.length !== 2 || !Number.isFinite(lonLat[0]) || !Number.isFinite(lonLat[1])) {
          missingCodes.push(d.site);
          return null;
        }

        const projected = projection(lonLat);
        // projection() returns null when clipped to far side of globe.
        if (!projected) {
          return null;
        }

        return {
          ...d,
          lon: lonLat[0],
          lat: lonLat[1],
          x: projected[0],
          y: projected[1],
        };
      })
      .filter(Boolean);

    if (missingCodes.length > 0) {
      const uniqueMissing = Array.from(new Set(missingCodes));
      console.warn(
        `[launchmap] Missing LAUNCH_SITE coordinates (${uniqueMissing.length}): ${uniqueMissing.join(", ")}`,
      );
    }

    // Keep bars readable across small and large count ranges.
    const maxCount = d3.max(plotted, (d) => d.count) || 1;
    const barHeightScale = d3
      .scaleSqrt()
      .domain([0, maxCount])
      .range([0, Math.max(80, Math.min(220, height * 0.28))]);

    const barWidth = 10;
    const nudge = 4;

    gSites
      .selectAll("circle.site")
      .data(plotted, (d) => d.site)
      .join("circle")
      .attr("class", "site")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 5.5)
      .attr("fill", "#71db8f")
      .attr("stroke", "#2f8c4c")
      .attr("stroke-width", 1.1)
      .attr("opacity", 0.95);

    gBars
      .selectAll("path.bar")
      .data(plotted, (d) => d.site)
      .join("path")
      .attr("class", "bar")
      .attr("fill", "#f2c14c")
      .attr("stroke", "#b98a12")
      .attr("stroke-width", 0.9)
      .attr("opacity", 0.9)
      .attr("d", (d) => {
        const h = barHeightScale(d.count);

        const baseX = d.x;
        const baseY = d.y;
        const topX = baseX + BAR_DIRECTION.dx * h;
        const topY = baseY + BAR_DIRECTION.dy * h;

        // Perpendicular direction controls rectangle thickness.
        const perpX = -BAR_DIRECTION.dy;
        const perpY = BAR_DIRECTION.dx;

        const a = [baseX + perpX * (barWidth / 2), baseY + perpY * (barWidth / 2)];
        const b = [baseX - perpX * (barWidth / 2), baseY - perpY * (barWidth / 2)];
        const c = [topX - perpX * (barWidth / 2), topY - perpY * (barWidth / 2)];
        const d2 = [topX + perpX * (barWidth / 2), topY + perpY * (barWidth / 2)];

        return `M ${a[0]},${a[1]} L ${b[0]},${b[1]} L ${c[0]},${c[1]} L ${d2[0]},${d2[1]} Z`;
      });

    // Count labels near bar tops.
    gLabels
      .selectAll("text.count-label")
      .data(plotted, (d) => d.site)
      .join("text")
      .attr("class", "count-label")
      .attr("x", (d) => d.x + BAR_DIRECTION.dx * barHeightScale(d.count) + 8)
      .attr("y", (d) => d.y + BAR_DIRECTION.dy * barHeightScale(d.count) - 2)
      .text((d) => d.count)
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .attr("fill", "#1f2430");

    // Launch site code labels near each base dot.
    gLabels
      .selectAll("text.site-label")
      .data(plotted, (d) => d.site)
      .join("text")
      .attr("class", "site-label")
      .attr("x", (d) => d.x + 7)
      .attr("y", (d) => d.y + 17 + nudge)
      .text((d) => d.site)
      .attr("font-size", 11)
      .attr("fill", "#374151");

    const extent = getExtentForProjectedSites(plotted, width, height);

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
      .text("Dot = launch site, angled bar = launch count, top label = exact count");

    if (missingCodes.length > 0) {
      gLabels
        .append("text")
        .attr("x", 20)
        .attr("y", 74)
        .attr("font-size", 12)
        .attr("fill", "#9f1239")
        .text(`Some site coordinates are missing. Check console for site codes to add.`);
    }

    // Optional lightweight frame around the active cluster area for readability.
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
  }

  draw(initialContinent);

  dropdown.on("change", (event) => {
    const selected = event?.target?.value || dropdown.property("value");
    draw(selected);
  });
}
