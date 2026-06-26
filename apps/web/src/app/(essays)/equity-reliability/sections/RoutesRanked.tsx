"use client";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/ChartFrame";
import { Lollipop } from "@/components/chart/Lollipop";
import { ScrollyContainer, ScrollyStep } from "@/components/scrolly/ScrollyContainer";
import type { RouteOtp } from "@/lib/api-client";

type Group = "all" | "frequent" | "burden" | "bottom";

function equityColor(burden: number): string {
  if (burden > 0.6) return "var(--equity-burdened)";
  if (burden < 0.4) return "var(--equity-advantaged)";
  return "var(--color-fg-faint)";
}

export function RoutesRanked({ routes }: { routes: RouteOtp[] }) {
  const [group, setGroup] = useState<Group>("all");

  const { frequentIds, bottomIds, bottomNames } = useMemo(() => {
    const byFreq = [...routes].sort((a, b) => b.n_events - a.n_events);
    const byOtp = [...routes].sort((a, b) => a.otp - b.otp);
    const bottom = byOtp.slice(0, 5);
    return {
      frequentIds: new Set(byFreq.slice(0, 18).map((r) => r.route_id)),
      bottomIds: new Set(bottom.map((r) => r.route_id)),
      bottomNames: bottom.map((r) => r.route_long_name.replace(/^\d+\s*-\s*/, "")),
    };
  }, [routes]);

  const highlight = (d: RouteOtp): boolean => {
    switch (group) {
      case "all":
        return true;
      case "frequent":
        return frequentIds.has(d.route_id);
      case "burden":
        return d.equity_burden_score > 0.6;
      case "bottom":
        return bottomIds.has(d.route_id);
    }
  };

  const annotate = (d: RouteOtp): string | undefined =>
    group === "bottom" && bottomIds.has(d.route_id)
      ? `${d.route_short_name} · ${d.route_long_name.replace(/^\d+\s*-\s*/, "")}`
      : undefined;

  return (
    <ScrollyContainer vizSide="right">
      <ScrollyContainer.Viz>
        <ChartFrame
          ariaLabel="On-time performance for every CapMetro route, ranked best to worst, colored by the equity burden of the riders each route serves"
          title="Every route, ranked"
          subtitle="On-time performance · color shows the equity burden of riders served"
          source="Austin Transit Project · GTFS-RT measurement (sampled)"
        >
          <Lollipop
            data={routes}
            value={(d) => d.otp}
            id={(d) => d.route_id}
            color={(d) => equityColor(d.equity_burden_score)}
            highlight={highlight}
            annotate={annotate}
            domain={[0.6, 0.92]}
            target={0.85}
            ariaLabel="Route on-time performance lollipop chart"
          />
        </ChartFrame>
      </ScrollyContainer.Viz>

      <ScrollyContainer.Steps>
        <ScrollyStep onEnter={() => setGroup("all")}>
          <p className="step-kicker">Every route</p>
          <p style={stepText}>
            Here is every route in the network, fastest to slowest. The spread is wide: the best
            routes clear the target comfortably; the worst miss it by a lot. Color marks how
            transit-dependent each route&apos;s riders are.
          </p>
        </ScrollyStep>
        <ScrollyStep onEnter={() => setGroup("frequent")}>
          <p className="step-kicker">The frequent routes</p>
          <p style={stepText}>
            The highest-ridership routes, the ones the network is built around, cluster nearer the
            top. When most people ride, the agency tends to deliver.
          </p>
        </ScrollyStep>
        <ScrollyStep onEnter={() => setGroup("burden")}>
          <p className="step-kicker">The routes that carry the most</p>
          <p style={stepText}>
            Now look at the routes serving the most transit-dependent neighborhoods, in magenta.
            They sit lower. The riders with the fewest alternatives are riding the least reliable
            service.
          </p>
        </ScrollyStep>
        <ScrollyStep onEnter={() => setGroup("bottom")}>
          <p className="step-kicker">The bottom five</p>
          <p style={stepText}>
            And these five sit at the very bottom: {bottomNames.join(", ")}. This is where the
            network&apos;s promise and its performance drift furthest apart.
          </p>
        </ScrollyStep>
      </ScrollyContainer.Steps>
    </ScrollyContainer>
  );
}

const stepText = { fontSize: "var(--text-h6)", lineHeight: 1.5 } as const;
