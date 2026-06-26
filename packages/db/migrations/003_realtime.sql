CREATE TABLE vehicle_positions_raw (
  id BIGSERIAL PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL,
  feed_timestamp TIMESTAMPTZ,
  entity_id TEXT,
  vehicle_id TEXT,
  trip_id TEXT,
  route_id TEXT,
  start_date DATE,
  position GEOGRAPHY(POINT, 4326),
  bearing REAL,
  speed REAL,
  current_stop_sequence INT,
  current_status TEXT,
  congestion_level TEXT,
  occupancy_status TEXT,
  raw JSONB
);

CREATE TABLE trip_updates_raw (
  id BIGSERIAL PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL,
  feed_timestamp TIMESTAMPTZ,
  entity_id TEXT,
  trip_id TEXT,
  route_id TEXT,
  start_date DATE,
  schedule_relationship TEXT,
  vehicle_id TEXT,
  raw JSONB
);

CREATE TABLE trip_stop_time_updates (
  id BIGSERIAL PRIMARY KEY,
  trip_update_id BIGINT REFERENCES trip_updates_raw(id) ON DELETE CASCADE,
  stop_sequence INT,
  stop_id TEXT,
  arrival_time TIMESTAMPTZ,
  arrival_delay INT,
  departure_time TIMESTAMPTZ,
  departure_delay INT,
  schedule_relationship TEXT
);
