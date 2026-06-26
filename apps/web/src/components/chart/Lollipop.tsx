import { scaleLinear } from "d3-scale";

// Horizontal lollipop: one row per item, sorted best→worst by value. `highlight`
// decides colored vs muted; `color` gives the highlighted hue; `annotate`
// returns an optional direct label drawn at the row (we never use a legend).
// Pure SVG so it renders without JS; highlight changes transition gently.
export function Lollipop<T>({
  data,
  value,
  id,
  color,
  highlight,
  annotate,
  domain = [0.55, 0.95],
  target,
  ariaLabel,
}: {
  data: T[];
  value: (d: T) => number;
  id: (d: T) => string;
  color: (d: T) => string;
  highlight?: (d: T) => boolean;
  annotate?: (d: T) => string | undefined;
  domain?: [number, number];
  target?: number;
  ariaLabel: string;
}) {
  const rows = [...data].sort((a, b) => value(b) - value(a));
  const W = 720;
  const padL = 16;
  const padR = 188; // room for direct labels
  const padTop = 18;
  const rowH = 8.4;
  const H = padTop + rows.length * rowH + 38;
  const x = scaleLinear()
    .domain(domain)
    .range([padL, W - padR]);
  const x0 = x(domain[0]);
  const ticks = tickValues(domain);

  // Collect labels, then declutter: annotated rows are often adjacent (the
  // bottom five), so their labels would overlap at the row's y. Spread them to
  // non-overlapping y positions and connect each back to its dot with a leader.
  const annos = rows
    .map((d, i) => {
      const note = annotate?.(d);
      if (!note) return null;
      return {
        key: id(d),
        text: note,
        cx: x(value(d)),
        cy: padTop + i * rowH + rowH / 2,
        hue: color(d),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.cy - b.cy);

  const LABEL_GAP = 13.5;
  const maxLabelY = H - 32;
  let prevY = -Infinity;
  const stacked = annos.map((a) => {
    const labelY = Math.max(a.cy, prevY + LABEL_GAP);
    prevY = labelY;
    return { ...a, labelY };
  });
  // If the stack ran past the axis, lift the whole block to fit.
  const lastY = stacked.at(-1)?.labelY ?? 0;
  const shift = lastY > maxLabelY ? lastY - maxLabelY : 0;
  const placed = stacked.map((p) => ({ ...p, labelY: p.labelY - shift }));

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <title>{ariaLabel}</title>

      {/* bottom axis: bare line, floating value labels, no ticks */}
      <line
        x1={padL}
        x2={W - padR}
        y1={H - 26}
        y2={H - 26}
        stroke="var(--color-border-strong)"
        strokeWidth={1}
      />
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 10} textAnchor="middle" style={axisLabel}>
          {Math.round(t * 100)}%
        </text>
      ))}

      {/* target guide */}
      {target !== undefined ? (
        <>
          <line
            x1={x(target)}
            x2={x(target)}
            y1={padTop - 6}
            y2={H - 26}
            stroke="var(--color-border-strong)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
          <text x={x(target)} y={padTop - 9} textAnchor="middle" style={axisLabel}>
            target {Math.round(target * 100)}%
          </text>
        </>
      ) : null}

      {rows.map((d, i) => {
        const on = highlight ? highlight(d) : true;
        const cy = padTop + i * rowH + rowH / 2;
        const cx = x(value(d));
        const hue = on ? color(d) : "var(--color-fg-faint)";
        const op = on ? 1 : 0.32;
        return (
          <g key={id(d)} style={{ transition: "opacity .3s var(--ease-out-quint)" }} opacity={op}>
            <line
              x1={x0}
              x2={cx}
              y1={cy}
              y2={cy}
              stroke={hue}
              strokeWidth={on ? 1.6 : 1}
              style={{ transition: "stroke .3s var(--ease-out-quint)" }}
            />
            <circle cx={cx} cy={cy} r={on ? 3 : 2.2} fill={hue} />
          </g>
        );
      })}

      {/* decluttered direct labels with leaders */}
      {placed.map((a) => {
        const labelX = a.cx + 14;
        return (
          <g key={`label-${a.key}`}>
            <polyline
              points={`${a.cx + 4},${a.cy} ${a.cx + 10},${a.labelY} ${labelX - 2},${a.labelY}`}
              fill="none"
              stroke={a.hue}
              strokeWidth={1}
              opacity={0.55}
            />
            <text
              x={labelX}
              y={a.labelY}
              dominantBaseline="middle"
              style={{ ...seriesLabel, fill: a.hue }}
            >
              {a.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function tickValues([lo, hi]: [number, number]): number[] {
  const out: number[] = [];
  for (let t = Math.ceil(lo * 10) / 10; t <= hi + 1e-9; t += 0.1) out.push(Number(t.toFixed(1)));
  return out;
}

const axisLabel = {
  fill: "var(--color-fg-muted)",
  fontSize: 13,
  fontWeight: 500,
} as const;
const seriesLabel = {
  fontSize: 12,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
} as const;
