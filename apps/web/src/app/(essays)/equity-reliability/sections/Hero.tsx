export function Hero() {
  return (
    <header
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        paddingInline: "var(--space-page-x)",
        position: "relative",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(48px, 6vw, 88px)",
          maxWidth: "14ch",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        How long does the bus actually take?
      </h1>

      <p
        style={{
          marginTop: "28px",
          maxWidth: "46ch",
          fontSize: "var(--text-h6)",
          fontStyle: "italic",
          color: "var(--color-fg-muted)",
          lineHeight: 1.45,
        }}
      >
        An independent measurement of CapMetro&apos;s on-time performance, and the riders who bear
        the cost when promises slip.
      </p>

      <p
        className="ui tabular"
        style={{
          marginTop: "32px",
          fontSize: "var(--text-caption)",
          letterSpacing: "0.04em",
          color: "var(--color-fg-faint)",
        }}
      >
        By the Austin Transit Project · June 2026 · Reading time ~6 min
      </p>

      <div
        aria-hidden="true"
        className="ui"
        style={{
          position: "absolute",
          bottom: "28px",
          fontSize: "var(--text-caption)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--color-fg-faint)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
        }}
      >
        Scroll
        <span style={{ fontSize: "16px" }}>↓</span>
      </div>
    </header>
  );
}
