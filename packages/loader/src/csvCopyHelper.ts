import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Sql, Tx } from "@at/db";
import { parse } from "csv-parse";

// Quote a field for Postgres COPY ... FORMAT csv. An empty/absent value is
// emitted as a bare (unquoted) empty field, which COPY reads as NULL — exactly
// what we want for missing GTFS columns. Present values are always quoted so
// commas, quotes, and newlines in stop/route names can't corrupt the stream.
function csvField(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  return `"${String(v).replace(/"/g, '""')}"`;
}

/**
 * Stream a GTFS CSV file into a Postgres table via COPY FROM STDIN. The file
 * bytes are parsed row-by-row and re-emitted as a clean CSV containing only the
 * requested columns (in order), so files with extra/missing columns load fine.
 * Nothing is buffered into a JS array — stop_times.txt (millions of rows)
 * streams straight through. Runs on the passed `sql`, which may be a
 * transaction handle. Returns the number of data rows copied.
 */
export async function copyCsv(
  sql: Sql | Tx,
  table: string,
  columns: readonly string[],
  bytes: Uint8Array,
): Promise<number> {
  let rowCount = 0;

  const source = Readable.from(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  const parser = parse({
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  const toCsv = new Transform({
    writableObjectMode: true,
    transform(record: Record<string, string>, _enc, cb) {
      rowCount++;
      cb(null, `${columns.map((c) => csvField(record[c])).join(",")}\n`);
    },
  });

  const colList = columns.map((c) => `"${c}"`).join(", ");
  // table/columns come from a fixed internal map, never user input.
  const writable = await sql
    .unsafe(`COPY ${table} (${colList}) FROM STDIN WITH (FORMAT csv)`)
    .writable();

  await pipeline(source, parser, toCsv, writable);
  return rowCount;
}
