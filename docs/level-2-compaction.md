# Design note: Level 2 — trip-stop-update compaction

Status: **proposed, not implemented.** Companion to the R2 archive (Level 1),
which is built. Read the "Raw feed archive" section of the README first.

## Problem

`trip_stop_time_updates` is the volume driver: every 30s poll inserts ~8k child
rows, and consecutive polls re-record near-identical predictions for the same
stops. Over a week that's **~175M rows**, of which ~99% are redundant for
analysis. We keep appending the full prediction history to Postgres even though
the complete raw history already lives in R2.

## What OTP actually needs

Per trip instance and stop, OTP needs **one** best observed value — the latest
prediction before the bus passed (the brief's stated goal; today `otp.sql` uses
`MIN(departure_time)` as a placeholder, which is explicitly flagged as wrong
long-term). A trip instance is identified by `(trip_id, start_date)`; a stop
within it by `stop_sequence` (unique per trip; `stop_id` can repeat on loops).

The "last seen" prediction across all polls is a good proxy for the final one:
GTFS-RT trip updates refine their estimate as the bus approaches, then drop the
stop from later messages once passed. So the most recently observed prediction
for a `(trip_id, start_date, stop_sequence)` ≈ its final prediction.

## Approach: upsert on ingest (recommended)

Replace the append into `trip_stop_time_updates` with an **upsert** into a new
`trip_stop_observations` table keyed `(trip_id, start_date, stop_sequence)`,
keeping the latest prediction. Postgres then holds one row per observed
trip-stop instance at all times — no background job, no storage spikes.

Considered and rejected: **append + periodic compaction job** (keep appending
raw, roll up + prune on a cron). It still lets the volume hit Postgres
transiently and adds a watermark/prune job. Since R2 already holds the full
history, there's no reason to append it to Postgres at all — upsert-on-ingest is
simpler and minimal at every moment. The only thing given up — in-Postgres
analysis of how predictions *evolve* — is recoverable by replaying R2.

## Schema (migration 006)

```sql
CREATE TABLE trip_stop_observations (
  trip_id               TEXT NOT NULL,
  start_date            DATE NOT NULL,
  stop_sequence         INT  NOT NULL,
  stop_id               TEXT,
  -- latest observed prediction:
  arrival_time          TIMESTAMPTZ,
  arrival_delay         INT,
  departure_time        TIMESTAMPTZ,
  departure_delay       INT,
  schedule_relationship TEXT,
  -- provenance / diagnostics:
  first_seen_at         TIMESTAMPTZ NOT NULL,
  last_seen_at          TIMESTAMPTZ NOT NULL,
  observation_count     INT NOT NULL DEFAULT 1,
  PRIMARY KEY (trip_id, start_date, stop_sequence)
);
CREATE INDEX ON trip_stop_observations (start_date, stop_id);
```

## Upsert SQL (per poll)

```sql
INSERT INTO trip_stop_observations AS o (
  trip_id, start_date, stop_sequence, stop_id,
  arrival_time, arrival_delay, departure_time, departure_delay,
  schedule_relationship, first_seen_at, last_seen_at, observation_count
)
SELECT x.trip_id, x.start_date, x.stop_sequence, x.stop_id,
  x.arrival_time, x.arrival_delay, x.departure_time, x.departure_delay,
  x.schedule_relationship, x.fetched_at, x.fetched_at, 1
FROM json_to_recordset($1::json) AS x( ... )
ON CONFLICT (trip_id, start_date, stop_sequence) DO UPDATE SET
  stop_id               = EXCLUDED.stop_id,
  arrival_time          = EXCLUDED.arrival_time,
  arrival_delay         = EXCLUDED.arrival_delay,
  departure_time        = EXCLUDED.departure_time,
  departure_delay       = EXCLUDED.departure_delay,
  schedule_relationship = EXCLUDED.schedule_relationship,
  last_seen_at          = EXCLUDED.last_seen_at,
  observation_count     = o.observation_count + 1
WHERE EXCLUDED.last_seen_at >= o.last_seen_at;  -- only move forward in time
```

