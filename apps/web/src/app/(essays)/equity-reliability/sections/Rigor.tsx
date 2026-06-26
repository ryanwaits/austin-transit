import Link from "next/link";

// The honesty section. Tinted parchment background to set it apart. Mandatory:
// it is what separates this from a hot-take.
export function Rigor() {
  return (
    <section
      style={{
        background: "var(--color-surface-warm)",
        borderBlock: "1px solid var(--color-border)",
        paddingBlock: "clamp(64px, 13vh, 150px)",
      }}
    >
      <div className="col col-narrow prose">
        <h2 style={{ fontSize: "var(--text-h3)" }}>What we&apos;re not saying</h2>
        <p>
          This is one week of data. A week can be unlucky, a construction detour, a stretch of bad
          weather, a software hiccup in the feed itself. We are not claiming this is CapMetro&apos;s
          permanent record, and we are not saying anyone acted in bad faith.
        </p>
        <p>
          We are also measuring what the real-time feed reports, not a stopwatch at every curb. When
          the feed and the curb disagree, we inherit the feed&apos;s blind spots. Where the agency
          publishes a stop we could not observe, we count it as missing rather than guessing.
        </p>
        <p>
          And the equity layer in this preview is built on illustrative groupings. The real
          demographic join, census tract by census tract, comes with the full dataset. Until then,
          read the route-level pattern as a hypothesis the data keeps suggesting, not a verdict.
        </p>
        <p style={{ fontSize: "var(--text-h5)", fontStyle: "italic", marginTop: "1.4em" }}>
          This is one week. We will keep measuring.{" "}
          <Link href="/methodology" style={{ fontStyle: "normal" }}>
            Read the methodology.
          </Link>
        </p>
      </div>
    </section>
  );
}
