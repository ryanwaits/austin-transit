import Link from "next/link";
import { Footer } from "@/components/ui/Footer";

export const metadata = { title: "Methodology — Austin Transit" };

export default function Methodology() {
  return (
    <main>
      <article
        className="col col-narrow prose"
        style={{ paddingTop: "clamp(48px, 10vh, 120px)", paddingBottom: "24px" }}
      >
        <p style={{ marginBottom: "20px" }}>
          <Link href="/" className="ui" style={{ fontSize: "var(--text-small)" }}>
            ← Austin Transit
          </Link>
        </p>
        <h1 style={{ fontSize: "var(--text-h2)" }}>Methodology</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          Full methodology documentation is in progress. This page will detail data sources, the
          on-time definition, the equity classification approach, the sample period, and known
          limitations.
        </p>
        <p>
          In brief: we ingest CapMetro&apos;s GTFS-Realtime feeds every 30 seconds into our own
          database, join them against the published static schedule, and compute on-time performance
          independently using CapMetro&apos;s own definition (a departure is on time if it leaves no
          earlier than scheduled and less than six minutes late).
        </p>
      </article>
      <Footer />
    </main>
  );
}
