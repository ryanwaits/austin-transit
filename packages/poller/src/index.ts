import { runMigrations, sql } from "@at/db";
import { archiveFeed, archivingEnabled, type FeedKind } from "./archiveR2.ts";
import { FeedFetchError, fetchFeed } from "./fetchFeed.ts";
import { writeTripUpdates } from "./writeTripUpdates.ts";
import { writeVehicles } from "./writeVehicles.ts";

const VEHICLE_URL = process.env.GTFS_RT_VEHICLE_POSITIONS_URL;
const TRIP_UPDATE_URL = process.env.GTFS_RT_TRIP_UPDATES_URL;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 30_000);

let shuttingDown = false;

async function pollOnce(): Promise<void> {
  const fetchedAt = new Date();

  // Fetch both feeds in parallel; settle so one failure doesn't sink the other.
  const [vehicleRes, tripRes] = await Promise.allSettled([
    VEHICLE_URL ? fetchFeed(VEHICLE_URL) : Promise.reject(new Error("no vehicle URL")),
    TRIP_UPDATE_URL ? fetchFeed(TRIP_UPDATE_URL) : Promise.reject(new Error("no trip URL")),
  ]);

  let vehicles = 0;
  let tripUpdates = 0;
  let stopTimeUpdates = 0;

  if (vehicleRes.status === "fulfilled") {
    const { feed, bytes } = vehicleRes.value;
    await archive("vehicle", fetchedAt, bytes);
    vehicles = await writeVehicles(sql, feed.entity, fetchedAt, feed.header?.timestamp);
  } else {
    logFeedError("vehicle_positions", vehicleRes.reason);
  }

  if (tripRes.status === "fulfilled") {
    const { feed, bytes } = tripRes.value;
    await archive("trip_update", fetchedAt, bytes);
    const stats = await writeTripUpdates(sql, feed.entity, fetchedAt, feed.header?.timestamp);
    tripUpdates = stats.tripUpdates;
    stopTimeUpdates = stats.stopTimeUpdates;
  } else {
    logFeedError("trip_updates", tripRes.reason);
  }

  console.log(
    `[poll] ${fetchedAt.toISOString()} vehicles=${vehicles} ` +
      `tripUpdates=${tripUpdates} stopTimeUpdates=${stopTimeUpdates}`,
  );
}

// Archive raw protobuf to R2 if configured. Best-effort: a failure is logged
// but never blocks the DB write or the poll loop.
async function archive(kind: FeedKind, at: Date, bytes: Uint8Array): Promise<void> {
  try {
    await archiveFeed(kind, at, bytes);
  } catch (err) {
    console.error(`[archive] ${kind} R2 write failed:`, err instanceof Error ? err.message : err);
  }
}

function logFeedError(feed: string, reason: unknown): void {
  if (reason instanceof FeedFetchError) {
    console.error(`[poll] ${feed} fetch failed: HTTP ${reason.status} ${reason.url}`);
  } else {
    console.error(`[poll] ${feed} error:`, reason instanceof Error ? reason.message : reason);
  }
}

// Sleep that resolves early if shutdown is requested.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    process.once("__wake", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

async function main(): Promise<void> {
  console.log(
    `[poller] starting. host=${process.env.POSTGRES_HOST ?? "localhost"} ` +
      `db=${process.env.POSTGRES_DB ?? "austintransit"} interval=${POLL_INTERVAL_MS}ms`,
  );
  if (archivingEnabled) {
    console.log(`[poller] R2 archiving enabled (bucket=${process.env.R2_BUCKET})`);
  } else {
    console.warn("[poller] R2 archiving DISABLED — set R2_* vars to keep a raw forensic record");
  }
  await runMigrations();

  installShutdownHandlers();

  while (!shuttingDown) {
    const started = Date.now();
    try {
      await pollOnce();
    } catch (err) {
      // Never let an unexpected error break the loop.
      console.error("[poll] unexpected error:", err);
    }
    const elapsed = Date.now() - started;
    const wait = Math.max(0, POLL_INTERVAL_MS - elapsed);
    if (!shuttingDown) await sleep(wait);
  }

  console.log("[poller] draining and closing DB client...");
  await sql.end({ timeout: 10 });
  console.log("[poller] shutdown complete.");
  process.exit(0);
}

function installShutdownHandlers(): void {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[poller] received ${signal}, finishing in-flight work...`);
      process.emit("__wake" as never);
    });
  }
}

await main();
