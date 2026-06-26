import type { ReactNode } from "react";

// Editorial pull quote: EB Garamond italic, larger, indented. No side-stripe
// border (deliberately): emphasis comes from the italic, scale, and a hanging
// open-quote glyph.
export function PullQuote({ children, cite }: { children: ReactNode; cite?: string }) {
  return (
    <blockquote
      style={{
        margin: "clamp(28px, 5vh, 52px) 0",
        paddingLeft: "clamp(16px, 4vw, 40px)",
        fontStyle: "italic",
        fontSize: "var(--text-h4)",
        lineHeight: 1.4,
        color: "var(--color-fg)",
        position: "relative",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-0.07em",
          top: "-0.18em",
          fontSize: "2.4em",
          lineHeight: 1,
          color: "var(--color-border-strong)",
        }}
      >
        &ldquo;
      </span>
      <p style={{ margin: 0 }}>{children}</p>
      {cite ? (
        <cite
          className="ui"
          style={{
            display: "block",
            marginTop: "14px",
            fontStyle: "normal",
            fontSize: "var(--text-small)",
            color: "var(--color-fg-muted)",
          }}
        >
          {cite}
        </cite>
      ) : null}
    </blockquote>
  );
}
