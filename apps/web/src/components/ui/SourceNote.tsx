import type { ReactNode } from "react";

// Caption + source line that sits beneath any visualization (chart rule 6).
// Caption first, then the source in the same faint sans caption style.
export function SourceNote({
  children,
  source,
  href,
}: {
  children?: ReactNode;
  source: string;
  href?: string;
}) {
  return (
    <div className="caption" style={{ marginTop: "10px" }}>
      {children ? <span style={{ display: "block" }}>{children}</span> : null}
      <span>
        Source:{" "}
        {href ? (
          <a href={href} style={{ color: "inherit" }}>
            {source}
          </a>
        ) : (
          source
        )}
      </span>
    </div>
  );
}
