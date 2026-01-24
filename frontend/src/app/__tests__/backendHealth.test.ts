import { describe, expect, it } from "vitest";
import { computeBackoffMs } from "../backendHealth";

describe("computeBackoffMs", () => {
  it("returns base delay for attempt 0", () => {
    expect(computeBackoffMs(0)).toBe(2000);
  });

  it("doubles for subsequent attempts", () => {
    expect(computeBackoffMs(1)).toBe(4000);
    expect(computeBackoffMs(2)).toBe(8000);
  });

  it("caps at 60000ms", () => {
    expect(computeBackoffMs(5)).toBe(60000);
    expect(computeBackoffMs(10)).toBe(60000);
  });

  it("clamps negative attempts", () => {
    expect(computeBackoffMs(-1)).toBe(2000);
  });

  it("is monotonic non-decreasing", () => {
    const values = Array.from({ length: 6 }, (_, idx) => computeBackoffMs(idx));
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });
});
