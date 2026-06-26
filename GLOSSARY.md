# Glossary

Acronyms, vocabulary, and definitions used across this project. Grouped by
topic. Where a term maps to something concrete in this repo (a table, file, or
column), that's noted.

---

## The big picture (read this first)

This project measures **how on-time CapMetro buses are**, independently, by:

1. Downloading the bus schedule (**static GTFS**) — "where should each bus be, and when?"
2. Continuously recording where buses actually are and what they predict (**GTFS-RT**) — "where is each bus right now, and when does it think it'll arrive?"
3. Comparing the two to compute **OTP** — "what fraction of arrivals were on time?"

---

## Core acronyms

| Term | Stands for | What it means here |
|------|-----------|--------------------|
| **OTP** | On-Time Performance | The headline metric: % of scheduled stops where the bus arrived within the on-time window (1 min early to 5 min late). Computed by `packages/loader/sql/otp.sql`. |
| **GTFS** | General Transit Feed Specification | The industry-standard format for transit data. Has two halves: *static* (the schedule) and *realtime*. |
| **GTFS-RT** / **RT** | GTFS-Realtime | The live half of GTFS — vehicle positions, trip updates, alerts. Updated continuously by the agency. We poll it every 30s. |
| **CapMetro** | Capital Metropolitan Transportation Authority | Austin, TX's public transit agency — the system we're measuring. |
| **CI** | Confidence Interval | A statistical range expressing uncertainty in the OTP %. We use a **Wilson** CI (see below). |
| **PostGIS** | (Postgres + GIS) | A Postgres extension adding geographic types/queries — lets us store bus lat/lon as a real spatial `GEOGRAPHY` point. |
| **GIS** | Geographic Information System | Umbrella term for software that handles spatial/map data. |

---

## GTFS static (the schedule)

The downloaded `.zip` of `.txt` (CSV) files describing the planned service.
Loaded into `static_*` tables by `packages/loader/src/loadStaticGtfs.ts`.

| Term | Meaning | Where |
|------|---------|-------|
| **Agency** | The transit operator. | `static_agency` / `agency.txt` |
| **Route** | A named bus line (e.g. Route 7, the "801 Rapid"). | `static_routes` / `routes.txt` |
| **Trip** | One scheduled run of a route, start to finish, at a specific time. A route has many trips per day. | `static_trips` / `trips.txt` |
| **Stop** | A physical place a bus picks up/drops off, with a lat/lon. | `static_stops` / `stops.txt` |
| **Stop time** | "Trip X is scheduled to reach Stop Y at time Z." The schedule's finest grain — millions of rows. | `static_stop_times` / `stop_times.txt` |
| **Stop sequence** | The order of a stop within a trip (1st stop, 2nd stop, …). | `stop_sequence` |
| **Timepoint** | A stop where the schedule is *officially held* — the points OTP is measured against. `timepoint = 1` means "this is an official timing stop." Not every stop is a timepoint. | `static_stop_times.timepoint` |
| **Service ID** | An identifier for *when* a trip runs (e.g. "weekdays," "Saturdays"). Links a trip to a calendar. | `service_id` |
| **Calendar** | Defines which weekdays a service_id runs, over a date range. **CapMetro doesn't use this file.** | `static_calendar` / `calendar.txt` |
| **Calendar dates** | Per-date exceptions to the calendar. CapMetro defines *all* its service here. `exception_type=1` = service added on that date; `=2` = removed. | `static_calendar_dates` / `calendar_dates.txt` |
| **Service date** | The calendar day a trip "belongs to." Important because a trip starting 11:50 PM runs into the next clock day but still counts as the earlier service date. | `service_date` in the OTP query |
| **Headsign** | The destination text shown on the front of the bus. | `trip_headsign` |
| **Direction ID** | 0 or 1 — which way along the route (e.g. inbound vs. outbound). | `direction_id` |
| **Shape** | The drawn path (polyline) a trip follows on the map. | `shape_id` |

---

## GTFS-Realtime (the live feeds)

Binary **protobuf** messages we fetch every 30s and decode in
`packages/poller`. Three feed types exist; we use the first two.

| Term | Meaning | Where |
|------|---------|-------|
| **Vehicle position** | A single bus's current location, heading, speed, and status at a moment in time. | `vehicle_positions_raw` |
| **Trip update** | A bus's predictions: for its current trip, when it now expects to reach upcoming stops (and how early/late). | `trip_updates_raw` |
| **Stop-time update** | One prediction inside a trip update: "for stop Y, new arrival time is Z (delay = N seconds)." A trip update contains many of these. | `trip_stop_time_updates` |
| **Service alert** | Free-text disruption notices (detours, delays). We don't ingest these. | — |
| **Feed message** | The top-level container of one decoded RT response. | decoded in `fetchFeed.ts` |
| **Feed entity** | One item inside a feed message — wraps a single vehicle position *or* trip update. | `entity_id` |
| **Feed timestamp** | When the agency generated the feed (vs. `fetched_at` = when *we* downloaded it). | `feed_timestamp` |
| **Schedule relationship** | Whether a trip/stop is running as `SCHEDULED`, `ADDED`, `CANCELED`, `SKIPPED`, etc. | `schedule_relationship` |
| **Current status** | A vehicle's relationship to its next stop: `INCOMING_AT`, `STOPPED_AT`, `IN_TRANSIT_TO`. | `current_status` |
| **Occupancy / congestion** | How full the bus is / how stuck in traffic. Captured but not yet used. | `occupancy_status`, `congestion_level` |
| **Delay** | Seconds a bus is behind (positive) or ahead (negative) of schedule, as predicted by the feed. | `arrival_delay`, `departure_delay` |
| **Protobuf** | "Protocol Buffers" — Google's compact binary serialization format. The RT feeds ship as protobuf, not JSON; we decode with `gtfs-realtime-bindings`. | `fetchFeed.ts` |

