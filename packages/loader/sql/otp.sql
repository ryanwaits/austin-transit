-- Network-wide on-time performance over [$1, $2], using CapMetro's official
-- fixed-route (Local/Bus) definition (verified June 2026 against the Performance
-- Dashboards FAQ and Service Standards & Guidelines):
--
--   On-time = the bus DEPARTS no earlier than scheduled and LESS THAN 6 minutes
--   late. Early departures are never on-time; there is no early grace window.
--   Measured on DEPARTURES at timepoints.
--
-- Note: Rapid routes (801, 803, 837, …) use a different, headway-based standard
-- this query does not replicate — segment or exclude them for a clean
-- comparison. Access (paratransit) is out of scope.
--
-- Scheduled side resolves each service_id to concrete dates via the full GTFS
-- calendar model (calendar.txt weekday ranges ± calendar_dates exceptions),
-- which also covers CapMetro's calendar_dates-only publishing.
--
-- Observed side caveat (refine with more data, per the brief): observed
-- departure is MIN(departure_time) — the earliest prediction. Long-term we want
-- the last prediction before actual departure, or the post-hoc reported time.
WITH params AS (
  SELECT
    $1::DATE AS start_date,
    $2::DATE AS end_date,
    $3::TEXT AS route_class, -- 'standard' | 'rapid' | 'all'
    INTERVAL '6 minutes' AS late_threshold
),
date_spine AS (
  SELECT generate_series(
    (SELECT start_date FROM params),
    (SELECT end_date FROM params),
    '1 day'
  )::DATE AS service_date
),
service_dates AS (
  -- Regular calendar.txt matches, excluding explicit removals for that date.
  SELECT c.service_id, d.service_date
  FROM date_spine d
  JOIN static_calendar c
    ON d.service_date BETWEEN c.start_date AND c.end_date
    AND CASE EXTRACT(DOW FROM d.service_date)
      WHEN 0 THEN c.sunday WHEN 1 THEN c.monday WHEN 2 THEN c.tuesday
      WHEN 3 THEN c.wednesday WHEN 4 THEN c.thursday WHEN 5 THEN c.friday
      WHEN 6 THEN c.saturday END = true
  WHERE NOT EXISTS (
    SELECT 1 FROM static_calendar_dates x
    WHERE x.service_id = c.service_id AND x.date = d.service_date AND x.exception_type = 2
  )
  UNION
  -- calendar_dates additions (exception_type=1).
  SELECT cd.service_id, cd.date
  FROM static_calendar_dates cd
  JOIN date_spine d ON d.service_date = cd.date
  WHERE cd.exception_type = 1
),
-- MetroRapid runs on the 800-series route numbers (800/801/803/837) and is
-- measured against a headway-based standard, not scheduled departures. We tag
-- each timepoint's route class and filter so the headline OTP covers only the
-- routes the departures 0/<6 standard actually applies to (Local, Express, and
-- Rail — all of which share that standard per CapMetro's FAQ).
scheduled_timepoints AS (
  SELECT
    t.trip_id,
    t.route_id,
    st.stop_id,
    st.stop_sequence,
    sd.service_date,
    CASE WHEN r.route_short_name ~ '^8[0-9][0-9]$' THEN 'rapid' ELSE 'standard' END AS route_class,
    (sd.service_date::TIMESTAMP + st.departure_time) AT TIME ZONE 'America/Chicago' AS scheduled_departure
  FROM static_trips t
  JOIN service_dates sd ON sd.service_id = t.service_id
  JOIN static_stop_times st USING (trip_id)
  JOIN static_routes r ON r.route_id = t.route_id
  WHERE st.timepoint = 1
    AND st.departure_time IS NOT NULL
    AND (
      (SELECT route_class FROM params) = 'all'
      OR CASE WHEN r.route_short_name ~ '^8[0-9][0-9]$' THEN 'rapid' ELSE 'standard' END
         = (SELECT route_class FROM params)
    )
),
observed_departures AS (
  SELECT
    s.trip_id,
    s.route_id,
    s.stop_id,
    s.stop_sequence,
    s.scheduled_departure,
    MIN(tstu.departure_time) AS observed_departure
  FROM scheduled_timepoints s
  -- Match on the GTFS service date, not scheduled_departure::DATE: the latter
  -- casts a timestamptz in the session TZ (UTC here), so evening Austin trips
  -- would fall onto the next calendar day and miss their trip update.
  LEFT JOIN trip_updates_raw tur
    ON tur.trip_id = s.trip_id
    AND tur.start_date = s.service_date
  LEFT JOIN trip_stop_time_updates tstu
    ON tstu.trip_update_id = tur.id
    AND tstu.stop_id = s.stop_id
    AND tstu.departure_time IS NOT NULL
  GROUP BY s.trip_id, s.route_id, s.stop_id, s.stop_sequence, s.scheduled_departure
),
classified AS (
  SELECT
    *,
    CASE
      WHEN observed_departure IS NULL THEN 'missing'
      -- Any departure before schedule is early (no grace window).
      WHEN observed_departure < scheduled_departure THEN 'early'
      -- 6 minutes late or more is late; on-time is [0, 6) minutes late.
      WHEN observed_departure >= scheduled_departure + (SELECT late_threshold FROM params) THEN 'late'
      ELSE 'on_time'
    END AS classification
  FROM observed_departures
)
SELECT
  classification,
  COUNT(*) AS n,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM classified
GROUP BY classification
ORDER BY classification;
