import { Hono } from "hono";
import { getRoutesGeojson, getStopsGeojson } from "../data.ts";

export const routes = new Hono();

routes.get("/routes/geojson", async (c) => c.json(await getRoutesGeojson()));

routes.get("/stops/geojson", async (c) => {
  const raw = c.req.query("bbox");
  let bbox: [number, number, number, number] | undefined;
  if (raw) {
    const p = raw.split(",").map(Number);
    if (p.length === 4 && p.every((n) => !Number.isNaN(n))) {
      bbox = p as [number, number, number, number];
    }
  }
  return c.json(await getStopsGeojson(bbox));
});
