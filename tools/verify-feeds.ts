// Checks that the three CapMetro data.texas.gov feed URLs return 200. Run this
// first after install: `bun run verify:feeds`. Reads URLs from the environment
// (Bun auto-loads .env); falls back to .env.example values if unset.

const FEEDS: Array<{ name: string; url: string | undefined }> = [
  { name: "vehicle_positions", url: process.env.GTFS_RT_VEHICLE_POSITIONS_URL },
  { name: "trip_updates", url: process.env.GTFS_RT_TRIP_UPDATES_URL },
  { name: "static_gtfs", url: process.env.GTFS_STATIC_URL },
];

let failed = false;

for (const { name, url } of FEEDS) {
  if (!url) {
    console.error(`✗ ${name}: no URL configured`);
    failed = true;
    continue;
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const bytes = Number(res.headers.get("content-length") ?? 0);
    const size = bytes ? `${(bytes / 1024).toFixed(0)} KB` : "unknown size";
    if (res.ok) {
      console.log(`✓ ${name}: ${res.status} (${size})`);
    } else {
      console.error(`✗ ${name}: ${res.status} ${url}`);
      failed = true;
    }
    // Drain the body so the connection can be reused/closed cleanly.
    await res.arrayBuffer();
  } catch (err) {
    console.error(`✗ ${name}: ${err instanceof Error ? err.message : err}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
