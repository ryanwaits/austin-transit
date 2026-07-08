import type { Sql } from "@at/db";
import type { FeedEntity } from "./fetchFeed.ts";

function isoDate(yyyymmdd: unknown): string | null {
  if (typeof yyyymmdd !== "string" || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function tsToIso(sec: unknown): string | null {
  const n = typeof sec === "number" ? sec : null;
  if (!n) return null;
  return new Date(n * 1000).toISOString();
}

export interface TripUpdateStats {
  tripUpdates: number;
  stopTimeUpdates: number;
}

/**
 * Insert trip updates and their child stop-time updates. Parents go in one
 * statement and return (id, entity_id); we then join children back to their
 * parent by entity_id, which GTFS-RT guarantees unique within a feed message.
 * Postgres does not guarantee RETURNING row order, so we must key on a real
 * column rather than insertion order.
 */
export async function writeTripUpdates(
  sql: Sql,
  entities: FeedEntity[],
  fetchedAt: Date,
  feedTimestamp: number | undefined,
): Promise<TripUpdateStats> {
  const tus = entities.filter((e) => e.tripUpdate && e.id);
  if (tus.length === 0) return { tripUpdates: 0, stopTimeUpdates: 0 };

  const parents = tus.map((e) => {
    const tu = e.tripUpdate as Record<string, unknown>;
    const trip = (tu.trip ?? {}) as Record<string, unknown>;
    const vehicle = (tu.vehicle ?? {}) as Record<string, unknown>;
    return {
      fetched_at: fetchedAt.toISOString(),
      feed_timestamp: tsToIso(feedTimestamp),
      entity_id: e.id ?? null,
      trip_id: (trip.tripId as string) ?? null,
      route_id: (trip.routeId as string) ?? null,
      start_date: isoDate(trip.startDate),
      schedule_relationship: (trip.scheduleRelationship as string) ?? null,
      vehicle_id: (vehicle.id as string) ?? null,
    };
  });

  const inserted = await sql<{ id: string; entity_id: string }[]>`
    INSERT INTO trip_updates_raw (
      fetched_at, feed_timestamp, entity_id, trip_id, route_id, start_date,
      schedule_relationship, vehicle_id
    )
    SELECT x.fetched_at, x.feed_timestamp, x.entity_id, x.trip_id, x.route_id,
      x.start_date, x.schedule_relationship, x.vehicle_id
    FROM json_to_recordset(${sql.json(parents)}::json) AS x(
      fetched_at timestamptz, feed_timestamp timestamptz, entity_id text,
      trip_id text, route_id text, start_date date, schedule_relationship text,
      vehicle_id text
    )
    RETURNING id, entity_id
  `;

  const idByEntity = new Map(inserted.map((r) => [r.entity_id, r.id]));

  // JSON-serialized shape passed to json_to_recordset (a type alias, not an
  // interface, so it satisfies postgres.js's index-signatured JSONValue).
  type StopTimeUpdateJson = {
    trip_update_id: string;
    stop_sequence: number | null;
    stop_id: string | null;
    arrival_time: string | null;
    arrival_delay: number | null;
    departure_time: string | null;
    departure_delay: number | null;
    schedule_relationship: string | null;
  };

  const children: StopTimeUpdateJson[] = [];
  for (const e of tus) {
    const parentId = idByEntity.get(e.id as string);
    if (parentId == null) continue;
    const tu = e.tripUpdate as Record<string, unknown>;
    const stus = (tu.stopTimeUpdate as Record<string, unknown>[]) ?? [];
    for (const stu of stus) {
      const arr = (stu.arrival ?? {}) as Record<string, unknown>;
      const dep = (stu.departure ?? {}) as Record<string, unknown>;
      children.push({
        trip_update_id: parentId,
        stop_sequence: (stu.stopSequence as number) ?? null,
        stop_id: (stu.stopId as string) ?? null,
        arrival_time: tsToIso(arr.time),
        arrival_delay: (arr.delay as number) ?? null,
        departure_time: tsToIso(dep.time),
        departure_delay: (dep.delay as number) ?? null,
        schedule_relationship: (stu.scheduleRelationship as string) ?? null,
      });
    }
  }

  if (children.length > 0) {
    await sql`
      INSERT INTO trip_stop_time_updates (
        trip_update_id, stop_sequence, stop_id, arrival_time, arrival_delay,
        departure_time, departure_delay, schedule_relationship
      )
      SELECT x.trip_update_id, x.stop_sequence, x.stop_id, x.arrival_time,
        x.arrival_delay, x.departure_time, x.departure_delay,
        x.schedule_relationship
      FROM json_to_recordset(${sql.json(children)}::json) AS x(
        trip_update_id bigint, stop_sequence int, stop_id text,
        arrival_time timestamptz, arrival_delay int, departure_time timestamptz,
        departure_delay int, schedule_relationship text
      )
    `;
  }

  return { tripUpdates: parents.length, stopTimeUpdates: children.length };
}
