import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./client.ts";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/**
 * Apply any pending SQL migrations in filename order. Idempotent: each file is
 * recorded in `_migrations` once applied, so re-running is a no-op. Each
 * migration runs inside its own transaction.
 */
export async function runMigrations(): Promise<string[]> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  const applied = await sql<{ name: string }[]>`SELECT name FROM _migrations`;
  const done = new Set(applied.map((r) => r.name));

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const text = await Bun.file(join(MIGRATIONS_DIR, file)).text();
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    newlyApplied.push(file);
    console.log(`[migrate] applied ${file}`);
  }

  if (newlyApplied.length === 0) console.log("[migrate] up to date");
  return newlyApplied;
}

// Allow running directly: `bun run src/migrate.ts`
if (import.meta.main) {
  await runMigrations();
  await sql.end();
}
