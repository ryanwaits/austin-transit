import { SubscribeForm } from "./SubscribeForm";

// "Read next" as an editorial list (kicker + title + dek with dividers), not a
// grid of identical cards.
const NEXT = [
  {
    kicker: "Coming next",
    title: "The twelve-minute promise",
    dek: "Frequency is the other half of reliability. We measure how often the bus that's supposed to come every twelve minutes actually does.",
  },
  {
    kicker: "In the works",
    title: "Where the network thins out",
    dek: "Mapping the gap between where people are and where frequent service reaches, across Travis County.",
  },
  {
    kicker: "Later",
    title: "A year of weeks",
    dek: "What one week can't tell you, fifty-two can. The long view on whether reliability is improving.",
  },
];

export function WhatsNext() {
  return (
    <section className="col col-narrow" style={{ paddingBlock: "clamp(56px, 11vh, 130px)" }}>
      <h2 style={{ fontSize: "var(--text-h3)" }}>What&apos;s next</h2>
      <p style={{ marginTop: "14px", color: "var(--color-fg-muted)", maxWidth: "60ch" }}>
        We&apos;re publishing one of these about once a month. The next one looks at frequency: not
        whether the bus is on time, but whether it shows up often enough to plan a life around.
      </p>

      <div style={{ marginTop: "36px", maxWidth: "44ch" }}>
        <SubscribeForm />
      </div>

      <ul style={{ listStyle: "none", padding: 0, marginTop: "clamp(40px, 8vh, 80px)" }}>
        {NEXT.map((item) => (
          <li
            key={item.title}
            style={{ paddingBlock: "22px", borderTop: "1px solid var(--color-border)" }}
          >
            <p
              className="ui"
              style={{
                fontSize: "var(--text-caption)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-fg-faint)",
                marginBottom: "6px",
              }}
            >
              {item.kicker}
            </p>
            <h3 style={{ fontSize: "var(--text-h5)" }}>{item.title}</h3>
            <p style={{ marginTop: "6px", color: "var(--color-fg-muted)", maxWidth: "58ch" }}>
              {item.dek}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