---

## OTP computation

How `otp.sql` turns schedule + observations into the metric.

| Term | Meaning |
|------|---------|
| **Scheduled arrival** | When the schedule says the bus *should* arrive at a timepoint. |
| **Observed arrival** | When the RT feed indicates the bus *actually* (or predictively) arrived. |
| **On-time window** | The tolerance band. Here: more than 1 min early → `early`; more than 5 min late → `late`; in between → `on_time`. |
| **Classification** | Each scheduled timepoint is bucketed into one of: `on_time`, `early`, `late`, or `missing`. |
| **Missing** | A scheduled timepoint we have *no* RT observation for. Expected to be high until enough data is collected. |
| **Observed (non-missing)** | The denominator for OTP: `early + on_time + late`. Excludes `missing`. |
| **Wilson score interval** | A statistically sound 95% confidence interval for a percentage (proportion). More accurate than the naïve formula for small samples or extreme values. Implemented in `packages/loader/src/wilsonCi.ts`. |

---

## Stack & tooling

| Term | Meaning |
|------|---------|
| **Bun** | The JavaScript/TypeScript runtime, package manager, and bundler used throughout — replaces Node + npm + tsc. |
| **TypeScript / TS** | Typed JavaScript. All source is `.ts`, run directly by Bun. |
| **ESM** | ECMAScript Modules — the `import`/`export` module system (vs. older CommonJS `require`). |
| **Monorepo** | One repository holding multiple packages (`db`, `poller`, `loader`) that share code. |
| **Workspace** | One package inside the monorepo. Managed by Bun workspaces. |
| **Postgres** | The relational database storing everything. Version 16. |
| **`postgres` (postgres.js)** | The Node/Bun client library we use to talk to Postgres (Porsager's). |
| **Migration** | A versioned `.sql` file that changes the DB schema. Applied in order by `packages/db/src/migrate.ts`; tracked in the `_migrations` table. |
| **COPY** | Postgres's bulk-load command — streams millions of CSV rows far faster than row-by-row `INSERT`. Used by the static loader. |
| **INTERVAL** | A Postgres duration type. GTFS times can exceed 24:00:00 (e.g. `25:30:00` for an after-midnight trip), so arrival/departure times are stored as INTERVAL, not TIME. |
| **GEOGRAPHY(POINT, 4326)** | A PostGIS spatial type: a lat/lon point. `4326` = the WGS-84 coordinate system (standard GPS lat/lon). |
| **GIST index** | A Postgres index type that makes spatial (PostGIS) queries fast. |
| **Docker / Docker Compose** | Containerization. `docker compose up` runs Postgres + the poller as isolated services. |
| **Poller** | Our long-running process that fetches and stores the RT feeds on a loop. `packages/poller`. |
| **Loader** | Our process that downloads and loads the static schedule, plus the OTP CLI. `packages/loader`. |
| **Biome** | The linter + formatter (replaces ESLint + Prettier). |
| **fflate** | The library that unzips the static GTFS archive in memory. |
| **csv-parse** | The library that streams CSV rows out of the GTFS `.txt` files. |
| **R2** | Cloudflare's S3-compatible object storage. We archive each poll's raw protobuf here — cheap, durable, zero egress. The complete forensic record (replaces the old `raw` JSONB column). |
| **S3-compatible** | Speaks the same API as Amazon S3, so the same client code works against R2. We use Bun's built-in S3 client. |
| **System of record** | The authoritative, complete copy of the data (here: R2). Postgres is a *derived* store — rebuildable by replaying R2. |
| **Replay** | Re-reading the R2 archive to rebuild or recompute Postgres (e.g. after changing the OTP definition or extracting a new field). |
| **`raw` (JSONB)** | *(removed in migration 005)* Formerly a column storing the entire decoded message for forensics; superseded by the R2 protobuf archive. |
| **CDT / CST** | Central Daylight/Standard Time — Austin's timezone (`America/Chicago`). The schedule's clock times are interpreted in this zone. |
| **UTC** | Coordinated Universal Time — the timezone Postgres timestamps default to. Mixing UTC and CDT carelessly caused (and we fixed) a join bug in the OTP query. |
