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
        lon: lonLat[0],
        lat: lonLat[1],
        lonLat,
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}
