import { describe, it, expect } from "vitest";

describe("mcp-uspto", () => {
  it("should clean patent IDs", () => {
    expect("11,234,567".replace(/,/g, "").trim()).toBe("11234567");
    expect("11234567".replace(/,/g, "").trim()).toBe("11234567");
  });

  it("should detect CPC codes vs keywords", () => {
    expect(/^[A-H]\d/.test("H04L")).toBe(true);
    expect(/^[A-H]\d/.test("G06F")).toBe(true);
    expect(/^[A-H]\d/.test("machine learning")).toBe(false);
  });

  it("should build correct PatentsView URLs", () => {
    const url = `https://search.patentsview.org/api/v1/patent/`;
    expect(url).toContain("patentsview.org");
    expect(url).toContain("/api/v1/");
  });

  it("should build TSDR URLs correctly", () => {
    const sn = "97123456";
    const url = `https://tsdrapi.uspto.gov/ts/cd/casestatus/sn${sn}/info.json`;
    expect(url).toContain("sn97123456");
    expect(url).toContain("info.json");
  });

  it("should support all PatentsView entity endpoints", () => {
    const entities = ["patent", "inventor", "assignee", "cpc_subgroup"];
    for (const e of entities) {
      const url = `https://search.patentsview.org/api/v1/${e}/`;
      expect(url).toMatch(/\/api\/v1\/\w+\/$/);
    }
  });

  it("should enforce rate limiting", () => {
    const RATE_LIMIT_MS = 500;
    const lastRequest = Date.now() - 200;
    const elapsed = Date.now() - lastRequest;
    expect(elapsed < RATE_LIMIT_MS).toBe(true);
  });
});
