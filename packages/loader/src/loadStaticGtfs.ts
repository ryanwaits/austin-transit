import { sql } from "@at/db";
import { unzipSync } from "fflate";
import { copyCsv } from "./csvCopyHelper.ts";

const GTFS_STATIC_URL = process.env.GTFS_STATIC_URL;

// CSV file -> (target table, ordered list of columns we load). Column names
// match GTFS field names; any column the file omits loads as NULL. `location`
// on static_stops is computed after COPY, so it's intentionally absent here.
const FILES: Array<{ file: string; table: string; columns: readonly string[] }> = [
  {
    file: "agency.txt",
    table: "static_agency",
    columns: [
      "agency_id",
      "agency_name",
      "agency_url",
      "agency_timezone",
      "agency_lang",
      "agency_phone",
      "agency_fare_url",
      "agency_email",
    ],
  },
  {
    file: "stops.txt",
    table: "static_stops",
    columns: [
      "stop_id",
      "stop_code",
      "stop_name",
      "stop_desc",
      "stop_lat",
      "stop_lon",
      "zone_id",
      "stop_url",
      "location_type",
      "parent_station",
      "stop_timezone",
      "wheelchair_boarding",
      "level_id",
      "platform_code",
    ],
  },
  {
    file: "routes.txt",
    table: "static_routes",
    columns: [
      "route_id",
      "agency_id",
      "route_short_name",
      "route_long_name",
      "route_desc",
      "route_type",
      "route_url",
      "route_color",
      "route_text_color",
      "route_sort_order",
    ],
  },
  {
    file: "trips.txt",
    table: "static_trips",
    columns: [
      "trip_id",
      "route_id",
      "service_id",
      "trip_headsign",
      "trip_short_name",
      "direction_id",
      "block_id",
      "shape_id",
      "wheelchair_accessible",
      "bikes_allowed",
    ],
  },
  {
    file: "stop_times.txt",
    table: "static_stop_times",
    columns: [
      "trip_id",
      "arrival_time",
      "departure_time",
      "stop_id",
      "stop_sequence",
      "stop_headsign",
      "pickup_type",
      "drop_off_type",
      "shape_dist_traveled",
      "timepoint",
    ],
  },
  {
    file: "calendar.txt",
    table: "static_calendar",
    columns: [
      "service_id",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "start_date",
      "end_date",
    ],
  },
  {
    file: "calendar_dates.txt",
    table: "static_calendar_dates",
    columns: ["service_id", "date", "exception_type"],
  },
];

async function main(): Promise<void> {
  if (!GTFS_STATIC_URL) throw new Error("GTFS_STATIC_URL is not set");

  console.log(`[load] downloading static GTFS from ${GTFS_STATIC_URL}`);
  const res = await fetch(GTFS_STATIC_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const zipBytes = new Uint8Array(await res.arrayBuffer());
  console.log(`[load] downloaded ${(zipBytes.length / 1e6).toFixed(1)} MB, unzipping...`);

  const unzipped = unzipSync(zipBytes);

  const rowCounts: Record<string, number> = {};

  // Single transaction: TRUNCATE + COPY every table; rollback on any error.
  await sql.begin(async (tx) => {
    for (const { file, table, columns } of FILES) {
      const bytes = unzipped[file];
      if (!bytes) {
        console.warn(`[load] ${file} not present in archive, skipping`);
        continue;
      }
      await tx.unsafe(`TRUNCATE ${table}`);
      const n = await copyCsv(tx, table, columns, bytes);
      rowCounts[table] = n;
      console.log(`[load] ${file} -> ${table}: ${n.toLocaleString()} rows`);
    }

    // Populate the PostGIS geography from lat/lon now that stops are loaded.
    await tx`
      UPDATE static_stops
      SET location = ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326)::geography
      WHERE stop_lat IS NOT NULL AND stop_lon IS NOT NULL
    `;

    await tx`
      INSERT INTO static_gtfs_loads (source_url, file_count, row_counts)
      VALUES (${GTFS_STATIC_URL}, ${Object.keys(rowCounts).length}, ${tx.json(rowCounts)})
    `;
  });

  console.log("[load] done. row counts:", rowCounts);
  await sql.end();
}

await main();
