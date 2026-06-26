import type { ReactNode } from "react";
import { SourceNote } from "@/components/ui/SourceNote";

// Wraps every chart with consistent title/caption/source and accessibility.
// The chart body is native SVG passed as children (no chart library). The
// figure carries an aria-label; charts also set role="img" on their <svg>.
export function ChartFrame({
  title,
  subtitle,
  caption,
  source,
  sourceHref,
  ariaLabel,
  children,
}: {
  title?: string;
  subtitle?: string;
  caption?: ReactNode;
  source?: string;
  sourceHref?: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <figure style={{ margin: 0, width: "100%" }} aria-label={ariaLabel}>
      {title ? (
        <div
          className="ui"
          style={{ fontSize: "var(--text-h6)", fontWeight: 600, color: "var(--color-fg)" }}
        >
          {title}
        </div>
      ) : null}
      {subtitle ? (
        <div
          className="caption"
          style={{
            marginTop: "2px",
            fontSize: "var(--text-small)",
            color: "var(--color-fg-muted)",
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ marginTop: title || subtitle ? "18px" : 0, width: "100%" }}>{children}</div>

      {source ? (
        <SourceNote source={source} href={sourceHref}>
          {caption}
        </SourceNote>
      ) : caption ? (
        <figcaption className="caption" style={{ marginTop: "10px" }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
