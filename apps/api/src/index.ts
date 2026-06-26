import { Hono } from "hono";
import { cors } from "hono/cors";
import { NotWiredError } from "./data.ts";
import { env } from "./env.ts";
import { health } from "./routes/health.ts";
import { otp } from "./routes/otp.ts";
import { routes } from "./routes/routes.ts";
import { subscribe } from "./routes/subscribe.ts";

const app = new Hono();

app.use("*", cors({ origin: env.ALLOWED_ORIGINS, allowMethods: ["GET", "POST", "OPTIONS"] }));

// Aggressive caching for the read-only GET endpoints (skipped for POST/errors).
app.use("/v1/*", async (c, next) => {
  await next();
  if (c.req.method === "GET" && c.res.status === 200) {
    c.res.headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  }
});

const v1 = new Hono();
v1.route("/", health);
v1.route("/", otp);
v1.route("/", routes);
v1.route("/", subscribe);
app.route("/v1", v1);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  if (err instanceof NotWiredError) return c.json({ error: err.message }, 501);
  console.error("[api] error:", err);
  return c.json({ error: "internal_error" }, 500);
});

console.log(`[api] listening on :${env.PORT} (MOCK_MODE=${env.MOCK_MODE})`);

export default { port: env.PORT, fetch: app.fetch };
