// Shared row types. Mirrors the realtime tables in migrations/003_realtime.sql.
// Kept loose (most fields nullable) because GTFS-RT feeds are sparse.

export interface VehiclePositionRow {
  fetched_at: Date;
  feed_timestamp: Date | null;
  entity_id: string | null;
  vehicle_id: string | null;
  trip_id: string | null;
  route_id: string | null;
  start_date: string | null;
  lon: number | null;
  lat: number | null;
  bearing: number | null;
  speed: number | null;
  current_stop_sequence: number | null;
  current_status: string | null;
  congestion_level: string | null;
  occupancy_status: string | null;
}

export interface TripUpdateRow {
  fetched_at: Date;
  feed_timestamp: Date | null;
  entity_id: string | null;
  trip_id: string | null;
  route_id: string | null;
  start_date: string | null;
  schedule_relationship: string | null;
  vehicle_id: string | null;
}

export interface StopTimeUpdateRow {
  stop_sequence: number | null;
  stop_id: string | null;
  arrival_time: Date | null;
  arrival_delay: number | null;
  departure_time: Date | null;
  departure_delay: number | null;
  schedule_relationship: string | null;
}
