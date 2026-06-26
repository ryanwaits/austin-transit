-- The complete forensic record now lives in Cloudflare R2 as the original
-- protobuf (see packages/poller/src/archiveR2.ts), so the per-row `raw` JSONB
-- in Postgres is redundant and was the main storage driver on these tables.
-- Drop it; Postgres keeps only the typed columns the OTP analysis queries.
ALTER TABLE vehicle_positions_raw DROP COLUMN IF EXISTS raw;
ALTER TABLE trip_updates_raw DROP COLUMN IF EXISTS raw;
