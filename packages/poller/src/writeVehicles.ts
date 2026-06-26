import type { Sql } from "@at/db";
import type { FeedEntity } from "./fetchFeed.ts";

// GTFS trip start_date is "YYYYMMDD"; convert to an ISO date Postgres accepts.
function isoDate(yyyymmdd: unknown): string | null {
  if (typeof yyyymmdd !== "string" || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

// GTFS-RT timestamps are unix seconds; null/0 means absent.
function tsToIso(sec: unknown): string | null {
  const n = typeof sec === "number" ? sec : null;
  if (!n) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * Insert one row per vehicle-position FeedEntity in a single statement. We
 * expand a JSON array with json_to_recordset so the geography column can be
 * built with ST_MakePoint server-side. Returns the number of rows written.
 */
export async function writeVehicles(
  sql: Sql,
  entities: FeedEntity[],
  fetchedAt: Date,
  feedTimestamp: number | undefined,
): Promise<number> {
  const rows = entities.filter((e) => e.vehicle).map((e) => buildRow(e, fetchedAt, feedTimestamp));

  if (rows.length === 0) return 0;

  await sql`
    INSERT INTO vehicle_positions_raw (
      fetched_at, feed_timestamp, entity_id, vehicle_id, trip_id, route_id,
      start_date, position, bearing, speed, current_stop_sequence,
      current_status, congestion_level, occupancy_status
    )
    SELECT
      x.fetched_at, x.feed_timestamp, x.entity_id, x.vehicle_id, x.trip_id,
      x.route_id, x.start_date,
      CASE WHEN x.lon IS NOT NULL AND x.lat IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(x.lon, x.lat), 4326)::geography END,
      x.bearing, x.speed, x.current_stop_sequence, x.current_status,
      x.congestion_level, x.occupancy_status
    FROM json_to_recordset(${sql.json(rows)}::json) AS x(
      fetched_at timestamptz, feed_timestamp timestamptz, entity_id text,
      vehicle_id text, trip_id text, route_id text, start_date date,
      lon double precision, lat double precision, bearing real, speed real,
      current_stop_sequence int, current_status text, congestion_level text,
      occupancy_status text
    )
  `;
  return rows.length;
}

function buildRow(entity: FeedEntity, fetchedAt: Date, feedTimestamp: number | undefined) {
  const v = entity.vehicle as Record<string, unknown>;
  const trip = (v.trip ?? {}) as Record<string, unknown>;
  const vehicle = (v.vehicle ?? {}) as Record<string, unknown>;
  const pos = (v.position ?? {}) as Record<string, unknown>;
  return {
    fetched_at: fetchedAt.toISOString(),
    feed_timestamp: tsToIso(feedTimestamp),
    entity_id: entity.id ?? null,
    vehicle_id: (vehicle.id as string) ?? null,
    trip_id: (trip.tripId as string) ?? null,
    route_id: (trip.routeId as string) ?? null,
    start_date: isoDate(trip.startDate),
    lon: (pos.longitude as number) ?? null,
    lat: (pos.latitude as number) ?? null,
    bearing: (pos.bearing as number) ?? null,
    speed: (pos.speed as number) ?? null,
    current_stop_sequence: (v.currentStopSequence as number) ?? null,
    current_status: (v.currentStatus as string) ?? null,
    congestion_level: (v.congestionLevel as string) ?? null,
    occupancy_status: (v.occupancyStatus as string) ?? null,
  };
}
