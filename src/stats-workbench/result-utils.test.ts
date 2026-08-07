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

  describe("formatApaCell — 3-digit rounding (uniform rule)", () => {
    it("renders all finite numbers with exactly 3 decimal places, half-up rounded", () => {
      expect(formatApaCell(12.3456)).toBe("12.346");
      expect(formatApaCell(0.12349)).toBe("0.123");
      expect(formatApaCell(0.12350)).toBe("0.124");
      expect(formatApaCell(0.99999)).toBe("1.000");
      expect(formatApaCell(1.23456)).toBe("1.235");
      expect(formatApaCell(-1.99949)).toBe("-1.999");
      expect(formatApaCell(-1.99950)).toBe("-2.000");
    });

    it("renders integers and trailing-zero values with .000", () => {
      expect(formatApaCell(0)).toBe("0.000");
      expect(formatApaCell(2)).toBe("2.000");
      expect(formatApaCell(1.5)).toBe("1.500");
    });

    it("renders large numbers WITHOUT exponential notation", () => {
      expect(formatApaCell(12345)).toBe("12345.000");
      expect(formatApaCell(1234.5678)).toBe("1234.568");
    });

    it("renders very small numbers as 0.000 instead of exponential notation", () => {
      expect(formatApaCell(5.011e-7)).toBe("0.000");
      expect(formatApaCell(0.00001)).toBe("0.000");
      expect(formatApaCell(0.0004999)).toBe("0.000");
      expect(formatApaCell(0.0005)).toBe("0.001");
      expect(formatApaCell(-0.0005)).toBe("-0.001");
    });

    it("avoids negative-zero output", () => {
      expect(formatApaCell(-0.0001)).toBe("0.000");
    });

    it("handles non-numeric values", () => {
      expect(formatApaCell(null)).toBe("NA");
      expect(formatApaCell(undefined)).toBe("NA");
      expect(formatApaCell(true)).toBe("True");
      expect(formatApaCell(false)).toBe("False");
      expect(formatApaCell("text")).toBe("text");
    });

    it("handles non-finite numbers as NA", () => {
      expect(formatApaCell(Number.NaN)).toBe("NA");
      expect(formatApaCell(Number.POSITIVE_INFINITY)).toBe("NA");
      expect(formatApaCell(Number.NEGATIVE_INFINITY)).toBe("NA");
    });
  });

  describe("PCA tables", () => {
    const samplePayload = {
      explainedVarianceRatio: [0.6, 0.3, 0.1],
      cumulativeVarianceRatio: [0.6, 0.9, 1.0],
      eigenvalues: [1.8, 0.9, 0.3],
      loadings: { a: [0.8, 0.1, 0.0], b: [0.1, 0.7, 0.0], c: [0.0, 0.0, 0.5] },
      communalities: { a: 0.65, b: 0.5, c: 0.25 },
      sortedLoadings: [
        { variable: "a", dominantComponent: 1, dominantLoading: 0.8, loadings: [0.8, 0.1, 0.0] },
        { variable: "b", dominantComponent: 2, dominantLoading: 0.7, loadings: [0.1, 0.7, 0.0] }
      ],
      totalVarianceExplained: {
        initial: [
          { component: 1, eigenvalue: 1.8, variancePercent: 60, cumulativePercent: 60 },
          { component: 2, eigenvalue: 0.9, variancePercent: 30, cumulativePercent: 90 },
          { component: 3, eigenvalue: 0.3, variancePercent: 10, cumulativePercent: 100 }
        ],
        extraction: [
          { component: 1, eigenvalue: 1.8, variancePercent: 60, cumulativePercent: 60 },
          { component: 2, eigenvalue: 0.9, variancePercent: 30, cumulativePercent: 90 }
        ],
        rotation: [
          { component: 1, eigenvalue: 1.5, variancePercent: 50, cumulativePercent: 50 },
          { component: 2, eigenvalue: 1.2, variancePercent: 40, cumulativePercent: 90 }
        ]
      },
      rotation: "varimax",
      sortBySize: true,
      variables: ["a", "b", "c"],
      nComponents: 2
    };

    it("emits Communalities table with variable column and initial/extraction", () => {
      const tables = buildTableData(samplePayload);
      const comm = tables.find((t) => t.title === "Communalities");
      expect(comm).toBeDefined();
      expect(comm!.columns).toEqual(["variable", "initial", "extraction"]);
      expect(comm!.rows).toHaveLength(3);
      expect(comm!.rows[0]).toMatchObject({ variable: "a", initial: 1, extraction: 0.65 });
    });

    it("emits Total Variance Explained with initial/extraction/rotation columns", () => {
      const tables = buildTableData(samplePayload);
      const tve = tables.find((t) => t.title === "Total Variance Explained");
      expect(tve).toBeDefined();
      expect(tve!.columns).toContain("initialEigenvalue");
      expect(tve!.columns).toContain("extractionEigenvalue");
      expect(tve!.columns).toContain("rotationEigenvalue");
      expect(tve!.rows).toHaveLength(3);
    });

    it("emits Rotated Component Matrix with only the selected (kaiser) components", () => {
      const tables = buildTableData(samplePayload);
      const matrix = tables.find((t) => t.title === "Rotated Component Matrix");
      expect(matrix).toBeDefined();
      expect(matrix!.columns).toEqual(["variable", "component1", "component2"]);
      expect(matrix!.rows[0]).toMatchObject({ variable: "a" });
    });
  });

  describe("Regression tables", () => {
    const samplePayload = {
      rSquared: 0.81,
      adjustedRSquared: 0.79,
      modelSummary: { r: 0.9, rSquared: 0.81, adjustedRSquared: 0.79, stdErrorOfEstimate: 1.234 },
      anova: {
        dependentVariable: "y",
        rows: [
          { source: "Regression", sumOfSquares: 100, df: 2, meanSquare: 50, fStatistic: 25, pValue: 0.001 },
          { source: "Residual", sumOfSquares: 20, df: 10, meanSquare: 2, fStatistic: null, pValue: null },
          { source: "Total", sumOfSquares: 120, df: 12, meanSquare: null, fStatistic: null, pValue: null }
        ]
      },
      fStatistic: 25,
      fPValue: 0.001,
      coefficients: [
        { variable: "const", coefficient: 1, stdError: 0.5, tStatistic: 2, pValue: 0.05, confidenceInterval: [0, 2] },
        { variable: "x1", coefficient: 0.5, stdError: 0.1, tStatistic: 5, pValue: 0.001, confidenceInterval: [0.3, 0.7] }
      ],
      standardizedCoefficients: [
        { variable: "const", coefficient: 0, stdError: 0.5, tStatistic: 2, pValue: 0.05, confidenceInterval: [0, 0] },
        { variable: "x1", coefficient: 0.72, stdError: 0.1, tStatistic: 5, pValue: 0.001, confidenceInterval: [0.5, 0.94] }
      ],
      multicollinearity: [{ variable: "x1", tolerance: 1, vif: 1 }],
      durbinWatson: 2.05,
      observations: 13,
      degreesOfFreedom: 10,
      residualStdError: 1.234,
      method: "enter"
    };

    it("emits Model Summary with R, R², Adjusted R², SEE", () => {
      const tables = buildTableData(samplePayload);
      const ms = tables.find((t) => t.title === "Model Summary");
      expect(ms).toBeDefined();
      expect(ms!.columns).toEqual(["r", "rSquared", "adjustedRSquared", "stdErrorOfEstimate", "durbinWatson"]);
      expect(ms!.rows[0]).toMatchObject({ r: 0.9, rSquared: 0.81, adjustedRSquared: 0.79, stdErrorOfEstimate: 1.234 });
    });

    it("emits ANOVA table with dependent variable annotation", () => {
      const tables = buildTableData(samplePayload);
      const anova = tables.find((t) => t.title.startsWith("ANOVA"));
      expect(anova).toBeDefined();
      expect(anova!.title).toContain("Dependent: y");
      expect(anova!.columns).toEqual(["source", "sumOfSquares", "df", "meanSquare", "fStatistic", "pValue"]);
      expect(anova!.rows).toHaveLength(3);
    });

    it("emits unified Coefficients table including standardized Beta column", () => {
      const tables = buildTableData(samplePayload);
      const coef = tables.find((t) => t.title === "Coefficients");
      expect(coef).toBeDefined();
      expect(coef!.columns).toEqual(["variable", "b", "stdError", "beta", "t", "p", "ci"]);
      const constRow = coef!.rows.find((r) => r.variable === "(Constant)");
      expect(constRow).toBeDefined();
      expect(constRow!.beta).toBe("");
      const x1Row = coef!.rows.find((r) => r.variable === "x1");
      expect(x1Row!.beta).toBe(0.72);
    });
  });

  describe("Cronbach Alpha tables", () => {
    const payload = {
      alpha: 0.83,
      standardizedAlpha: 0.835,
      nItems: 3,
      nObservations: 95,
      interItemCorrelationMean: 0.62,
      itemAnalysis: [
        {
          item: "q1",
          itemMean: 3.8,
          itemStd: 0.9,
          scaleMeanIfItemDeleted: 7.2,
          scaleStdIfItemDeleted: 1.4,
          correctedItemTotalCorrelation: 0.72,
          alphaIfItemDeleted: 0.81
        },
        {
          item: "q2",
          itemMean: 4.1,
          itemStd: 0.8,
          scaleMeanIfItemDeleted: 6.9,
          scaleStdIfItemDeleted: 1.5,
          correctedItemTotalCorrelation: 0.68,
          alphaIfItemDeleted: 0.82
        }
      ],
      caseProcessing: { valid: 95, excluded: 5, total: 100 },
      scaleStatistics: { nItems: 3, mean: 11.0, std: 2.1, minimum: 5, maximum: 15 }
    };

    it("emits Case Processing Summary with N and percent", () => {
      const tables = buildTableData(payload);
      const cp = tables.find((t) => t.title === "Case Processing Summary");
      expect(cp).toBeDefined();
      expect(cp!.columns).toEqual(["cases", "n", "percent"]);
      expect(cp!.rows).toEqual([
        { cases: "Valid", n: 95, percent: 95 },
        { cases: "Excluded", n: 5, percent: 5 },
        { cases: "Total", n: 100, percent: 100 }
      ]);
    });

    it("emits Reliability Statistics with alpha and N of items", () => {
      const tables = buildTableData(payload);
      const rel = tables.find((t) => t.title === "Reliability Statistics");
      expect(rel).toBeDefined();
      expect(rel!.columns).toEqual(["cronbachAlpha", "nOfItems"]);
      expect(rel!.rows).toEqual([{ cronbachAlpha: 0.83, nOfItems: 3 }]);
    });

    it("emits Item Statistics with mean, std, N per item", () => {
      const tables = buildTableData(payload);
      const it = tables.find((t) => t.title === "Item Statistics");
      expect(it).toBeDefined();
      expect(it!.columns).toEqual(["item", "mean", "stdDeviation", "n"]);
      expect(it!.rows).toEqual([
        { item: "q1", mean: 3.8, stdDeviation: 0.9, n: 95 },
        { item: "q2", mean: 4.1, stdDeviation: 0.8, n: 95 }
      ]);
    });

    it("emits Item-Total Statistics with Scale Mean/Std if Deleted, CITC, alpha if deleted", () => {
      const tables = buildTableData(payload);
      const itt = tables.find((t) => t.title === "Item-Total Statistics");
      expect(itt).toBeDefined();
      expect(itt!.columns).toEqual([
        "item",
        "scaleMeanIfItemDeleted",
        "scaleStdIfItemDeleted",
        "correctedItemTotalCorrelation",
        "alphaIfItemDeleted"
      ]);
      expect(itt!.rows[0]).toEqual({
        item: "q1",
        scaleMeanIfItemDeleted: 7.2,
        scaleStdIfItemDeleted: 1.4,
        correctedItemTotalCorrelation: 0.72,
        alphaIfItemDeleted: 0.81
      });
    });

    it("emits Scale Statistics", () => {
      const tables = buildTableData(payload);
      const ss = tables.find((t) => t.title === "Scale Statistics");
      expect(ss).toBeDefined();
      expect(ss!.columns).toEqual(["nOfItems", "minimum", "maximum", "mean", "stdDeviation"]);
      expect(ss!.rows).toEqual([
        { nOfItems: 3, minimum: 5, maximum: 15, mean: 11.0, stdDeviation: 2.1 }
      ]);
    });

    it("returns the five Cronbach tables in canonical order", () => {
      const tables = buildTableData(payload);
      expect(tables.map((t) => t.title)).toEqual([
        "Case Processing Summary",
        "Reliability Statistics",
        "Item Statistics",
        "Item-Total Statistics",
        "Scale Statistics"
      ]);
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

describe("buildTableData — per-analysis tables", () => {
  // Real output from @winm2m/inferential-stats-js 1.8.0 for a 2x2 table of
  // 45/55 and 25/75. scipy applies Yates' correction at 2x2, hence 7.934.
  const crosstabsPayload = {
    rowVariable: "row",
    colVariable: "column",
    rowLabels: ["Flow A", "Flow B"],
    colLabels: ["Did not", "Upgraded"],
    table: [
      { row: "Flow A", col: "Did not", observed: 55, expected: 65, rowPercentage: 55, colPercentage: 42.308, totalPercentage: 27.5 },
      { row: "Flow A", col: "Upgraded", observed: 45, expected: 35, rowPercentage: 45, colPercentage: 64.286, totalPercentage: 22.5 },
      { row: "Flow B", col: "Did not", observed: 75, expected: 65, rowPercentage: 75, colPercentage: 57.692, totalPercentage: 37.5 },
      { row: "Flow B", col: "Upgraded", observed: 25, expected: 35, rowPercentage: 25, colPercentage: 35.714, totalPercentage: 12.5 }
    ],
    chiSquare: 7.934066,
    degreesOfFreedom: 1,
    pValue: 0.004855,
    cramersV: 0.199249
  };

  it("keeps the chi-square statistics that the generic fallback dropped", () => {
    const tables = buildTableData(crosstabsPayload);
    const titles = tables.map((table) => table.title);
    expect(titles).toEqual(["Crosstabulation", "Chi-Square Tests", "Symmetric Measures"]);

    const chi = tables[1].rows[0];
    expect(chi.value).toBeCloseTo(7.934066, 6);
    expect(chi.df).toBe(1);
    expect(chi.asymptoticSignificance).toBeCloseTo(0.004855, 6);
    expect(tables[1].rows[1]).toMatchObject({ test: "N of Valid Cases", value: 200 });
  });

  it("reports the expected-count assumption alongside the effect size", () => {
    const tables = buildTableData(crosstabsPayload);
    expect(tables[2].rows[0]).toMatchObject({
      measure: "Cramér's V",
      cellsWithExpectedCountBelow5: 0,
      minimumExpectedCount: 35
    });
  });

  it("counts the cells that violate the expected-count rule", () => {
    const tables = buildTableData({
      ...crosstabsPayload,
      table: [
        { row: "A", col: "X", observed: 2, expected: 1.5 },
        { row: "A", col: "Y", observed: 8, expected: 8.5 },
        { row: "B", col: "X", observed: 1, expected: 1.5 },
        { row: "B", col: "Y", observed: 9, expected: 8.5 }
      ]
    });
    expect(tables[2].rows[0]).toMatchObject({ cellsWithExpectedCountBelow5: 2, minimumExpectedCount: 1.5 });
  });

  it("labels both variance assumptions of an independent t-test", () => {
    const tables = buildTableData({
      leveneTest: { statistic: 0.0252, pValue: 0.8755, equalVariance: true },
      equalVariance: {
        tStatistic: 5.5648, degreesOfFreedom: 14, pValue: 0.0000747, meanDifference: 8.125,
        confidenceInterval: [4.9942, 11.2558],
        group1Mean: 42.375, group1Std: 3.0208, group1N: 8,
        group2Mean: 34.25, group2Std: 2.8158, group2N: 8
      },
      unequalVariance: {
        tStatistic: 5.5648, degreesOfFreedom: 13.9306, pValue: 0.0000754, meanDifference: 8.125,
        confidenceInterval: [4.9924, 11.2576],
        group1Mean: 42.375, group1Std: 3.0208, group1N: 8,
        group2Mean: 34.25, group2Std: 2.8158, group2N: 8
      }
    });

    expect(tables.map((table) => table.title)).toEqual([
      "Group Statistics",
      "Levene's Test for Equality of Variances",
      "Independent Samples Test"
    ]);
    expect(tables[0].rows).toHaveLength(2);
    expect(tables[1].rows[0]).toMatchObject({ conclusion: "Equal variances assumed" });
    expect(tables[2].rows.map((row) => row.assumption)).toEqual([
      "Equal variances assumed",
      "Equal variances not assumed"
    ]);
    expect(tables[2].rows[0]).toMatchObject({ lower95: 4.9942, upper95: 11.2558 });
  });

  it("follows Levene's verdict when the variances differ", () => {
    const tables = buildTableData({
      leveneTest: { statistic: 9.1, pValue: 0.004, equalVariance: false },
      equalVariance: { tStatistic: 1, degreesOfFreedom: 10, pValue: 0.3, meanDifference: 1, confidenceInterval: [0, 2] },
      unequalVariance: { tStatistic: 1.2, degreesOfFreedom: 7.4, pValue: 0.26, meanDifference: 1, confidenceInterval: [0, 2] }
    });
    expect(tables[1].rows[0]).toMatchObject({ conclusion: "Equal variances not assumed" });
  });

  it("builds the paired samples tables", () => {
    const tables = buildTableData({
      tStatistic: -3.2, degreesOfFreedom: 19, pValue: 0.0047,
      meanDifference: -1.85, stdDifference: 2.58, confidenceInterval: [-3.06, -0.64],
      mean1: 4.2, mean2: 6.05, n: 20
    });
    expect(tables.map((table) => table.title)).toEqual(["Paired Samples Statistics", "Paired Samples Test"]);
    expect(tables[1].rows[0]).toMatchObject({ t: -3.2, df: 19, meanDifference: -1.85 });
  });

  it("builds an ANOVA table that totals its own sums of squares", () => {
    const tables = buildTableData({
      fStatistic: 12.4, pValue: 0.0002,
      degreesOfFreedomBetween: 2, degreesOfFreedomWithin: 27,
      sumOfSquaresBetween: 240.5, sumOfSquaresWithin: 261.8,
      meanSquareBetween: 120.25, meanSquareWithin: 9.7,
      etaSquared: 0.479,
      groupStats: [
        { group: "A", n: 10, mean: 5.1, std: 3.2 },
        { group: "B", n: 10, mean: 8.4, std: 3.0 },
        { group: "C", n: 10, mean: 11.9, std: 3.1 }
      ]
    });

    expect(tables.map((table) => table.title)).toEqual(["Descriptives", "ANOVA", "Effect Size"]);
    const total = tables[1].rows[2];
    expect(total).toMatchObject({ source: "Total", df: 29 });
    expect(total.sumOfSquares).toBeCloseTo(502.3, 6);
  });

  it("builds Tukey comparisons and names the alpha", () => {
    const tables = buildTableData({
      alpha: 0.05,
      comparisons: [
        { group1: "A", group2: "B", meanDifference: -3.3, pValue: 0.04, lowerCI: -6.5, upperCI: -0.1, reject: true },
        { group1: "A", group2: "C", meanDifference: -6.8, pValue: 0.0001, lowerCI: -10, upperCI: -3.6, reject: true }
      ]
    });
    expect(tables).toHaveLength(1);
    expect(tables[0].title).toContain("Tukey HSD");
    expect(tables[0].title).toContain("0.05");
    expect(tables[0].rows[0]).toMatchObject({ group1: "A", group2: "B", significantDifference: true });
  });

  it("titles descriptives and frequencies instead of dumping raw keys", () => {
    const descriptives = buildTableData({
      statistics: [
        { variable: "score", count: 30, mean: 7.2, std: 2.1, min: 2, max: 10, q25: 6, q50: 7, q75: 9, skewness: -0.4, kurtosis: 0.1 }
      ]
    });
    expect(descriptives[0].title).toBe("Descriptive Statistics");
    expect(descriptives[0].rows[0]).toMatchObject({ variable: "score", n: 30, minimum: 2, maximum: 10 });

    const frequencies = buildTableData({
      variable: "grade",
      totalCount: 40,
      frequencies: [
        { value: "A", count: 12, percentage: 30, cumulativePercentage: 30 },
        { value: "B", count: 28, percentage: 70, cumulativePercentage: 100 }
      ]
    });
    expect(frequencies[0].title).toBe("Frequencies — grade");
    expect(frequencies[0].columns[0]).toBe("grade");
    expect(frequencies[0].rows[1]).toMatchObject({ grade: "B", frequency: 28, cumulativePercent: 100 });
  });

  it("leaves unrecognised payloads on the generic path", () => {
    const tables = buildTableData({ somethingNew: { statistic: 1, value: 2 } });
    expect(tables[0].title).toBe("somethingNew");
  });

  it("does not mistake a Cronbach payload for a post-hoc one", () => {
    const tables = buildTableData({
      alpha: 0.87,
      nItems: 4,
      itemAnalysis: [{ item: "q1", itemMean: 3.1, itemStd: 0.9 }],
      scaleStatistics: { nItems: 4, minimum: 4, maximum: 20, mean: 12.4, std: 3.1 }
    });
    expect(tables.map((table) => table.title)).toContain("Reliability Statistics");
  });
});
