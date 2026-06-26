// Data provider. In MOCK_MODE it serves the deterministic JSON from ./mocks;
// otherwise it would query @at/db. The real branch is intentionally a clear 501
// until Sprint 1's collection completes — the mock/real shapes are identical, so
// wiring is a mechanical swap (see README "Wiring real data").
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.ts";

const MOCK_DIR = join(dirname(fileURLToPath(import.meta.url)), "mocks");

export interface OtpSummary {
  measured_otp: number;
  target_otp: number;
  n_events: number;
  ci_low: number;
  ci_high: number;
}
export interface RouteOtp {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  otp: number;
  n_events: number;
  equity_burden_score: number;
}
export interface EquityQuintile {
  quintile: number;
  otp: number;
  n_events: number;
  mean_household_income: number;
  pct_minority: number;
}
interface OtpFile {
  summary: OtpSummary;
  byRoute: RouteOtp[];
  byEquityQuintile: EquityQuintile[];
}
export interface FeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }>;
}

/** Thrown by the real-data branch until Sprint 1 wiring lands; mapped to 501. */
export class NotWiredError extends Error {
  constructor() {
    super("real data provider not wired yet — run the API with MOCK_MODE=true");
    this.name = "NotWiredError";
  }
}

// Mock files are read once and cached for the process lifetime.
const cache = new Map<string, unknown>();
async function readMock<T>(file: string): Promise<T> {
  if (!cache.has(file)) cache.set(file, await Bun.file(join(MOCK_DIR, file)).json());
  return cache.get(file) as T;
}

export async function getOtpSummary(): Promise<OtpSummary> {
  if (!env.MOCK_MODE) throw new NotWiredError();
  return (await readMock<OtpFile>("otp.json")).summary;
}

export async function getOtpByRoute(): Promise<RouteOtp[]> {
  if (!env.MOCK_MODE) throw new NotWiredError();
  return (await readMock<OtpFile>("otp.json")).byRoute;
}

export async function getOtpByEquityQuintile(): Promise<EquityQuintile[]> {
  if (!env.MOCK_MODE) throw new NotWiredError();
  return (await readMock<OtpFile>("otp.json")).byEquityQuintile;
}

export async function getRoutesGeojson(): Promise<FeatureCollection> {
  if (!env.MOCK_MODE) throw new NotWiredError();
  return readMock<FeatureCollection>("routes.json");
}

export async function getStopsGeojson(bbox?: [number, number, number, number]) {
  if (!env.MOCK_MODE) throw new NotWiredError();
  const fc = await readMock<FeatureCollection>("stops.json");
  if (!bbox) return fc;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return {
    type: "FeatureCollection" as const,
    features: fc.features.filter((f) => {
      const [lon, lat] = (f.geometry.coordinates as [number, number]) ?? [0, 0];
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    }),
  };
}
