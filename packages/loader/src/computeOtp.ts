import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { sql } from "@at/db";
import { wilsonCi } from "./wilsonCi.ts";

const OTP_SQL = join(dirname(fileURLToPath(import.meta.url)), "..", "sql", "otp.sql");

interface ClassRow {
  classification: string;
  n: string; // COUNT(*) comes back as a bigint string
  pct: string;
}

const ROUTE_CLASSES = ["standard", "rapid", "all"] as const;
type RouteClass = (typeof ROUTE_CLASSES)[number];

function parseCliArgs(): { start: string; end: string; routes: RouteClass } {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      start: { type: "string" },
      end: { type: "string" },
      routes: { type: "string", default: "standard" },
    },
  });
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const usage =
    "usage: compute-otp --start YYYY-MM-DD --end YYYY-MM-DD [--routes standard|rapid|all]";
  if (!values.start || !iso.test(values.start) || !values.end || !iso.test(values.end)) {
    console.error(usage);
    process.exit(1);
  }
  if (!ROUTE_CLASSES.includes(values.routes as RouteClass)) {
    console.error(usage);
    process.exit(1);
  }
  return { start: values.start, end: values.end, routes: values.routes as RouteClass };
}

async function main(): Promise<void> {
  const { start, end, routes } = parseCliArgs();
  const query = await Bun.file(OTP_SQL).text();
  const rows = await sql.unsafe<ClassRow[]>(query, [start, end, routes]);

  const counts: Record<"early" | "on_time" | "late" | "missing", number> = {
    early: 0,
    on_time: 0,
    late: 0,
    missing: 0,
  };
  for (const r of rows) {
    if (r.classification in counts) counts[r.classification as keyof typeof counts] = Number(r.n);
  }

  const total = counts.early + counts.on_time + counts.late + counts.missing;
  const observed = counts.early + counts.on_time + counts.late; // excludes 'missing'
  const coverage = total > 0 ? observed / total : 0;
  const otp = observed > 0 ? counts.on_time / observed : 0;
  const ci = wilsonCi(counts.on_time, observed);

  console.log(`\nOTP for ${start} .. ${end}  [routes: ${routes}]`);
  if (routes !== "standard") {
    console.log("  note: Rapid (800-series) uses a headway-based standard not modeled here;");
    console.log("        the departures 0/<6 window is only valid for standard routes.");
  }
  console.log("─".repeat(48));
  console.log(`  total scheduled timepoints : ${total.toLocaleString()}`);
  for (const k of ["on_time", "early", "late", "missing"] as const) {
    const n = counts[k];
    const pct = total > 0 ? ((100 * n) / total).toFixed(2) : "0.00";
    console.log(`  ${k.padEnd(26)} : ${n.toLocaleString().padStart(10)}  (${pct}%)`);
  }
  console.log("─".repeat(48));
  console.log(
    `  observed (non-missing)     : ${observed.toLocaleString().padStart(10)}  ` +
      `(${(coverage * 100).toFixed(2)}% coverage)`,
  );

  if (observed === 0) {
    // No trip-update observations matched this range — typically a service day
    // that hasn't occurred yet or for which no data was collected. OTP is
    // undefined here, not 0%.
    console.log("  OTP                        : n/a — no observations collected in this range");
  } else {
    console.log(`  OTP (on_time / observed)   : ${(otp * 100).toFixed(2)}%`);
    console.log(
      `  Wilson 95% CI              : ${(ci.low * 100).toFixed(2)}% .. ${(ci.high * 100).toFixed(2)}%`,
    );
    if (coverage < 0.5) {
      console.log(
        "  ⚠ low coverage — most scheduled timepoints had no observation; treat as noisy",
      );
    }
  }
  console.log("");

  await sql.end();
}

await main();