`first_seen_at` is intentionally not in the `SET` list (preserved). The
`WHERE` guard makes out-of-order writes (retries) safe.

**Gotcha:** Postgres errors if one `INSERT … ON CONFLICT` touches the same key
twice. A stop can appear more than once in a single poll (multiple trip-update
entities for the same trip, or a feed quirk), so the poller must **dedupe the
batch by `(trip_id, start_date, stop_sequence)` keeping the last** before the
upsert (a `Map` keyed on those three fields).

## Poller change

In `writeTripUpdates.ts`, the children currently carry only `trip_update_id` +
stop fields. Denormalize the parent's `trip_id` and `start_date` onto each child
(both are already in scope when building `parents`), dedupe per key, and upsert.

This also lets us **stop writing `trip_updates_raw` and `trip_stop_time_updates`
entirely** — OTP doesn't need the parent rows, and the id-mapping dance
(insert parents → map by `entity_id` → attach children) disappears. Trip-level
fields (route_id, vehicle_id, trip-level schedule_relationship) remain available
in R2 if ever needed. Net: the poller gets *simpler*, not just leaner.

## OTP query change

The `observed_departures` CTE drops the `trip_updates_raw` join and the `MIN`,
joining directly:

```sql
LEFT JOIN trip_stop_observations o
  ON o.trip_id    = s.trip_id
  AND o.start_date = s.service_date
  AND o.stop_id    = s.stop_id
-- observed_departure = o.departure_time   (the last prediction, not MIN)
```

This resolves the brief's "we want the last prediction, not MIN" caveat as a
side effect, and the query gets faster (one fewer big join).

## Volume estimate

Each `(trip_id, start_date, stop)` is re-observed across roughly 60–120 polls
(a trip is predicted from when its update appears until the bus passes). So:

- **All observed stops:** ~175M ÷ ~100 ≈ **~1.5–2M rows/week** (~100× reduction).
- **Timepoints only** (if we pre-filter to `timepoint = 1`, which is all OTP
  strictly needs): roughly another ~5–6× smaller, **~300k rows/week**.

Recommend storing **all observed stops** — still a ~100× cut, and it keeps the
data useful for non-timepoint analysis without re-deriving from R2.

## Risks & open questions

- **Predicted vs actual.** "Last seen prediction" is a proxy for the actual
  departure. Verify whether CapMetro's feed emits a settled/actual time (e.g. a
  final `SCHEDULE_RELATIONSHIP` or a stable record after passage) or simply drops
  the stop. If it just drops it, OTP is computed from final *predictions*, which
  can differ from truth — document this clearly in the headline.
- **`SKIPPED` / `NO_DATA`** stop relationships must be retained so OTP can treat
  them correctly rather than as on-time.
- **Loss of churn analysis** in Postgres — accepted; replay R2 if needed.
- **Backfill** of existing `trip_stop_time_updates` is optional: roll up once via
  `DISTINCT ON (trip_id, start_date, stop_sequence) … ORDER BY … fetched_at DESC`,
  or just start fresh since R2 (once enabled) holds history.

## Rollout (atomic, committable steps)

1. **Migration 006** — create `trip_stop_observations` + index. → validates: migration applies; table present.
2. **Poller upsert** — denormalize trip_id/start_date onto children, dedupe per key, upsert into the new table (keep old writes for now). → validates: rows accumulate; `observation_count` grows for an active trip across polls.
3. **Switch `otp.sql`** to read from `trip_stop_observations`. → validates: OTP on an overlapping window matches the pre-change number within noise.
4. **Stop writing** `trip_updates_raw` / `trip_stop_time_updates`; simplify `writeTripUpdates`. → validates: poll log unchanged; new table still filling; no FK errors.
5. **Migration 007 (optional)** — drop the two legacy tables once confident. → validates: schema clean; OTP still runs.

## When to do this

Not during the current collection week (don't disturb a running measurement).
Trigger it if Postgres storage/cost becomes a real constraint, or before scaling
the run beyond ~1–2 weeks. Until then, Level 1 (R2 archive + lean parent tables)
is sufficient and the full history is safe in R2 regardless.
