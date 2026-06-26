// Deterministic, seed-based mock generator. Run once via `bun run generate:mocks`;
// output is byte-identical across runs so the frontend develops against a stable
// dataset whose shape matches the eventual real query output exactly.
//
// Writes three files next to this script:
//   otp.json    { summary, byRoute, byEquityQuintile }
//   routes.json GeoJSON FeatureCollection of route lines (OTP joined)
//   stops.json  GeoJSON FeatureCollection of ~3000 stops
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const SEED = 20260626;

// --- deterministic PRNG (mulberry32) ---------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const round = (n: number, d = 4) => Number(n.toFixed(d));

// --- Austin geography -------------------------------------------------------
const BBOX = { minLon: -97.95, minLat: 30.1, maxLon: -97.55, maxLat: 30.55 };

// CapMetro-style route numbers: locals, crosstowns, the 300/400 series, the
// 550 rail, MetroRapid 800s, and 900-series express.
const ROUTE_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 10, 17, 18, 19, 20, 21, 22, 27, 30, 37, 38, 40, 100, 101, 103, 105, 110, 111,
  200, 201, 203, 207, 209, 211, 214, 217, 228, 233, 237, 240, 243, 271, 300, 311, 320, 323, 325,
  331, 333, 335, 337, 339, 350, 383, 392, 400, 411, 450, 461, 463, 465, 466, 470, 481, 485, 486,
  491, 550, 663, 670, 672, 800, 801, 803, 837, 935, 980, 985,
];

const CORRIDORS = [
  "North Lamar",
  "South Congress",
  "Burnet",
  "Manor",
  "East Riverside",
  "Cesar Chavez",
  "Montopolis",
  "Pleasant Valley",
  "Oltorf",
  "William Cannon",
  "Slaughter",
  "Metric",
  "Dessau",
  "Cameron",
  "MLK",
  "Berkman",
  "Springdale",
  "Decker",
  "Menchaca",
  "Stassney",
  "Ben White",
  "Guadalupe",
  "Airport",
  "Brodie",
  "Convict Hill",
  "Parmer",
  "Tech Ridge",
  "Mueller",
  "Crestview",
  "Hyde Park",
  "Govalle",
  "Dove Springs",
  "Del Valle",
  "Barton Springs",
  "Lake Austin",
  "Riverside",
  "Anderson",
  "Koenig",
  "Rundberg",
  "Wells Branch",
];

interface MockRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  otp: number;
  n_events: number;
  equity_burden_score: number;
}

function makeRoutes(): MockRoute[] {
  const usedCorridors = new Set<string>();
  return ROUTE_NUMBERS.map((num) => {
    // Burden score: higher = serves more transit-dependent, lower-income areas.
    const burden = round(rand(), 3);
    // OTP degrades with burden, plus noise; clamped to a plausible 0.60–0.90.
    const otp = round(Math.min(0.9, Math.max(0.6, 0.88 - burden * 0.2 + between(-0.03, 0.03))));
    const n_events = Math.round(between(2000, 12000));

    const a = CORRIDORS[Math.floor(rand() * CORRIDORS.length)] ?? "Lamar";
    let name = a;
    if (rand() > 0.55) {
      const b = CORRIDORS[Math.floor(rand() * CORRIDORS.length)] ?? "Congress";
      if (b !== a) name = `${a}/${b}`;
    }
    // Nudge toward uniqueness without forcing it.
    if (usedCorridors.has(name)) name = `${name} ${num < 100 ? "Local" : "Connector"}`;
    usedCorridors.add(name);

    return {
      route_id: String(num),
      route_short_name: String(num),
      route_long_name: `${num} - ${name}`,
      otp,
      n_events,
      equity_burden_score: burden,
    };
  });
}

// Regional anchors across the metro. Routes connect pairs of these (downtown
// weighted but not universal), so the network reads like overlapping corridors
// rather than a starburst radiating from one point. The real CapMetro shapes.txt
// replaces this entirely when Sprint 1 data is wired.
const HUBS: [number, number][] = [
  [-97.7431, 30.2672], // downtown
  [-97.722, 30.4], // north — Domain / Tech Ridge
  [-97.69, 30.205], // southeast — Montopolis / Riverside
  [-97.83, 30.235], // southwest — Oak Hill
  [-97.665, 30.305], // east — Mueller / Manor
  [-97.81, 30.39], // northwest
  [-97.745, 30.135], // far south — Slaughter
  [-97.6, 30.27], // far east — Del Valle
];

