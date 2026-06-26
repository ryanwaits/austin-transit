import { sql } from "@at/db";
import { Hono } from "hono";

export const subscribe = new Hono();

// Conservative email shape check — we collect, we don't verify/send this sprint.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tiny in-memory per-IP limiter: 5 requests / 10 min. Sufficient for a public
// signup; a real deployment behind Fly/Vercel would also have edge limits.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

// Ensure the table exists exactly once per process (idempotent; the canonical
// schema also lives in migration 006_subscribers.sql).
let ensured: Promise<unknown> | null = null;
function ensureTable() {
  ensured ??= sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return ensured;
}

subscribe.post("/subscribe", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "local";
  if (rateLimited(ip)) return c.json({ ok: false, error: "rate_limited" }, 429);

  let body: { email?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return c.json({ ok: false, error: "invalid_email" }, 400);

  try {
    await ensureTable();
    await sql`INSERT INTO subscribers (email) VALUES (${email}) ON CONFLICT (email) DO NOTHING`;
  } catch (err) {
    console.error("[subscribe] db error:", err instanceof Error ? err.message : err);
    return c.json({ ok: false, error: "store_unavailable" }, 503);
  }
  return c.json({ ok: true }, 201);
});
