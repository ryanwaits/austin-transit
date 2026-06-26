import { BigNumber } from "@/components/ui/BigNumber";
import { PullQuote } from "@/components/ui/PullQuote";
import { pct } from "@/lib/format";

export function PromiseSection({ target }: { target: number }) {
  return (
    <section className="col col-narrow prose" style={{ paddingBlock: "clamp(64px, 14vh, 160px)" }}>
      <p>
        Every transit agency makes a promise, usually a quiet one, buried in a service plan. It
        sounds like a number. CapMetro&apos;s promise is that across its network, the bus arrives
        when the schedule says it will, at least most of the time.
      </p>
      <p>
        &ldquo;Most of the time&rdquo; has a specific meaning here. CapMetro&apos;s adopted standard
        sets a network-wide on-time target, and it grades itself against that bar every year.
      </p>

      <div style={{ marginBlock: "clamp(40px, 8vh, 84px)" }}>
        <BigNumber
          value={pct(target)}
          caption="CapMetro's network-wide on-time performance target, from its adopted Service Standards & Guidelines."
          color="var(--otp-ontime)"
        />
      </div>

      <PullQuote cite="CapMetro Service Standards & Guidelines (on-time definition)">
        A trip is on time if it departs no earlier than scheduled and less than six minutes late.
      </PullQuote>

      <p>
        That is the promise. The question this piece asks is simple: independently measured, with
        our own instruments, how close does the network come to keeping it?
      </p>
    </section>
  );
}
