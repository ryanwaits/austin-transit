import { Hono } from "hono";
import { env } from "../env.ts";

export const health = new Hono();

health.get("/health", (c) =>
  c.json({ ok: true, mock_mode: env.MOCK_MODE, time: new Date().toISOString() }),
);
