import { json, mock } from "../../_mock";

export function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("bbox");
  if (!raw) return json(mock.stops);

  const p = raw.split(",").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return json(mock.stops);
  const [minLon, minLat, maxLon, maxLat] = p as [number, number, number, number];

  return json({
    type: "FeatureCollection",
    features: mock.stops.features.filter((f) => {
      const [lon, lat] = f.geometry.coordinates as [number, number];
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    }),
  });
}
