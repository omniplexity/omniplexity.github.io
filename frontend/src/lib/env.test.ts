import { describe, expect, it } from "vitest";
import { getApiBaseUrl } from "./env";

describe("getApiBaseUrl", () => {
  it("returns override when provided", () => {
    expect(getApiBaseUrl(" https://example.local ")).toBe("https://example.local");
  });

  it("returns empty string when no override", () => {
    expect(getApiBaseUrl()).toBe("");
  });
});
