"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// OTP color ramp (literal hex — MapLibre paint can't read CSS vars). Matches the
// --otp-* tokens. Exported so the legend stays in sync with the lines.
export const OTP_STOPS = [
  [0.62, "#EE6677"], // late
  [0.78, "#CCBB44"], // mid
  [0.9, "#228833"], // on-time
] as const;

interface HoverInfo {
  x: number;
  y: number;
  short: string;
  long: string;
  otp: number;
  burden: number;
}

// MapLibre map of Austin: soft cream/gray underlay (no basemap labels), bus
// routes as lines colored by OTP, hover for route detail, inline legend. Scroll
// zoom is disabled so the full-bleed map never traps page scrolling.
export function RouteMap({
  routesUrl,
  stopsUrl,
  height = "72vh",
  center = [-97.74, 30.3],
  zoom = 10.2,
}: {
  routesUrl: string;
  stopsUrl?: string;
  height?: string;
  center?: [number, number];
  zoom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Capture the initial camera once. center/zoom are fresh array/number
  // literals each render; if they were in the effect deps, every setHover()
  // (one per mousemove) would re-run the effect and rebuild the whole map.
  const initialCenter = useRef(center).current;
  const initialZoom = useRef(zoom).current;

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !ref.current) return;

      map = new maplibregl.Map({
        container: ref.current,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
        dragRotate: false,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: "bg", type: "background", paint: { "background-color": "#F3EFE0" } }],
        },
      });
      map.scrollZoom.disable();
      map.touchZoomRotate.disableRotation();

      map.on("load", () => {
        if (!map) return;
        if (stopsUrl) {
          map.addSource("stops", { type: "geojson", data: stopsUrl });
          map.addLayer({
            id: "stops",
            type: "circle",
            source: "stops",
            paint: {
              "circle-radius": 1.4,
              "circle-color": "#B8B4A5",
              "circle-opacity": 0.5,
            },
          });
        }

        // promoteId lets feature-state key on route_id (GeoJSON has no feature id).
        map.addSource("routes", { type: "geojson", data: routesUrl, promoteId: "route_id" });
        map.addLayer({
          id: "routes",
          type: "line",
          source: "routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 4.5, 2.2],
            "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85],
            "line-color": ["interpolate", ["linear"], ["get", "otp"], ...OTP_STOPS.flat()],
          },
        });

        let hovered: string | number | undefined;
        const clearHover = () => {
          if (hovered !== undefined && map) {
            map.setFeatureState({ source: "routes", id: hovered }, { hover: false });
          }
          hovered = undefined;
        };

        map.on("mousemove", "routes", (e) => {
          if (!map || !e.features?.length) return;
          const f = e.features[0];
          if (!f) return;
          if (f.id !== hovered) {
            clearHover();
            hovered = f.id;
            if (hovered !== undefined) {
              map.setFeatureState({ source: "routes", id: hovered }, { hover: true });
            }
          }
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties ?? {};
          setHover({
            x: e.point.x,
            y: e.point.y,
            short: String(p.route_short_name ?? ""),
            long: String(p.route_long_name ?? ""),
            otp: Number(p.otp ?? 0),
            burden: Number(p.equity_burden_score ?? 0),
          });
        });
        map.on("mouseleave", "routes", () => {
          if (map) map.getCanvas().style.cursor = "";
          clearHover();
          setHover(null);
        });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [routesUrl, stopsUrl, initialCenter, initialZoom]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        ref={ref}
        role="img"
        aria-label="Map of CapMetro bus routes across Austin, colored by on-time performance"
        style={{ position: "absolute", inset: 0, background: "#F3EFE0" }}
      />

      {/* OTP legend, bottom-left */}
      <div
        className="ui"
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          padding: "10px 12px",
          fontSize: "var(--text-caption)",
        }}
      >
        <div style={{ color: "var(--color-fg-muted)", marginBottom: 6 }}>On-time performance</div>
        <div
          style={{
            width: 168,
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${OTP_STOPS[0][1]}, ${OTP_STOPS[1][1]}, ${OTP_STOPS[2][1]})`,
          }}
        />
        <div
          className="tabular"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            color: "var(--color-fg-muted)",
          }}
        >
          <span>62%</span>
          <span>90%</span>
        </div>
      </div>

      {hover ? (
        <div
          className="ui"
          style={{
            position: "absolute",
            left: Math.min(hover.x + 14, 9999),
            top: hover.y + 14,
            pointerEvents: "none",
            maxWidth: 240,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: "var(--text-caption)",
            boxShadow: "0 6px 20px rgba(38,38,38,0.12)",
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--color-fg)", fontSize: "var(--text-small)" }}>
            Route {hover.short}
          </div>
          <div style={{ color: "var(--color-fg-muted)", marginTop: 1 }}>
            {hover.long.replace(/^\d+\s*-\s*/, "")}
          </div>
          <div className="tabular" style={{ marginTop: 6, color: "var(--color-fg)" }}>
            OTP {(hover.otp * 100).toFixed(0)}% · equity burden {(hover.burden * 100).toFixed(0)}
            /100
          </div>
        </div>
      ) : null}
    </div>
  );
}
