// API configuration. MOCK_MODE defaults to true for Sprint 2 — the frontend
// develops against deterministic mock data until Sprint 1's collection week
// completes, at which point this flips to false and the same handlers query
// @at/db instead.
export const env = {
  PORT: Number(process.env.API_PORT ?? 4000),
  MOCK_MODE: (process.env.MOCK_MODE ?? "true") !== "false",
  // Comma-separated allowed CORS origins for the browser-facing web app.
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim()),
};
