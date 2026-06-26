import { S3Client } from "bun";

// Cloudflare R2 archive of the raw protobuf feeds. R2 is S3-compatible, so we
// use Bun's built-in S3 client — no extra dependency. Archiving is the system
// of record: the complete, immutable, replayable feed. Postgres holds only the
// typed columns OTP needs (the `raw` JSONB was dropped in migration 005).
//
// Enabled only when all R2_* vars are present; otherwise every call is a no-op
// so local/Render-without-R2 runs work unchanged.
const accountId = process.env.R2_ACCOUNT_ID;
const endpoint =
  process.env.R2_ENDPOINT ??
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

export const archivingEnabled = Boolean(endpoint && accessKeyId && secretAccessKey && bucket);

const client = archivingEnabled
  ? new S3Client({ endpoint, accessKeyId, secretAccessKey, bucket, region: "auto" })
  : null;

export type FeedKind = "vehicle" | "trip_update";

// e.g. vehicle/2026/06/26/030007449.pb — sortable, partitioned by date.
function objectKey(kind: FeedKind, at: Date): string {
  const iso = at.toISOString(); // 2026-06-26T03:00:07.449Z
  const [date, time] = iso.split("T");
  const [y, m, d] = (date ?? "").split("-");
  const hms = (time ?? "").replace(/[:.]/g, "").slice(0, 9); // HHMMSSmmm
  return `${kind}/${y}/${m}/${d}/${hms}.pb`;
}

/**
 * Write one feed's raw protobuf bytes to R2. Best-effort: the caller treats a
 * rejection as non-fatal (logs and keeps polling) so an archive outage never
 * stops ingestion.
 */
export async function archiveFeed(kind: FeedKind, at: Date, bytes: Uint8Array): Promise<void> {
  if (!client) return;
  await client.write(objectKey(kind, at), bytes, { type: "application/octet-stream" });
}
