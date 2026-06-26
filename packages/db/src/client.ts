import postgres from "postgres";

// GTFS static loads hold one long transaction open while streaming millions of
// stop_times rows; don't let postgres.js time the connection out.
const common = { idle_timeout: 0, max: 10 } as const;

/**
 * Singleton postgres.js client.
 *
 * In hosted environments (Render) a single `DATABASE_URL` connection string is
 * injected — prefer it and require SSL unless the URL already specifies an
 * `sslmode`. Locally (Docker Compose) we fall back to discrete `POSTGRES_*`
 * vars over a plain connection. Bun loads `.env` automatically.
 */
const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl
  ? postgres(databaseUrl, {
      ...common,
      ssl: /[?&]sslmode=/.test(databaseUrl) ? undefined : "require",
    })
  : postgres({
      ...common,
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.POSTGRES_USER ?? "austintransit",
      password: process.env.POSTGRES_PASSWORD ?? "austintransit",
      database: process.env.POSTGRES_DB ?? "austintransit",
    });

export type Sql = typeof sql;
