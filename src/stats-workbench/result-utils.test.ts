import { describe, expect, it, jest } from "@jest/globals";
import { buildTableData, copyApaTablesToClipboard, formatApaCell } from "./result-utils";

describe("result-utils", () => {
  it("builds tables from success.data payload", () => {
    const tables = buildTableData({
      success: true,
      data: {
        summary: { mean: 10.25, n: 4 }
      }
    });

    expect(tables).toHaveLength(1);
    expect(tables[0].title).toBe("summary");
    expect(tables[0].columns).toEqual(["statistic", "value"]);
  });

  it("formats APA values consistently", () => {
    expect(formatApaCell(12.34)).toBe("12.34");
    expect(formatApaCell(0.00001)).toBe("1.000e-5");
    expect(formatApaCell(null)).toBe("NA");
    expect(formatApaCell(true)).toBe("True");
  });

  describe("3-digit truncation", () => {
    it("truncates positive numbers toward zero (not rounding)", () => {
      // 0.12349 → 0.123 (truncated, NOT rounded to 0.123)
      expect(formatApaCell(0.12349)).toBe("0.123");
      // 0.99999 → 0.999 (truncated, NOT rounded to 1.000)
      expect(formatApaCell(0.99999)).toBe("0.999");
      // 1.23456 → 1.234
      expect(formatApaCell(1.23456)).toBe("1.234");
    });

    it("truncates negative numbers toward zero", () => {
      // -0.12349 → -0.123 (toward zero, not -0.124)
      expect(formatApaCell(-0.12349)).toBe("-0.123");
      expect(formatApaCell(-1.99999)).toBe("-1.999");
    });

    it("strips trailing zeros after decimal", () => {
      expect(formatApaCell(1.5)).toBe("1.5");
      expect(formatApaCell(2)).toBe("2");
      expect(formatApaCell(0)).toBe("0");
    });

    it("uses exponential notation for very small or very large values", () => {
      // Exponential branch uses JS toExponential(3) which rounds, not truncates.
      // This is acceptable for extreme magnitudes.
      expect(formatApaCell(0.0005)).toBe("5.000e-4");
      expect(formatApaCell(12345)).toBe("1.235e+4");
    });

    it("handles non-finite numbers as NA", () => {
      expect(formatApaCell(Number.NaN)).toBe("NA");
      expect(formatApaCell(Number.POSITIVE_INFINITY)).toBe("NA");
      expect(formatApaCell(Number.NEGATIVE_INFINITY)).toBe("NA");
    });
  });

  it("copies to clipboard using text fallback", async () => {
    const writeText = jest.fn().mockImplementation(async () => undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = undefined;

    const copied = await copyApaTablesToClipboard([
      {
        title: "Summary",
        columns: ["statistic", "value"],
        rows: [{ statistic: "n", value: 10 }]
      }
    ]);

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("returns false when there is nothing to copy", async () => {
    await expect(copyApaTablesToClipboard([])).resolves.toBe(false);
  });
});
