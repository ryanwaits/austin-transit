import Link from "next/link";

const YEAR = 2026;

export function Footer() {
  return (
    <footer
      className="col col-medium ui"
      style={{
        marginTop: "clamp(64px, 12vh, 140px)",
        paddingBlock: "40px",
        borderTop: "1px solid var(--color-border)",
        fontSize: "var(--text-small)",
        color: "var(--color-fg-muted)",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 28px",
        alignItems: "baseline",
      }}
    >
      <span style={{ color: "var(--color-fg)" }}>Austin Transit · {YEAR}</span>
      <Link href="/methodology">Methodology</Link>
      <a href="https://github.com/ryanwaits/austin-transit">GitHub</a>
      <a href="mailto:hello@example.com">Contact</a>
      <Link href="/methodology">About this project</Link>
    </footer>
  );
}
