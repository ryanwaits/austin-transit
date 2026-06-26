// Shared mock source for the same-origin Next route handlers. Deep-imports the
// generated JSON from @at/api so there is a single source of truth (run
// `bun run generate:mocks` to refresh). These handlers mirror the Hono API's
// MOCK_MODE output exactly; production points NEXT_PUBLIC_API_BASE at the real
// service instead.
import otp from "@at/api/src/mocks/otp.json";
import routes from "@at/api/src/mocks/routes.json";
import stops from "@at/api/src/mocks/stops.json";

export const mock = { otp, routes, stops };

const CACHE = "public, max-age=300, s-maxage=3600";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: status === 200 ? { "Cache-Control": CACHE } : {},
  });
}
