import { RouteMap } from "@/components/map/RouteMap";
import { SourceNote } from "@/components/ui/SourceNote";
import { routesGeojsonUrl, stopsGeojsonUrl } from "@/lib/api-client";

export function MapSection() {
  return (
    <section className="col col-bleed" style={{ paddingBlock: "clamp(56px, 11vh, 130px)" }}>
      <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto 32px" }}>
        <h2 style={{ fontSize: "var(--text-h3)" }}>The same gap, drawn on the map</h2>
        <p style={{ marginTop: "14px", color: "var(--color-fg-muted)" }}>
          Each line is a route, colored by its on-time performance, from red where the bus is least
          reliable to green where it is most. The unreliable routes are not scattered at random.
          Hover any line to see its number, its corridor, and how transit-dependent its riders are.
        </p>
      </div>

      <div
        style={{
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid var(--color-border)",
        }}
      >
        <RouteMap routesUrl={routesGeojsonUrl} stopsUrl={stopsGeojsonUrl} />
      </div>

      <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
        <SourceNote source="Austin Transit Project · CapMetro GTFS shapes, GTFS-RT measurement (sampled)">
          Route geometry is simplified for display. Demographic overlays are illustrative in this
          preview and arrive with the full dataset.
        </SourceNote>
      </div>
    </section>
  );
}
