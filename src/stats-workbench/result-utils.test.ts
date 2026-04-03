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
