import type { ReactNode } from "react";

// A single large standalone figure, the editorial "inline stat". EB Garamond,
// tabular numerals so it never reflows when used with changing values.
export function BigNumber({
  value,
  unit,
  caption,
  color = "var(--color-fg)",
}: {
  value: ReactNode;
  unit?: string;
  caption?: ReactNode;
  color?: string;
}) {
  return (
    <figure style={{ margin: 0 }}>
      <div
        className="tabular"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(64px, 11vw, 116px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color,
        }}
      >
        {value}
        {unit ? (
          <span style={{ fontSize: "0.42em", fontWeight: 500, marginLeft: "0.06em" }}>{unit}</span>
        ) : null}
      </div>
      {caption ? (
        <figcaption
          className="caption"
          style={{ marginTop: "12px", maxWidth: "32ch", fontSize: "var(--text-small)" }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
