import { expect, test } from "bun:test";
import { wilsonCi } from "./wilsonCi.ts";

test("wilson CI brackets the point estimate", () => {
  const { low, high, p } = wilsonCi(80, 100);
  expect(p).toBeCloseTo(0.8, 10);
  expect(low).toBeLessThan(p);
  expect(high).toBeGreaterThan(p);
});

test("wilson CI matches known value for 80/100", () => {
  // Reference (z=1.96): ~0.7112 .. 0.8666
  const { low, high } = wilsonCi(80, 100);
  expect(low).toBeCloseTo(0.7112, 3);
  expect(high).toBeCloseTo(0.8666, 3);
});

test("wilson CI stays within [0,1] at the extremes", () => {
  const allHits = wilsonCi(100, 100);
  expect(allHits.high).toBeLessThanOrEqual(1);
  expect(allHits.low).toBeGreaterThan(0);

  const noHits = wilsonCi(0, 100);
  expect(noHits.low).toBeGreaterThanOrEqual(0);
  expect(noHits.high).toBeLessThan(1);
});

test("wilson CI handles zero total without dividing by zero", () => {
  const { low, high, p } = wilsonCi(0, 0);
  expect(low).toBe(0);
  expect(high).toBe(0);
  expect(p).toBe(0);
});
