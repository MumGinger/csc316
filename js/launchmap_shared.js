import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export const LAUNCH_SITE_COORDS = {
  AFETR: [-80.604, 28.608],
  AFWTR: [-120.61, 34.742],
  WLPIS: [-75.466, 37.94],
  KODAK: [-152.339, 57.435],
  WRAS: [-120.61, 34.742],
  ERAS: [-80.604, 28.608],
  KWAJ: [167.743, 9.048],
  TYMSC: [63.305, 45.965],
  PLMSC: [40.577, 62.925],
  VOSTO: [128.333, 51.817],
  SVOBO: [128.333, 51.817],
  DLS: [59.529, 51.207],
  KYMSC: [45.746, 48.586],
  JSC: [100.298, 40.96],
  TAISC: [111.614, 38.849],
  XICLF: [102.027, 28.246],
  WSC: [110.951, 19.614],
  SCSLA: [112.0, 16.0],
  YSLA: [123.0, 35.0],
  TANSC: [130.969, 30.375],
  KSCUT: [131.0, 31.25],
  SPKII: [135.0, 33.7],
  NSC: [127.535, 34.431],
  JJSLA: [126.5, 33.2],
  SRILR: [80.235, 13.719],
  SEMLS: [53.95, 35.234],
  SMTS: [55.55, 36.42],
  YAVNE: [34.706, 31.878],
  YUN: [124.705, 39.66],
  ANDSP: [16.01, 69.29],
  ALCLC: [-44.394, -2.373],
  BOS: [148.27, -20.01],
  WOMRA: [136.505, -31.144],
  RLLB: [177.864, -39.261],
  HGSTR: [8.166, 30.833],
  SNMLP: [40.303, -2.938],
  FRGUI: [-52.768, 5.236],
  SEAL: [154.0, 0.0],
  SUBL: [0.0, 0.0],
  CAS: [-15.0, 28.0],
  UNK: [0, 0],
};

export const LAUNCH_SITE_METADATA = {
  AFETR: { name: "Air Force Eastern Test Range", country: "United States" },
  AFWTR: { name: "Air Force Western Test Range", country: "United States" },
  ALCLC: { name: "Alcantara Launch Center", country: "Brazil" },
  ANDSP: { name: "Andoya Spaceport", country: "Norway" },
  BOS: { name: "Bowen Orbital Spaceport", country: "Australia" },
  CAS: { name: "Canaries Airspace", country: "Spain" },
  DLS: { name: "Dombarovskiy Launch Site", country: "Russia" },
  ERAS: { name: "Eastern Range Airspace", country: "United States" },
  FRGUI: { name: "Europe's Spaceport, Kourou", country: "French Guiana" },
  HGSTR: { name: "Hammaguira Space Track Range", country: "Algeria" },
  JJSLA: { name: "Jeju Island Sea Launch Area", country: "South Korea" },
  JSC: { name: "Jiuquan Space Center", country: "China" },
  KODAK: { name: "Kodiak Launch Complex", country: "United States" },
  KSCUT: { name: "Uchinoura Space Center", country: "Japan" },
  KWAJ: { name: "US Army Kwajalein Atoll", country: "Marshall Islands" },
  KYMSC: {
    name: "Kapustin Yar Missile and Space Complex",
    country: "Russia",
  },
  NSC: { name: "Naro Space Complex", country: "South Korea" },
  PLMSC: {
    name: "Plesetsk Missile and Space Complex",
    country: "Russia",
  },
  RLLB: {
    name: "Rocket Lab Launch Base, Mahia Peninsula",
    country: "New Zealand",
  },
  SCSLA: { name: "South China Sea Launch Area", country: "China" },
  SEAL: { name: "Sea Launch Platform", country: "Mobile Platform" },
  SEMLS: { name: "Semnan Satellite Launch Site", country: "Iran" },
  SMTS: { name: "Shahrud Missile Test Site", country: "Iran" },
  SNMLP: { name: "San Marco Launch Platform", country: "Kenya" },
  SPKII: { name: "Space Port Kii", country: "Japan" },
  SRILR: { name: "Satish Dhawan Space Centre", country: "India" },
  SUBL: { name: "Submarine Launch Platform", country: "Mobile Platform" },
  SVOBO: { name: "Svobodnyy Launch Complex", country: "Russia" },
  TAISC: { name: "Taiyuan Space Center", country: "China" },
  TANSC: { name: "Tanegashima Space Center", country: "Japan" },
  TBD: { name: "To Be Determined", country: "Unknown" },
  TYMSC: {
    name: "Tyuratam Missile and Space Center (Baikonur Cosmodrome)",
    country: "Kazakhstan",
  },
  UNK: { name: "Unknown", country: "Unknown" },
  VOSTO: { name: "Vostochny Cosmodrome", country: "Russia" },
  WLPIS: { name: "Wallops Island", country: "United States" },
  WOMRA: { name: "Woomera", country: "Australia" },
  WRAS: { name: "Western Range Airspace", country: "United States" },
  WSC: { name: "Wenchang Satellite Launch Site", country: "China" },
  XICLF: { name: "Xichang Launch Facility", country: "China" },
  YAVNE: { name: "Yavne Launch Facility", country: "Israel" },
  YSLA: { name: "Yellow Sea Launch Area", country: "China" },
  YUN: {
    name: "Yunsong Launch Site (Sohae Satellite Launching Station)",
    country: "North Korea",
  },
};

