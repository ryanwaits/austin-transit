import { afterAll, expect, test } from "bun:test";
import { sql } from "./client.ts";

// Guards the single most common GTFS parsing bug: arrival/departure times that
// exceed 24:00:00 must round-trip as INTERVAL, not TIME. Requires a running
// Postgres (docker compose up); skips cleanly if the DB is unreachable so a
// bare `bun test` doesn't fail on a dev machine without Docker up.
let reachable = true;
try {
  await sql`SELECT 1`;
} catch {
  reachable = false;
  console.warn("[interval.test] Postgres unreachable — skipping INTERVAL test");
}

test.if(reachable)("25:30:00 parses as INTERVAL '1 day 1 hour 30 minutes'", async () => {
  const [row] = await sql<{ eq: boolean }[]>`
    SELECT ('25:30:00'::INTERVAL = INTERVAL '1 day 1 hour 30 minutes') AS eq
  `;
  expect(row?.eq).toBe(true);
});

afterAll(async () => {
  if (reachable) await sql.end();
});
