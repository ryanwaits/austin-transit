import { scaleLinear } from "d3-scale";
import type { CSSProperties } from "react";

// Single comparison bar: target (the promise) vs measured (what we found).
// `progress` 0→1 interpolates measured from parity with target down to `actual`,
// so a scroll handler can open the gap. Pure SVG: with no JS it renders at the
// default progress=1 (the full, true gap).
export function DivergingBar({
  target,
  actual,
  progress = 1,
  ariaLabel = "Measured versus target on-time performance",
}: {
  target: number;
  actual: number;
  progress?: number;
  ariaLabel?: string;
}) {
  const W = 720;
  const H = 230;
  const padL = 116;
  const padR = 64;
  const x = scaleLinear()
    .domain([0, 1])
    .range([padL, W - padR]);

  const measured = target + (actual - target) * clamp01(progress);
  const gap = target - measured;
  const rowY = { target: 56, measured: 138 };
  const barH = 46;

  const fmt = (n: number) => `${(n * 100).toFixed(0)}%`;
  const ease = "fill .3s var(--ease-out-quint), width .3s var(--ease-out-quint)";

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <title>{ariaLabel}</title>

      {/* The promise line: a vertical guide at the target. */}
      <line
        x1={x(target)}
        x2={x(target)}
        y1={32}
        y2={H - 26}
        stroke="var(--color-border-strong)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />

      {/* Row labels (Inter, muted) */}
      <text x={0} y={rowY.target + barH / 2} dominantBaseline="middle" style={rowLabel}>
        Target
      </text>
      <text x={0} y={rowY.measured + barH / 2} dominantBaseline="middle" style={rowLabel}>
        Measured
      </text>

      {/* Target bar — calm reference */}
      <rect
        x={x(0)}
        y={rowY.target}
        width={x(target) - x(0)}
        height={barH}
        fill="var(--otp-ontime)"
        opacity={0.28}
        rx={2}
      />
      <text
        x={x(target) + 10}
        y={rowY.target + barH / 2}
        dominantBaseline="middle"
        style={valLabel}
      >
        {fmt(target)}
      </text>

      {/* Measured bar */}
      <rect
        x={x(0)}
        y={rowY.measured}
        width={x(measured) - x(0)}
        height={barH}
        fill="var(--color-fg)"
        rx={2}
        style={{ transition: ease }}
      />
      <text
        x={x(measured) - 10}
        y={rowY.measured + barH / 2}
        textAnchor="end"
        dominantBaseline="middle"
        style={{ ...valLabel, fill: "var(--color-surface)" }}
      >
        {fmt(measured)}
      </text>

      {/* The gap — the story, in late-red */}
      {gap > 0.002 ? (
        <>
          <rect
            x={x(measured)}
            y={rowY.measured}
            width={x(target) - x(measured)}
            height={barH}
            fill="var(--otp-late)"
            opacity={0.16}
          />
          <text
            x={(x(measured) + x(target)) / 2}
            y={rowY.measured + barH + 20}
            textAnchor="middle"
            style={{
              fill: "var(--otp-late)",
              fontSize: 15,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            −{(gap * 100).toFixed(1)} pp
          </text>
        </>
      ) : null}
    </svg>
  );
}

const rowLabel: CSSProperties = {
  fill: "var(--color-fg-muted)",
  fontSize: 14,
  fontWeight: 500,
};
const valLabel: CSSProperties = {
  fill: "var(--color-fg)",
  fontSize: 16,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
