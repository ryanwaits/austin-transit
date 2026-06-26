import { Footer } from "@/components/ui/Footer";
import { byEquityQuintile, byRoute, summary } from "@/lib/data.server";
import { FirstMeasurement } from "./sections/FirstMeasurement";
import { Hero } from "./sections/Hero";
import { MapSection } from "./sections/MapSection";
import { Methodology } from "./sections/Methodology";
import { PromiseSection } from "./sections/Promise";
import { Rigor } from "./sections/Rigor";
import { RoutesRanked } from "./sections/RoutesRanked";
import { TimeCost } from "./sections/TimeCost";
import { Transition } from "./sections/Transition";
import { WhatsNext } from "./sections/WhatsNext";

export const metadata = {
  title: "How long does the bus actually take?",
  description:
    "An independent measurement of CapMetro's on-time performance, and the riders who bear the cost when promises slip.",
};

// Illustrative weekly-delay personas built from the quintile extremes:
// ~10 trips/week, ~7 minutes lost per late departure.
function weeklyDelay(otp: number): number {
  return Math.round(10 * (1 - otp) * 7);
}

export default function EquityReliability() {
  const target = summary.target_otp;
  const actual = summary.measured_otp;
  const mostBurdened = byEquityQuintile.find((q) => q.quintile === 1) ?? byEquityQuintile[0];
  const leastBurdened = byEquityQuintile.find((q) => q.quintile === 5) ?? byEquityQuintile.at(-1);

  const aMinutes = weeklyDelay(mostBurdened?.otp ?? 0.7);
  const bMinutes = weeklyDelay(leastBurdened?.otp ?? 0.88);

  return (
    <main>
      <Hero />
      <PromiseSection target={target} />
      <FirstMeasurement target={target} actual={actual} />
      <Transition />
      <RoutesRanked routes={byRoute} />
      <MapSection />
      <TimeCost aMinutes={aMinutes} bMinutes={bMinutes} />
      <Rigor />
      <Methodology nEvents={summary.n_events} />
      <WhatsNext />
      <Footer />
    </main>
  );
}
