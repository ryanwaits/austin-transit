import Link from "next/link";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
  return (
    <main>
      <header
        className="col col-medium"
        style={{ paddingTop: "clamp(40px, 9vh, 110px)", paddingBottom: "8px" }}
      >
        <p
          className="ui"
          style={{
            fontSize: "var(--text-caption)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-fg-faint)",
            margin: 0,
          }}
        >
          Austin Transit — Independent Measurement
        </p>
      </header>

      <section
        className="col col-medium"
        style={{ paddingTop: "clamp(48px, 12vh, 140px)", paddingBottom: "24px" }}
      >
        <p
          className="ui"
          style={{
            fontSize: "var(--text-small)",
            letterSpacing: "0.04em",
            color: "var(--equity-burdened)",
            marginBottom: "18px",
          }}
        >
          Essay 01 · Reliability &amp; Equity
        </p>

        <h1 style={{ fontSize: "var(--text-h1)", maxWidth: "16ch" }}>
          <Link href="/equity-reliability" style={{ textDecoration: "none" }}>
            How long does the bus actually take?
          </Link>
        </h1>

        <p
          style={{
            marginTop: "20px",
            fontSize: "var(--text-h6)",
            color: "var(--color-fg-muted)",
            maxWidth: "54ch",
            fontStyle: "italic",
          }}
        >
          An independent measurement of CapMetro&apos;s on-time performance, and the riders who bear
          the cost when promises slip.
        </p>

        <p
          className="ui tabular"
          style={{
            marginTop: "26px",
            fontSize: "var(--text-caption)",
            color: "var(--color-fg-faint)",
          }}
        >
          June 2026 · Reading time ~6 min
        </p>
      </section>

      <Footer />
    </main>
  );
}
