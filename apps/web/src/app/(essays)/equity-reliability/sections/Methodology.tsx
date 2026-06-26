import Link from "next/link";
import { int } from "@/lib/format";

export function Methodology({ nEvents }: { nEvents: number }) {
  return (
    <section className="col col-narrow prose" style={{ paddingBlock: "clamp(56px, 11vh, 130px)" }}>
      <h2 style={{ fontSize: "var(--text-h3)" }}>How we measured this</h2>
      <p>
        <strong>Data sources.</strong> We ingest CapMetro&apos;s public GTFS-Realtime feeds, vehicle
        positions and trip updates, every thirty seconds, and join them against the agency&apos;s
        published static GTFS schedule. Everything runs on infrastructure we control.
      </p>
      <p>
        <strong>On-time definition.</strong> We use CapMetro&apos;s own rule for fixed-route bus: a
        departure is on time if it leaves no earlier than scheduled and less than six minutes late.
        MetroRapid uses a different, headway-based standard and is reported separately.
      </p>
      <p>
        <strong>Equity classification.</strong> Routes are grouped by the demographic and income
        profile of the census tracts they serve. In this preview those groupings are illustrative;
        the full census join arrives with the complete dataset.
      </p>
      <p>
        <strong>Sample &amp; limits.</strong> This snapshot reflects roughly {int(nEvents)} measured
        timepoint departures over one week. Predictions are not curbside stopwatch readings, and a
        single week is a sample, not a verdict. See the limitations in full.
      </p>

      <div
        className="ui"
        style={{
          marginTop: "32px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 20px",
          fontSize: "var(--text-small)",
        }}
      >
        <Link href="/methodology">Full methodology →</Link>
        {/* Download artifacts are stubbed this sprint; rendered as disabled, not links. */}
        <span aria-disabled="true" style={{ color: "var(--color-fg-faint)" }}>
          Get the data (CSV) · soon
        </span>
        <span aria-disabled="true" style={{ color: "var(--color-fg-faint)" }}>
          Methodology (PDF) · soon
        </span>
        <a href="https://github.com/ryanwaits/austin-transit">Source on GitHub →</a>
      </div>
    </section>
  );
}