export const VALID_CONTINENTS = [
  "Asia",
  "Europe",
  "Africa",
  "North America",
  "South America",
  "Oceania",
];

export const CONTINENT_VIEWS = {
  Asia: { center: [75, 50], scale: 420 },
  Europe: { center: [18, 51], scale: 600 },
  Africa: { center: [20, 20], scale: 800 },
  "North America": { center: [-100, 40], scale: 420 },
  "South America": { center: [-60, -18], scale: 800 },
  Oceania: { center: [145, -10], scale: 520 },
};

export const CONTINENT_LABELS = [
  { name: "Asia", lonLat: [90, 55] },
  { name: "Europe", lonLat: [15, 52] },
  { name: "Africa", lonLat: [10, 10] },
  { name: "North America", lonLat: [-105, 45] },
  { name: "South America", lonLat: [-60, -20] },
  { name: "Oceania", lonLat: [130, -25] },
];

export function normalizeSiteCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function getLaunchSiteMetadata(siteCode) {
  const normalizedSiteCode = normalizeSiteCode(siteCode);
  const metadata = LAUNCH_SITE_METADATA[normalizedSiteCode];

  return {
    siteCode: normalizedSiteCode,
    siteName: metadata?.name || normalizedSiteCode || "Unknown",
    country: metadata?.country || "Unknown",
  };
}

export function parseLaunchYear(row) {
  const rawDate = row.LAUNCH_DATE ?? row.Launch_Date ?? row.launch_date ?? null;
  if (!rawDate) return null;

  const parsed = new Date(rawDate);
  const year = parsed.getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

export function buildSiteCounts(rows, continent = null) {
  const filtered = continent
    ? rows.filter((row) => String(row.CONTINENT ?? "").trim() === continent)
    : rows;

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

export function createBarHeightScale(data, range = [0, 140]) {
  const maxCount = d3.max(data, (d) => d.count) || 1;
  return d3.scaleLinear().domain([0, maxCount]).range(range);
}

export function buildRankedLaunchSites(
  rows,
  { continent = null, limit = Infinity } = {},
) {
  return buildSiteCounts(rows, continent)
    .map((d) => {
      const lonLat = LAUNCH_SITE_COORDS[d.site];
      if (
        !lonLat ||
        !Number.isFinite(lonLat[0]) ||
        !Number.isFinite(lonLat[1])
      ) {
        return null;
      }

      return {
        ...d,
        ...getLaunchSiteMetadata(d.site),
        lon: lonLat[0],
        lat: lonLat[1],
        lonLat,
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

export function buildCumulativeLaunchSiteCounts(
  rows,
  {
    startYear = 1957,
    endYear = 2025,
    excludeSites = [],
  } = {},
) {
  const excluded = new Set(excludeSites.map(normalizeSiteCode));
  const incrementsByYear = new Map();
  const siteMeta = new Map();
  const firstActiveYearBySite = new Map();
  const totalsBySite = new Map();

  rows.forEach((row) => {
    const year = parseLaunchYear(row);
    const site = normalizeSiteCode(row.LAUNCH_SITE);
    const lonLat = LAUNCH_SITE_COORDS[site];

    if (!Number.isFinite(year) || year < startYear || year > endYear) return;
    if (!site || excluded.has(site)) return;
    if (!lonLat || !Number.isFinite(lonLat[0]) || !Number.isFinite(lonLat[1])) return;

    siteMeta.set(site, {
      site,
      ...getLaunchSiteMetadata(site),
      lon: lonLat[0],
      lat: lonLat[1],
      lonLat,
    });

    if (!incrementsByYear.has(year)) incrementsByYear.set(year, new Map());
    const yearlyIncrements = incrementsByYear.get(year);
    yearlyIncrements.set(site, (yearlyIncrements.get(site) || 0) + 1);

    totalsBySite.set(site, (totalsBySite.get(site) || 0) + 1);

    if (!firstActiveYearBySite.has(site) || year < firstActiveYearBySite.get(site)) {
      firstActiveYearBySite.set(site, year);
    }
  });

  const countsByYear = new Map();
  const maxCountByYear = new Map();
  const runningCounts = new Map(Array.from(siteMeta.keys(), (site) => [site, 0]));

  for (let year = startYear; year <= endYear; year += 1) {
    const yearlyIncrements = incrementsByYear.get(year);
    if (yearlyIncrements) {
      yearlyIncrements.forEach((increment, site) => {
        runningCounts.set(site, (runningCounts.get(site) || 0) + increment);
      });
    }

    const yearCounts = Array.from(runningCounts, ([site, count]) => {
      if (count <= 0) return null;
      return {
        ...siteMeta.get(site),
        count,
        firstActiveYear: firstActiveYearBySite.get(site),
      };
    })
      .filter(Boolean)
      .sort((a, b) => d3.descending(a.count, b.count));

    countsByYear.set(year, yearCounts);
    maxCountByYear.set(year, yearCounts[0]?.count || 0);
  }

  return {
    countsByYear,
    maxCountByYear,
    maxCount: d3.max(Array.from(totalsBySite.values())) || 1,
    firstActiveYearBySite,
    startYear,
    endYear,
  };
}
