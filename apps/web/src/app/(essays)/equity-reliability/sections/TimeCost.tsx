"use client";

import { useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { ChartFrame } from "@/components/chart/ChartFrame";
import {
  ScrollyContainer,
  ScrollyStep,
  useScrollyProgress,
} from "@/components/scrolly/ScrollyContainer";

// Round to 3 decimals: Math.sin/cos can differ by 1 ULP between the SSR engine
// and the browser, which otherwise produces a hydration mismatch on these SVG
// coordinate strings. Rounding makes server and client render identical markup.
const r3 = (n: number) => Math.round(n * 1000) / 1000;
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r3(cx + r * Math.sin(rad)), r3(cy - r * Math.cos(rad))];
}

// Progress arc from 12 o'clock, clockwise, covering `fraction` of the dial.
// Stroked (not filled), so the dial center stays clear for a legible number.
function arcPath(cx: number, cy: number, r: number, fraction: number): string {
  const f = Math.min(0.9999, Math.max(0.0001, fraction));
  const end = 360 * f;
  const [sx, sy] = polar(cx, cy, r, 0);
  const [ex, ey] = polar(cx, cy, r, end);
  const large = end > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

function Clock({
  minutes,
  progress,
  color,
  label,
}: {
  minutes: number;
  progress: number;
  color: string;
  label: string;
}) {
  const now = minutes * progress;
  const cx = 90;
  const cy = 90;
  const r = 64;
  const stroke = 16;
  return (
    <svg viewBox="0 0 180 210" width="100%" style={{ maxWidth: 240 }}>
      <title>{label}</title>
      {/* faint full-dial track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      {/* filled portion */}
      <path
        d={arcPath(cx, cy, r, now / 60)}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy - 1}
        textAnchor="middle"
        className="tabular"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: 36,
          fill: "var(--color-fg)",
        }}
      >
        {Math.round(now)}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-sans)", fontSize: 11, fill: "var(--color-fg-muted)" }}
      >
        min / week
      </text>
      <text
        x={cx}
        y={198}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, fill: color }}
      >
        {label}
      </text>
    </svg>
  );
}

function Viz({ aMinutes, bMinutes }: { aMinutes: number; bMinutes: number }) {
  const progress = useScrollyProgress();
  const [p, setP] = useState(0);
  useMotionValueEvent(progress, "change", (v) => setP(Math.min(1, Math.max(0, (v - 0.1) / 0.7))));

  return (
    <ChartFrame
      ariaLabel={`Weekly delay for two riders: ${aMinutes} minutes for a rider on a high-burden route versus ${bMinutes} minutes on a low-burden route`}
      title="The weekly cost, two riders"
      subtitle="Cumulative minutes lost to lateness over one week"
      source="Austin Transit Project · illustrative composite riders"
    >
      <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
        <Clock minutes={aMinutes} progress={p} color="var(--equity-burdened)" label="Rider A" />
        <Clock minutes={bMinutes} progress={p} color="var(--equity-advantaged)" label="Rider B" />
      </div>
    </ChartFrame>
  );
}

export function TimeCost({ aMinutes, bMinutes }: { aMinutes: number; bMinutes: number }) {
  return (
    <ScrollyContainer vizSide="left">
      <ScrollyContainer.Viz>
        <Viz aMinutes={aMinutes} bMinutes={bMinutes} />
      </ScrollyContainer.Viz>
      <ScrollyContainer.Steps>
        <ScrollyStep>
          <p className="step-kicker">Two riders</p>
          <p style={stepText}>
            Meet two riders. Rider A commutes on one of the bottom routes; Rider B on one near the
            top. Same city, same fare, same number of trips a week.
          </p>
        </ScrollyStep>
        <ScrollyStep>
          <p className="step-kicker">It compounds</p>
          <p style={stepText}>
            A few minutes late, twice a day, is easy to wave off. But it does not stay a few
            minutes. It accrues, trip after trip, into something you can measure in hours.
          </p>
        </ScrollyStep>
        <ScrollyStep>
          <p className="step-kicker">The tab, after a week</p>
          <p style={stepText}>
            By the end of the week, Rider A has lost {aMinutes} minutes to lateness. Rider B has
            lost {bMinutes}. The reliability gap is not abstract; it is paid in time, by the people
            who can least afford to lose it.
          </p>
          <p
            className="caption"
            style={{ marginTop: "16px", fontStyle: "italic", fontFamily: "var(--font-serif)" }}
          >
            Rider A and Rider B are illustrative composite riders built from route-level averages,
            not real individuals.
          </p>
        </ScrollyStep>
      </ScrollyContainer.Steps>
    </ScrollyContainer>
  );
}

const stepText = { fontSize: "var(--text-h6)", lineHeight: 1.5 } as const;
