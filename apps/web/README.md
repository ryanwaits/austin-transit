# @at/web — Public visual-essay frontend

Next.js 16 (App Router, React 19) editorial site. Pudding-style data journalism,
not a dashboard. Design system lives in `../../DESIGN.md`; tokens in
`src/app/globals.css`.

## Develop

From the **repo root**:

```bash
bun install
bun run generate:mocks     # writes apps/api/src/mocks/*.json (deterministic)
bun run dev:api            # Hono API on :4000  (optional — see data sources)
bun run dev:web            # Next.js on :3000
# or both in parallel:
bun run dev
```

Open http://localhost:3000 — the home lists one essay, `/equity-reliability`.

### Data sources

The frontend reads `NEXT_PUBLIC_API_BASE` (default `/api/v1`). Two modes:

- **Default (`/api/v1`)** — same-origin Next route handlers re-serve the
  generated mock JSON. Self-contained: no API process needed, works on Vercel.
- **Against the Hono API** — set `NEXT_PUBLIC_API_BASE=http://localhost:4000/v1`
  and run `bun run dev:api` to integration-test the real service. When Sprint 1
  data lands, point this at the deployed API with `MOCK_MODE=false`.

Server Components read the mock JSON directly (`src/lib/data.server.ts`).

## Deploy (Vercel preview)

The production build is verified (`bun run build:web`). To deploy, run from the
**repo root** (first run links the project — answer the prompts as noted):

```bash
vercel            # first time: "In which directory is your code located?" → apps/web
                  #             keep "Include source files outside Root Directory" ON
vercel            # subsequent: deploys a preview URL
vercel --prod     # promote to production when ready
```

`apps/web/vercel.json` already sets the framework, the Next build command, and an
install command that installs the whole Bun workspace from the repo root (so the
`@at/api` / `@at/db` workspace deps resolve). No env vars are required for the
mock preview — `NEXT_PUBLIC_API_BASE` defaults to the self-contained route
handlers.

## Layout

```
src/app/                  routes (home, methodology, essay route group, api/v1 handlers)
src/app/(essays)/equity-reliability/sections/   one file per essay section
src/components/{chart,scrolly,map,ui}/          reusable primitives
src/lib/                  api-client, server data accessor, formatters
```
