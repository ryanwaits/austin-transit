"use client";

import { useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { ChartFrame } from "@/components/chart/ChartFrame";
import { DivergingBar } from "@/components/chart/DivergingBar";
import {
  ScrollyContainer,
  ScrollyStep,
  useScrollyProgress,
} from "@/components/scrolly/ScrollyContainer";

// Open the gap over the middle of the scroll range so it reads as parity at the
// top and the full gap by the last step.
function remap(p: number, lo = 0.15, hi = 0.78): number {
  return Math.min(1, Math.max(0, (p - lo) / (hi - lo)));
}

function Viz({ target, actual }: { target: number; actual: number }) {
  const progress = useScrollyProgress();
  const [p, setP] = useState(0);
  useMotionValueEvent(progress, "change", (v) => setP(v));

  return (
    <ChartFrame
      ariaLabel={`Measured on-time performance of ${Math.round(actual * 100)} percent against a target of ${Math.round(target * 100)} percent`}
      title="What we measured"
      subtitle="Network-wide, one week of independent measurement"
      source="Austin Transit Project · GTFS-RT measurement (sampled)"
    >
      <DivergingBar target={target} actual={actual} progress={remap(p)} />
    </ChartFrame>
  );
}

export function FirstMeasurement({ target, actual }: { target: number; actual: number }) {
  return (
    <ScrollyContainer vizSide="right">
      <ScrollyContainer.Viz>
        <Viz target={target} actual={actual} />
      </ScrollyContainer.Viz>
      <ScrollyContainer.Steps>
        <ScrollyStep>
          <p className="step-kicker">01 · The instrument</p>
          <p style={{ fontSize: "var(--text-h6)", lineHeight: 1.5 }}>
            So we built our own. Every thirty seconds, for a full week, we pulled CapMetro&apos;s
            own real-time feed, the same data that powers the arrival predictions in the app, into a
            database we control.
          </p>
        </ScrollyStep>
        <ScrollyStep>
          <p className="step-kicker">02 · The measurement</p>
          <p style={{ fontSize: "var(--text-h6)", lineHeight: 1.5 }}>
            Then we compared every scheduled departure at a timepoint against when the bus actually
            pulled away, using CapMetro&apos;s own on-time rule. No sampling tricks, no rounding in
            our favor.
          </p>
        </ScrollyStep>
        <ScrollyStep>
          <p className="step-kicker">03 · The result</p>
          <p style={{ fontSize: "var(--text-h6)", lineHeight: 1.5 }}>
            Across the network, the measured number lands below the target. The gap is small in
            percentage points, and it is the entire story: it is the difference between the promise
            and the platform.
          </p>
        </ScrollyStep>
      </ScrollyContainer.Steps>
    </ScrollyContainer>
  );
}
