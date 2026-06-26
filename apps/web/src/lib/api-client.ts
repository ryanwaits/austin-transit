// Typed fetch wrappers for the read-only data API. Defaults to same-origin Next
// route handlers (`/api/v1/*`), which mirror the Hono API's mock output so the
// Vercel preview is self-contained. Point NEXT_PUBLIC_API_BASE at the Hono API
// (http://localhost:4000/v1) to integration-test against the real service.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const getOtpSummary = () => get<OtpSummary>("/otp/summary");
export const getOtpByRoute = () => get<RouteOtp[]>("/otp/by-route");
export const getOtpByEquityQuintile = () => get<EquityQuintile[]>("/otp/by-equity-quintile");

// GeoJSON is loaded directly by MapLibre from these URLs (relative is fine).
export const routesGeojsonUrl = `${API_BASE}/routes/geojson`;
export const stopsGeojsonUrl = `${API_BASE}/stops/geojson`;

export async function subscribe(email: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}