// Polyline between two hubs: a straight run that bows out slightly and jitters,
// so trunks overlap and directions vary (a network, not a star).
function makeLine(
  seedRand: () => number,
  a: [number, number],
  b: [number, number],
): [number, number][] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // perpendicular unit vector
  const py = dx / len;
  const bend = (seedRand() - 0.5) * 0.06;
  const steps = 10 + Math.floor(seedRand() * 6);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bow = Math.sin(t * Math.PI) * bend;
    const lon = clamp(
      a[0] + dx * t + px * bow + (seedRand() - 0.5) * 0.005,
      BBOX.minLon,
      BBOX.maxLon,
    );
    const lat = clamp(
      a[1] + dy * t + py * bow + (seedRand() - 0.5) * 0.005,
      BBOX.minLat,
      BBOX.maxLat,
    );
    pts.push([round(lon, 5), round(lat, 5)]);
  }
  return pts;
}

// Pick two distinct hubs for a route; bias roughly half through downtown.
function pickHubs(seedRand: () => number): [[number, number], [number, number]] {
  let i = Math.floor(seedRand() * HUBS.length);
  let j = Math.floor(seedRand() * HUBS.length);
  if (seedRand() < 0.45) i = 0; // downtown
  if (j === i) j = (j + 1) % HUBS.length;
  return [HUBS[i] as [number, number], HUBS[j] as [number, number]];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function interpolateAlong(line: [number, number][], n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const seg = t * (line.length - 1);
    const idx = Math.min(line.length - 2, Math.floor(seg));
    const f = seg - idx;
    const a = line[idx] ?? line[0];
    const b = line[idx + 1] ?? line[line.length - 1];
    if (!a || !b) continue;
    out.push([round(a[0] + (b[0] - a[0]) * f, 5), round(a[1] + (b[1] - a[1]) * f, 5)]);
  }
  return out;
}

function main() {
  const routes = makeRoutes();

  // Per-route geometry (deterministic: each route gets its own seeded stream).
  const routeFeatures = routes.map((r, i) => {
    const lineRand = mulberry32(SEED + 7919 * (i + 1));
    const [a, b] = pickHubs(lineRand);
    const line = makeLine(lineRand, a, b);
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: line },
      properties: {
        route_id: r.route_id,
        route_short_name: r.route_short_name,
        route_long_name: r.route_long_name,
        otp: r.otp,
        equity_burden_score: r.equity_burden_score,
      },
    };
  });

  // ~3000 stops distributed along the route lines.
  const perRoute = Math.round(3000 / routes.length);
  let stopId = 1000;
  const stopFeatures = routeFeatures.flatMap((rf) =>
    interpolateAlong(rf.geometry.coordinates, perRoute).map((coord) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: coord },
      properties: {
        stop_id: String(stopId++),
        route_id: rf.properties.route_id,
        stop_name: `${rf.properties.route_long_name.split(" - ")[1] ?? "Stop"} @ ${stopId}`,
      },
    })),
  );

  // Summary: n_events-weighted measured OTP, with a Wilson 95% CI.
  const totalN = routes.reduce((s, r) => s + r.n_events, 0);
  const measured = routes.reduce((s, r) => s + r.otp * r.n_events, 0) / totalN;
  const ci = wilson(Math.round(measured * totalN), totalN);
  const summary = {
    measured_otp: round(measured, 4),
    target_otp: 0.85,
    n_events: totalN,
    ci_low: round(ci.low, 4),
    ci_high: round(ci.high, 4),
  };

  // Five equity quintiles by burden. Per the brief, lower quintiles have lower
  // OTP: quintile 1 = most burdened (lowest income, highest minority share).
  const byOtp = [...routes].sort((a, b) => a.otp - b.otp);
  const size = Math.ceil(byOtp.length / 5);
  const byEquityQuintile = Array.from({ length: 5 }, (_, q) => {
    const group = byOtp.slice(q * size, (q + 1) * size);
    const n = group.reduce((s, r) => s + r.n_events, 0);
    const otp = group.reduce((s, r) => s + r.otp * r.n_events, 0) / n;
    return {
      quintile: q + 1,
      otp: round(otp, 4),
      n_events: n,
      mean_household_income: Math.round(34000 + q * 15000 + between(-1500, 1500)),
      pct_minority: round(0.78 - q * 0.11 + between(-0.02, 0.02), 3),
    };
  });

  write("otp.json", { summary, byRoute: routes, byEquityQuintile });
  write("routes.json", { type: "FeatureCollection", features: routeFeatures });
  write("stops.json", { type: "FeatureCollection", features: stopFeatures });

  console.log(
    `[mocks] ${routes.length} routes, ${stopFeatures.length} stops, ` +
      `measured OTP ${(measured * 100).toFixed(1)}% (target 85%)`,
  );
}

function wilson(successes: number, total: number, z = 1.96) {
  if (total === 0) return { low: 0, high: 0 };
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  return { low: center - margin, high: center + margin };
}

function write(name: string, data: unknown) {
  Bun.write(join(OUT_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
}

main();
