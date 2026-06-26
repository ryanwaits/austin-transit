# Austin Transit — CapMetro OTP Measurement

Independently measures CapMetro (Austin, TX) bus on-time performance (OTP) by
ingesting GTFS-Realtime feeds every 30s, joining against the static GTFS
schedule, and computing OTP over an arbitrary date range.

New to the domain? **[`GLOSSARY.md`](./GLOSSARY.md)** defines every acronym and
term (OTP, GTFS, RT, timepoint, PostGIS, …) and maps each to where it lives in
the code.

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- Docker + Docker Compose (for Postgres 16 + PostGIS, and the poller container)

## Layout

```
packages/db      shared postgres.js client, SQL migrations, migration runner
packages/poller  long-running GTFS-RT ingester (vehicle positions + trip updates)
packages/loader  static GTFS loader + OTP analysis CLI
tools            one-off scripts (feed URL verification)
```

## Setup

```bash
cp .env.example .env        # feed URLs are pre-verified against data.texas.gov
bun install                 # installs every workspace
bun run verify:feeds        # confirms all three feed URLs return 200
```

## Run

```bash
# 1. Bring up Postgres + the poller (poller runs migrations on startup,
#    then fetches both RT feeds every POLL_INTERVAL_MS and writes raw rows).
docker compose up -d
docker compose logs -f poller          # watch poll lines

# 2. Load the static GTFS schedule (downloads zip, streams CSVs via COPY).
bun run load:static

# 3. Compute OTP over a date range.
bun run compute:otp -- --start 2026-06-26 --end 2026-06-26
```

To run the poller locally instead of in Docker (Postgres still in Docker):

```bash
docker compose up -d postgres
bun run migrate
bun run poll
```

## Query the data

```bash
# row counts after the poller has run a while
docker compose exec postgres psql -U austintransit -d austintransit \
  -c "SELECT count(*) FROM vehicle_positions_raw;"

# recent vehicle positions
docker compose exec postgres psql -U austintransit -d austintransit \
  -c "SELECT fetched_at, route_id, trip_id FROM vehicle_positions_raw ORDER BY id DESC LIMIT 10;"
```

## Raw feed archive (Cloudflare R2)

The system splits the *record* from the *query store*:

- **R2 = system of record.** Each poll's original protobuf bytes are written to
  R2 (`vehicle/YYYY/MM/DD/HHMMSSmmm.pb`, same for `trip_update/`) — a complete,
  immutable, replayable archive. ~5 GB/week, effectively free (zero egress).
- **Postgres = lean, rebuildable analytical store.** Only the typed columns OTP
  needs; the `raw` JSONB was dropped (migration 005). If a field wasn't
  extracted, or the definition changes, replay from R2.

Archiving uses Bun's built-in S3 client (no dependency) and is **off unless all
`R2_*` vars are set** — the poller logs which mode it's in at startup. To enable,
create an R2 bucket + API token and set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (see `.env.example`). Writes are best-effort:
an R2 outage is logged but never blocks ingestion.

> **Follow-up (not yet built):** `trip_stop_time_updates` re-records ~identical
> predictions every 30s (~175M rows/week). A future "compaction" mode would
> upsert only the latest prediction per (trip, service_date, stop) — a ~100×
> cut — while the full history stays in R2. Full design:
> [`docs/level-2-compaction.md`](./docs/level-2-compaction.md).

## Deploy to Render (continuous hosting)

`render.yaml` is a Blueprint that provisions the whole stack: a PostGIS
database, the always-on poller (Background Worker), and a weekly cron job that
reloads the static schedule.

1. Push this repo to GitHub/GitLab.
2. Render dashboard → **New → Blueprint** → point at the repo. It reads
   `render.yaml` and creates `austin-transit-db`, `-poller`, and `-loader`.
3. The DB connection is injected as `DATABASE_URL` (SSL); the poller runs
   migrations on first boot (including `CREATE EXTENSION postgis`).
4. Trigger the `austin-transit-loader` cron once manually to do the initial
   static load, then it repeats weekly.

Both Docker services build from `Dockerfile.poller` / `Dockerfile.loader`. The
DB client (`packages/db/src/client.ts`) uses `DATABASE_URL` when present and
falls back to local `POSTGRES_*` vars otherwise, so the same code runs locally
and on Render.

> **Storage:** the realtime tables grow ~tens of GB/week. Size the database disk
> for the full collection window, or trim the `raw` JSONB to shrink it.

## OTP methodology

A scheduled timepoint is classified against its observed time, then
OTP = `on_time / (early + on_time + late)` (missing excluded), reported with a
Wilson score 95% confidence interval.

### CapMetro's official definition (confirmed, June 2026)

Verified against CapMetro's
[Performance Dashboards FAQ](https://www.capmetro.org/dashboards/performance-dashboards-faq)
and [Service Standards & Guidelines](https://www.capmetro.org/plans-development/service-standards-and-guidelines):

- **Local/Bus:** on-time = the bus **departs** no earlier than scheduled and
  **less than 6 minutes late**. So the window is **0 min early / <6 min late, on
  departures** — early departures are never on-time.
- **Rapid** (801, 803, 837, …): a *different*, headway-based metric (arrival
  within the headway plus the lesser of 5 min or 50% of headway). This query
  does not replicate it; exclude Rapid routes or treat them separately for an
  apples-to-apples comparison.
- **Access** (paratransit): pickup within −15 / +15 min of the negotiated time.
  Out of scope here.

`otp.sql` implements the **Local/Bus** definition: classifies **departures** at
timepoints as `early` (before schedule, no grace), `on_time` ([0, 6) min late),
`late` (≥6 min), or `missing`. The poller stores both arrival *and* departure
times/delays, so the definition can be re-tuned at analysis time without
re-collecting.

**Route segmentation.** MetroRapid (the 800-series: 800/801/803/837) is measured
against a different, headway-based standard, so `compute:otp` excludes it by
default. Use `--routes`:

```bash
bun run compute:otp -- --start 2026-06-26 --end 2026-06-26                  # standard (default; Local/Express/Rail)
bun run compute:otp -- --start 2026-06-26 --end 2026-06-26 --routes rapid   # 800-series only (departures window NOT valid — reference only)
bun run compute:otp -- --start 2026-06-26 --end 2026-06-26 --routes all     # blended
```

The headline OTP for comparison against CapMetro should use `--routes standard`.
Rapid still needs its own headway-based metric implemented before a like-for-like
Rapid comparison.

### Data notes (verified against the live feeds)

- **CapMetro publishes no `calendar.txt`** — every `service_id` is defined
  purely through `calendar_dates.txt` (exception_type=1). The query resolves
  service dates via the full GTFS model (calendar weekday ranges ± calendar_dates
  exceptions), so it works for both publishing styles.
- **Join key confirmed:** `trip_updates_raw.trip_id` matches
  `static_trips.trip_id` 1:1, and trips are matched on the GTFS **service date**
  (`trip_updates_raw.start_date = service_date`) rather than a timezone-sensitive
  `::DATE` cast of the scheduled timestamp.
- **Still open (refine with a few days of data):** the observed arrival uses
  `MIN(arrival_time)` (earliest prediction); long-term we want the last
  prediction before actual arrival, or the post-hoc reported time. With only a
  short collection window, most timepoints are `missing` — coverage fills in
  across the week.

## Tests

```bash
bun test                    # Wilson CI math; INTERVAL parsing (needs Postgres up)
```

## Config

All config is environment-driven (`.env`, auto-loaded by Bun). See
`.env.example` for the full list (Postgres connection, feed URLs, poll
interval).
