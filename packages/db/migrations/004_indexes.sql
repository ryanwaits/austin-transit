CREATE INDEX ON vehicle_positions_raw (fetched_at);
CREATE INDEX ON vehicle_positions_raw (trip_id, fetched_at);
CREATE INDEX ON vehicle_positions_raw (route_id, fetched_at);
CREATE INDEX ON vehicle_positions_raw USING GIST (position);
CREATE INDEX ON trip_updates_raw (fetched_at);
CREATE INDEX ON trip_updates_raw (trip_id, fetched_at);
CREATE INDEX ON trip_stop_time_updates (trip_update_id);
CREATE INDEX ON trip_stop_time_updates (stop_id);
