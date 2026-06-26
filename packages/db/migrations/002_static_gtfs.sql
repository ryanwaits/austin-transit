-- Static GTFS schedule tables. Columns mirror the GTFS spec generously so we
-- don't have to migrate when we start using more fields. See gtfs.org/schedule.

CREATE TABLE static_agency (
  agency_id       TEXT PRIMARY KEY,
  agency_name     TEXT,
  agency_url      TEXT,
  agency_timezone TEXT,
  agency_lang     TEXT,
  agency_phone    TEXT,
  agency_fare_url TEXT,
  agency_email    TEXT
);

CREATE TABLE static_stops (
  stop_id              TEXT PRIMARY KEY,
  stop_code            TEXT,
  stop_name            TEXT,
  stop_desc            TEXT,
  stop_lat             DOUBLE PRECISION,
  stop_lon             DOUBLE PRECISION,
  location             GEOGRAPHY(POINT, 4326),
  zone_id              TEXT,
  stop_url             TEXT,
  location_type        INT,
  parent_station       TEXT,
  stop_timezone        TEXT,
  wheelchair_boarding  INT,
  level_id             TEXT,
  platform_code        TEXT
);

CREATE TABLE static_routes (
  route_id          TEXT PRIMARY KEY,
  agency_id         TEXT,
  route_short_name  TEXT,
  route_long_name   TEXT,
  route_desc        TEXT,
  route_type        INT,
  route_url         TEXT,
  route_color       TEXT,
  route_text_color  TEXT,
  route_sort_order  INT
);

CREATE TABLE static_trips (
  trip_id                TEXT PRIMARY KEY,
  route_id               TEXT,
  service_id             TEXT,
  trip_headsign          TEXT,
  trip_short_name        TEXT,
  direction_id           INT,
  block_id               TEXT,
  shape_id               TEXT,
  wheelchair_accessible  INT,
  bikes_allowed          INT
);

-- GTFS times routinely exceed 24:00:00 (e.g. 25:30:00 for a service-day trip
-- that runs past midnight). INTERVAL stores these losslessly; TIME would not.
CREATE TABLE static_stop_times (
  trip_id              TEXT,
  arrival_time         INTERVAL,
  departure_time       INTERVAL,
  stop_id              TEXT,
  stop_sequence        INT,
  stop_headsign        TEXT,
  pickup_type          INT,
  drop_off_type        INT,
  shape_dist_traveled  DOUBLE PRECISION,
  timepoint            INT,
  PRIMARY KEY (trip_id, stop_sequence)
);

CREATE TABLE static_calendar (
  service_id  TEXT PRIMARY KEY,
  monday      BOOLEAN,
  tuesday     BOOLEAN,
  wednesday   BOOLEAN,
  thursday    BOOLEAN,
  friday      BOOLEAN,
  saturday    BOOLEAN,
  sunday      BOOLEAN,
  start_date  DATE,
  end_date    DATE
);

CREATE TABLE static_calendar_dates (
  service_id      TEXT,
  date            DATE,
  exception_type  INT,
  PRIMARY KEY (service_id, date)
);

-- Bookkeeping: one row per static GTFS reload.
CREATE TABLE static_gtfs_loads (
  id          SERIAL PRIMARY KEY,
  loaded_at   TIMESTAMPTZ DEFAULT NOW(),
  source_url  TEXT,
  file_count  INT,
  row_counts  JSONB
);

CREATE INDEX static_stops_location_gix ON static_stops USING GIST (location);
