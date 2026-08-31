export type TableData = {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
};

function buildPcaTables(objectPayload: Record<string, unknown>): TableData[] {
  const explainedVarianceRatio = Array.isArray(objectPayload.explainedVarianceRatio)
    ? (objectPayload.explainedVarianceRatio as number[])
    : [];
  const eigenvalues = Array.isArray(objectPayload.eigenvalues) ? (objectPayload.eigenvalues as number[]) : [];
  const nComponents = typeof objectPayload.nComponents === "number" ? objectPayload.nComponents : explainedVarianceRatio.length;
  const variablesOrder = Array.isArray(objectPayload.variables)
    ? (objectPayload.variables as unknown[]).map((item) => String(item))
    : [];

  const tables: TableData[] = [];

  // Communalities table (Initial = 1.000 by convention, Extraction from payload)
  if (objectPayload.communalities && typeof objectPayload.communalities === "object" && !Array.isArray(objectPayload.communalities)) {
    const commRecord = objectPayload.communalities as Record<string, unknown>;
    const orderedVars = variablesOrder.length > 0 ? variablesOrder : Object.keys(commRecord);
    const rows = orderedVars.map((variable) => ({
      variable,
      initial: 1,
      extraction: commRecord[variable] ?? null
    }));

    tables.push({
      title: "Communalities",
      columns: ["variable", "initial", "extraction"],
      rows
    });
  }

  // Total Variance Explained (SPSS-style: Initial / Extraction / Rotation sums of squared loadings)
  const totalVariance = objectPayload.totalVarianceExplained && typeof objectPayload.totalVarianceExplained === "object"
    ? (objectPayload.totalVarianceExplained as Record<string, unknown>)
    : null;

  if (totalVariance) {
    const initial = Array.isArray(totalVariance.initial) ? (totalVariance.initial as Array<Record<string, unknown>>) : [];
    const extraction = Array.isArray(totalVariance.extraction) ? (totalVariance.extraction as Array<Record<string, unknown>>) : [];
    const rotation = Array.isArray(totalVariance.rotation) ? (totalVariance.rotation as Array<Record<string, unknown>>) : [];
    const hasRotation = rotation.length > 0;

    const rowCount = initial.length;
    const rows = Array.from({ length: rowCount }).map((_, index) => {
      const init = initial[index] ?? {};
      const ext = extraction[index] ?? null;
      const rot = hasRotation ? rotation[index] ?? null : null;
      const row: Record<string, unknown> = {
        component: init.component ?? index + 1,
        initialEigenvalue: init.eigenvalue ?? null,
        initialVariancePercent: init.variancePercent ?? null,
        initialCumulativePercent: init.cumulativePercent ?? null,
        extractionEigenvalue: ext ? ext.eigenvalue ?? null : null,
        extractionVariancePercent: ext ? ext.variancePercent ?? null : null,
        extractionCumulativePercent: ext ? ext.cumulativePercent ?? null : null
      };
      if (hasRotation) {
        row.rotationEigenvalue = rot ? rot.eigenvalue ?? null : null;
        row.rotationVariancePercent = rot ? rot.variancePercent ?? null : null;
        row.rotationCumulativePercent = rot ? rot.cumulativePercent ?? null : null;
      }
      return row;
    });

    const columns = [
      "component",
      "initialEigenvalue",
      "initialVariancePercent",
      "initialCumulativePercent",
      "extractionEigenvalue",
      "extractionVariancePercent",
      "extractionCumulativePercent",
      ...(hasRotation
        ? ["rotationEigenvalue", "rotationVariancePercent", "rotationCumulativePercent"]
        : [])
    ];

    tables.push({
      title: "Total Variance Explained",
      columns,
      rows
    });
  } else if (explainedVarianceRatio.length > 0 || eigenvalues.length > 0) {
    // Legacy fallback when Python did not return totalVarianceExplained
    const cumulativeVarianceRatio = Array.isArray(objectPayload.cumulativeVarianceRatio)
      ? (objectPayload.cumulativeVarianceRatio as number[])
      : [];
    const rowCount = Math.max(explainedVarianceRatio.length, eigenvalues.length, cumulativeVarianceRatio.length, nComponents || 0);
    const rows = Array.from({ length: rowCount }).map((_, index) => ({
      component: index + 1,
      eigenvalue: eigenvalues[index] ?? null,
      variancePercent: typeof explainedVarianceRatio[index] === "number" ? explainedVarianceRatio[index] * 100 : null,
      cumulativePercent: typeof cumulativeVarianceRatio[index] === "number" ? cumulativeVarianceRatio[index] * 100 : null
    }));

    tables.push({
      title: "Total Variance Explained",
      columns: ["component", "eigenvalue", "variancePercent", "cumulativePercent"],
      rows
    });
  }

  // Component Matrix: only the selected (kept) components, first column = variable name
  const componentCount = typeof nComponents === "number" && nComponents > 0 ? nComponents : 0;
  const loadingColumns = Array.from({ length: componentCount }).map((_, idx) => `component${idx + 1}`);

  const sortedLoadings = Array.isArray(objectPayload.sortedLoadings)
    ? (objectPayload.sortedLoadings as Array<Record<string, unknown>>)
    : [];
  const sortBySize = objectPayload.sortBySize !== false;
  const rotation = typeof objectPayload.rotation === "string" ? objectPayload.rotation : "none";
  const matrixTitle = rotation === "varimax" ? "Rotated Component Matrix" : "Component Matrix";

  if (sortBySize && sortedLoadings.length > 0 && loadingColumns.length > 0) {
    const rows = sortedLoadings.map((item) => {
      const row: Record<string, unknown> = { variable: item.variable ?? "" };
      const loadings = Array.isArray(item.loadings) ? (item.loadings as unknown[]) : [];
      loadingColumns.forEach((column, index) => {
        row[column] = loadings[index] ?? null;
      });
      return row;
    });
    tables.push({
      title: matrixTitle,
      columns: ["variable", ...loadingColumns],
      rows
    });
  } else if (objectPayload.loadings && typeof objectPayload.loadings === "object" && !Array.isArray(objectPayload.loadings)) {
    const loadingsRecord = objectPayload.loadings as Record<string, unknown>;
    const orderedVars = variablesOrder.length > 0 ? variablesOrder : Object.keys(loadingsRecord);
    const rows = orderedVars.map((variable) => {
      const row: Record<string, unknown> = { variable };
      const values = Array.isArray(loadingsRecord[variable]) ? (loadingsRecord[variable] as unknown[]) : [];
      loadingColumns.forEach((column, index) => {
        row[column] = values[index] ?? null;
      });
      return row;
    });
    tables.push({
      title: matrixTitle,
      columns: ["variable", ...loadingColumns],
      rows
    });
  }

  return tables;
}

function buildCronbachTables(objectPayload: Record<string, unknown>): TableData[] {
  const tables: TableData[] = [];

  // 1) Case Processing Summary
  const caseProcessingRaw = objectPayload.caseProcessing;
  if (caseProcessingRaw && typeof caseProcessingRaw === "object" && !Array.isArray(caseProcessingRaw)) {
    const cp = caseProcessingRaw as Record<string, unknown>;
    const valid = typeof cp.valid === "number" ? cp.valid : null;
    const excluded = typeof cp.excluded === "number" ? cp.excluded : null;
    const total = typeof cp.total === "number" ? cp.total : null;
    const safeTotal = typeof total === "number" && total > 0 ? total : null;
    const pct = (n: number | null): number | null =>
      n !== null && safeTotal !== null ? Number(((n / safeTotal) * 100).toFixed(2)) : null;

    tables.push({
      title: "Case Processing Summary",
      columns: ["cases", "n", "percent"],
      rows: [
        { cases: "Valid", n: valid, percent: pct(valid) },
        { cases: "Excluded", n: excluded, percent: pct(excluded) },
        { cases: "Total", n: total, percent: total !== null ? 100 : null }
      ]
    });
  }

  // 2) Reliability Statistics
  if (typeof objectPayload.alpha === "number" || typeof objectPayload.nItems === "number") {
    tables.push({
      title: "Reliability Statistics",
      columns: ["cronbachAlpha", "nOfItems"],
      rows: [
        {
          cronbachAlpha: typeof objectPayload.alpha === "number" ? objectPayload.alpha : null,
          nOfItems: typeof objectPayload.nItems === "number" ? objectPayload.nItems : null
        }
      ]
    });
  }

  // 3) Item Statistics
  const itemAnalysis = Array.isArray(objectPayload.itemAnalysis)
    ? (objectPayload.itemAnalysis as Array<Record<string, unknown>>)
    : [];

  const nObservations = typeof objectPayload.nObservations === "number" ? objectPayload.nObservations : null;

  if (itemAnalysis.length > 0) {
    tables.push({
      title: "Item Statistics",
      columns: ["item", "mean", "stdDeviation", "n"],
      rows: itemAnalysis.map((row) => ({
        item: row.item ?? null,
        mean: typeof row.itemMean === "number" ? row.itemMean : null,
        stdDeviation: typeof row.itemStd === "number" ? row.itemStd : null,
        n: nObservations
      }))
    });

    // 4) Item-Total Statistics
    tables.push({
      title: "Item-Total Statistics",
      columns: [
        "item",
        "scaleMeanIfItemDeleted",
        "scaleStdIfItemDeleted",
        "correctedItemTotalCorrelation",
        "alphaIfItemDeleted"
      ],
      rows: itemAnalysis.map((row) => ({
        item: row.item ?? null,
        scaleMeanIfItemDeleted:
          typeof row.scaleMeanIfItemDeleted === "number" ? row.scaleMeanIfItemDeleted : null,
        scaleStdIfItemDeleted:
          typeof row.scaleStdIfItemDeleted === "number" ? row.scaleStdIfItemDeleted : null,
        correctedItemTotalCorrelation:
          typeof row.correctedItemTotalCorrelation === "number" ? row.correctedItemTotalCorrelation : null,
        alphaIfItemDeleted:
          typeof row.alphaIfItemDeleted === "number" ? row.alphaIfItemDeleted : null
      }))
    });
  }

  // 5) Scale Statistics
  const scaleStatsRaw = objectPayload.scaleStatistics;
  if (scaleStatsRaw && typeof scaleStatsRaw === "object" && !Array.isArray(scaleStatsRaw)) {
    const ss = scaleStatsRaw as Record<string, unknown>;
    tables.push({
      title: "Scale Statistics",
      columns: ["nOfItems", "minimum", "maximum", "mean", "stdDeviation"],
      rows: [
        {
          nOfItems: typeof ss.nItems === "number" ? ss.nItems : null,
          minimum: typeof ss.minimum === "number" ? ss.minimum : null,
          maximum: typeof ss.maximum === "number" ? ss.maximum : null,
          mean: typeof ss.mean === "number" ? ss.mean : null,
          stdDeviation: typeof ss.std === "number" ? ss.std : null
        }
      ]
    });
  }

  return tables;
}

function buildRegressionTables(objectPayload: Record<string, unknown>): TableData[] {
  const tables: TableData[] = [];

  const modelSummary = objectPayload.modelSummary && typeof objectPayload.modelSummary === "object"
    ? (objectPayload.modelSummary as Record<string, unknown>)
    : null;

  // Model Summary (SPSS-style: R, R², Adjusted R², Std. Error of the Estimate)
  const rSquared = modelSummary?.rSquared ?? objectPayload.rSquared;
  const adjustedRSquared = modelSummary?.adjustedRSquared ?? objectPayload.adjustedRSquared;
  const rValue = modelSummary?.r
    ?? (typeof rSquared === "number" && Number.isFinite(rSquared) && rSquared >= 0 ? Math.sqrt(rSquared) : null);
  const stdErrorOfEstimate = modelSummary?.stdErrorOfEstimate ?? objectPayload.residualStdError ?? null;

  tables.push({
    title: "Model Summary",
    columns: ["r", "rSquared", "adjustedRSquared", "stdErrorOfEstimate", "durbinWatson"],
    rows: [
      {
        r: rValue,
        rSquared,
        adjustedRSquared,
        stdErrorOfEstimate,
        durbinWatson: objectPayload.durbinWatson ?? null
      }
    ]
  });

  // ANOVA table
  const anova = objectPayload.anova && typeof objectPayload.anova === "object"
    ? (objectPayload.anova as Record<string, unknown>)
    : null;
  const anovaRows = anova && Array.isArray(anova.rows)
    ? (anova.rows as Array<Record<string, unknown>>)
    : [];
  if (anovaRows.length > 0) {
    const dependent = typeof anova?.dependentVariable === "string" ? anova.dependentVariable : "";
    const titleSuffix = dependent ? ` (Dependent: ${dependent})` : "";
    tables.push({
      title: `ANOVA${titleSuffix}`,
      columns: ["source", "sumOfSquares", "df", "meanSquare", "fStatistic", "pValue"],
      rows: anovaRows
    });
  }

  // Coefficients (Unstandardized B + Standardized Beta merged into single SPSS-style table)
  const coefficients = Array.isArray(objectPayload.coefficients)
    ? (objectPayload.coefficients as Array<Record<string, unknown>>)
    : [];
  const standardizedCoefficients = Array.isArray(objectPayload.standardizedCoefficients)
    ? (objectPayload.standardizedCoefficients as Array<Record<string, unknown>>)
    : [];
  if (coefficients.length > 0) {
    const betaByVariable = new Map<string, number | null>();
    for (const std of standardizedCoefficients) {
      const varName = std.variable !== undefined ? String(std.variable) : "";
      const beta = typeof std.coefficient === "number" ? std.coefficient : null;
      betaByVariable.set(varName, beta);
    }
    const rows = coefficients.map((coef) => {
      const variableName = coef.variable !== undefined ? String(coef.variable) : "";
      const isConstant = variableName === "const" || variableName === "(Constant)";
      // For the constant term beta is not defined; render as an empty string
      // (rather than "NA") to match SPSS coefficient table convention where
      // the intercept row's standardised column is left blank.
      const beta: number | string = isConstant ? "" : betaByVariable.get(variableName) ?? "";
      const ci = Array.isArray(coef.confidenceInterval) ? coef.confidenceInterval : null;
      return {
        variable: isConstant ? "(Constant)" : variableName,
        b: coef.coefficient,
        stdError: coef.stdError,
        beta,
        t: coef.tStatistic,
        p: coef.pValue,
        ci: ci ? `[${formatApaValue(ci[0])}, ${formatApaValue(ci[1])}]` : "NA"
      };
    });
    tables.push({
      title: "Coefficients",
      columns: ["variable", "b", "stdError", "beta", "t", "p", "ci"],
      rows
    });
  }

  const multicollinearity = Array.isArray(objectPayload.multicollinearity)
    ? (objectPayload.multicollinearity as Array<Record<string, unknown>>)
    : [];
  if (multicollinearity.length > 0) {
    tables.push({
      title: "Collinearity Statistics",
      columns: ["variable", "tolerance", "vif"],
      rows: multicollinearity
    });
  }

  // Method / selected variables footnote-style summary
  const selectedVariables = Array.isArray(objectPayload.selectedVariables)
    ? (objectPayload.selectedVariables as unknown[]).map((item) => String(item))
    : [];
  if (selectedVariables.length > 0 || objectPayload.method) {
    tables.push({
      title: "Method",
      columns: ["statistic", "value"],
      rows: [
        { statistic: "method", value: objectPayload.method ?? "enter" },
        { statistic: "selectedVariables", value: selectedVariables.join(", ") },
        { statistic: "observations", value: objectPayload.observations ?? null },
        { statistic: "degreesOfFreedom", value: objectPayload.degreesOfFreedom ?? null }
      ]
    });
  }

  return tables;
}

function formatApaValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "NA";
    }
    // Round-half-away-from-zero to 3 decimals.  JS Math.round uses
    // round-half-up which behaves asymmetrically for negative .5 ties, so
    // we apply the sign manually.
    const sign = value < 0 ? -1 : 1;
    const rounded = sign * Math.round(Math.abs(value) * 1000) / 1000;
    const safe = Object.is(rounded, -0) ? 0 : rounded;
    return safe.toFixed(3);
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (value === null || value === undefined) {
    return "NA";
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatApaValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

const num = (value: unknown): number | null => (typeof value === "number" ? value : null);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item))
    ? (value as Array<Record<string, unknown>>)
    : [];

/**
 * Crosstabulation plus the chi-square test.
 *
 * The generic fallback below only emits arrays and nested objects, so for this payload it
 * rendered the cell table and silently dropped chiSquare, degreesOfFreedom, pValue and
 * cramersV — every number the test actually reports.
 */
function buildCrosstabsTables(objectPayload: Record<string, unknown>): TableData[] {
  const tables: TableData[] = [];
  const cells = asRecordArray(objectPayload.table);
  const rowVariable = typeof objectPayload.rowVariable === "string" ? objectPayload.rowVariable : "row";
  const colVariable = typeof objectPayload.colVariable === "string" ? objectPayload.colVariable : "column";

  if (cells.length > 0) {
    tables.push({
      title: "Crosstabulation",
      columns: [rowVariable, colVariable, "observed", "expected", "percentOfRow", "percentOfColumn", "percentOfTotal"],
      rows: cells.map((cell) => ({
        [rowVariable]: cell.row ?? null,
        [colVariable]: cell.col ?? null,
        observed: num(cell.observed),
        expected: num(cell.expected),
        percentOfRow: num(cell.rowPercentage),
        percentOfColumn: num(cell.colPercentage),
        percentOfTotal: num(cell.totalPercentage)
      }))
    });
  }

  const chiSquare = num(objectPayload.chiSquare);
  if (chiSquare !== null) {
    const observedTotal = cells.reduce((sum, cell) => sum + (num(cell.observed) ?? 0), 0);
    const minExpected = cells.reduce<number | null>((lowest, cell) => {
      const expected = num(cell.expected);
      if (expected === null) return lowest;
      return lowest === null || expected < lowest ? expected : lowest;
    }, null);
    const belowFive = cells.filter((cell) => (num(cell.expected) ?? Infinity) < 5).length;

    tables.push({
      title: "Chi-Square Tests",
      columns: ["test", "value", "df", "asymptoticSignificance"],
      rows: [
        {
          test: "Pearson Chi-Square",
          value: chiSquare,
          df: num(objectPayload.degreesOfFreedom),
          asymptoticSignificance: num(objectPayload.pValue)
        },
        {
          test: "N of Valid Cases",
          value: cells.length > 0 ? observedTotal : null,
          df: null,
          asymptoticSignificance: null
        }
      ]
    });

    // SPSS prints this note under the table, and it is the assumption people skip.
    if (cells.length > 0 && minExpected !== null) {
      tables.push({
        title: "Symmetric Measures",
        columns: ["measure", "value", "cellsWithExpectedCountBelow5", "minimumExpectedCount"],
        rows: [
          {
            measure: "Cramér's V",
            value: num(objectPayload.cramersV),
            cellsWithExpectedCountBelow5: belowFive,
            minimumExpectedCount: minExpected
          }
        ]
      });
    }
  }

  return tables;
}

const T_TEST_COLUMNS = [
  "assumption",
  "t",
  "df",
  "significanceTwoTailed",
  "meanDifference",
  "lower95",
  "upper95"
];

const tTestRow = (assumption: string, source: Record<string, unknown>): Record<string, unknown> => {
  const ci = Array.isArray(source.confidenceInterval) ? (source.confidenceInterval as unknown[]) : [];
  return {
    assumption,
    t: num(source.tStatistic),
    df: num(source.degreesOfFreedom),
    significanceTwoTailed: num(source.pValue),
    meanDifference: num(source.meanDifference),
    lower95: num(ci[0]),
    upper95: num(ci[1])
  };
};

/** Independent samples t-test: group statistics, Levene's test, and both variance rows. */
function buildIndependentTTestTables(objectPayload: Record<string, unknown>): TableData[] {
  const equal = asRecord(objectPayload.equalVariance);
  const unequal = asRecord(objectPayload.unequalVariance);
  const levene = asRecord(objectPayload.leveneTest);
  const stats = equal ?? unequal;
  const tables: TableData[] = [];

  if (stats) {
    tables.push({
      title: "Group Statistics",
      columns: ["group", "n", "mean", "stdDeviation"],
      rows: [
        { group: "Group 1", n: num(stats.group1N), mean: num(stats.group1Mean), stdDeviation: num(stats.group1Std) },
        { group: "Group 2", n: num(stats.group2N), mean: num(stats.group2Mean), stdDeviation: num(stats.group2Std) }
      ]
    });
  }

  if (levene) {
    tables.push({
      title: "Levene's Test for Equality of Variances",
      columns: ["f", "significance", "conclusion"],
      rows: [
        {
          f: num(levene.statistic),
          significance: num(levene.pValue),
          conclusion: levene.equalVariance === false ? "Equal variances not assumed" : "Equal variances assumed"
        }
      ]
    });
  }

  const rows: Array<Record<string, unknown>> = [];
  if (equal) rows.push(tTestRow("Equal variances assumed", equal));
  if (unequal) rows.push(tTestRow("Equal variances not assumed", unequal));
  if (rows.length > 0) {
    tables.push({ title: "Independent Samples Test", columns: T_TEST_COLUMNS, rows });
  }

  return tables;
}

/** Paired samples t-test. */
function buildPairedTTestTables(objectPayload: Record<string, unknown>): TableData[] {
  const ci = Array.isArray(objectPayload.confidenceInterval) ? (objectPayload.confidenceInterval as unknown[]) : [];
  return [
    {
      title: "Paired Samples Statistics",
      columns: ["pair", "mean", "n"],
      rows: [
        { pair: "Variable 1", mean: num(objectPayload.mean1), n: num(objectPayload.n) },
        { pair: "Variable 2", mean: num(objectPayload.mean2), n: num(objectPayload.n) }
      ]
    },
    {
      title: "Paired Samples Test",
      columns: ["meanDifference", "stdDeviation", "lower95", "upper95", "t", "df", "significanceTwoTailed"],
      rows: [
        {
          meanDifference: num(objectPayload.meanDifference),
          stdDeviation: num(objectPayload.stdDifference),
          lower95: num(ci[0]),
          upper95: num(ci[1]),
          t: num(objectPayload.tStatistic),
          df: num(objectPayload.degreesOfFreedom),
          significanceTwoTailed: num(objectPayload.pValue)
        }
      ]
    }
  ];
}

/** One-way ANOVA: descriptives per group plus the sums-of-squares table. */
function buildAnovaTables(objectPayload: Record<string, unknown>): TableData[] {
  const tables: TableData[] = [];
  const groupStats = asRecordArray(objectPayload.groupStats);

  if (groupStats.length > 0) {
    tables.push({
      title: "Descriptives",
      columns: ["group", "n", "mean", "stdDeviation"],
      rows: groupStats.map((group) => ({
        group: group.group ?? null,
        n: num(group.n),
        mean: num(group.mean),
        stdDeviation: num(group.std)
      }))
    });
  }

  const dfBetween = num(objectPayload.degreesOfFreedomBetween);
  const dfWithin = num(objectPayload.degreesOfFreedomWithin);
  const ssBetween = num(objectPayload.sumOfSquaresBetween);
  const ssWithin = num(objectPayload.sumOfSquaresWithin);

  tables.push({
    title: "ANOVA",
    columns: ["source", "sumOfSquares", "df", "meanSquare", "f", "significance"],
    rows: [
      {
        source: "Between Groups",
        sumOfSquares: ssBetween,
        df: dfBetween,
        meanSquare: num(objectPayload.meanSquareBetween),
        f: num(objectPayload.fStatistic),
        significance: num(objectPayload.pValue)
      },
      {
        source: "Within Groups",
        sumOfSquares: ssWithin,
        df: dfWithin,
        meanSquare: num(objectPayload.meanSquareWithin),
        f: null,
        significance: null
      },
      {
        source: "Total",
        sumOfSquares: ssBetween !== null && ssWithin !== null ? ssBetween + ssWithin : null,
        df: dfBetween !== null && dfWithin !== null ? dfBetween + dfWithin : null,
        meanSquare: null,
        f: null,
        significance: null
      }
    ]
  });

  const etaSquared = num(objectPayload.etaSquared);
  if (etaSquared !== null) {
    tables.push({
      title: "Effect Size",
      columns: ["measure", "value"],
      rows: [{ measure: "Eta-squared", value: etaSquared }]
    });
  }

  return tables;
}

/** Tukey HSD pairwise comparisons. */
function buildPostHocTables(objectPayload: Record<string, unknown>): TableData[] {
  const comparisons = asRecordArray(objectPayload.comparisons);
  if (comparisons.length === 0) return [];

  const alpha = num(objectPayload.alpha);
  return [
    {
      title: alpha !== null ? `Multiple Comparisons (Tukey HSD, alpha = ${alpha})` : "Multiple Comparisons (Tukey HSD)",
      columns: ["group1", "group2", "meanDifference", "significance", "lower95", "upper95", "significantDifference"],
      rows: comparisons.map((row) => ({
        group1: row.group1 ?? null,
        group2: row.group2 ?? null,
        meanDifference: num(row.meanDifference),
        significance: num(row.pValue),
        lower95: num(row.lowerCI),
        upper95: num(row.upperCI),
        significantDifference: row.reject === true
      }))
    }
  ];
}

/** Descriptives and frequencies already rendered; these only give them SPSS titles. */
function buildDescriptivesTables(objectPayload: Record<string, unknown>): TableData[] {
  const stats = asRecordArray(objectPayload.statistics);
  if (stats.length === 0) return [];
  return [
    {
      title: "Descriptive Statistics",
      columns: ["variable", "n", "minimum", "maximum", "mean", "stdDeviation", "skewness", "kurtosis"],
      rows: stats.map((row) => ({
        variable: row.variable ?? null,
        n: num(row.count),
        minimum: num(row.min),
        maximum: num(row.max),
        mean: num(row.mean),
        stdDeviation: num(row.std),
        skewness: num(row.skewness),
        kurtosis: num(row.kurtosis)
      }))
    }
  ];
}

function buildFrequenciesTables(objectPayload: Record<string, unknown>): TableData[] {
  const items = asRecordArray(objectPayload.frequencies);
  if (items.length === 0) return [];
  const variable = typeof objectPayload.variable === "string" ? objectPayload.variable : "value";
  return [
    {
      title: `Frequencies — ${variable}`,
      columns: [variable, "frequency", "percent", "cumulativePercent"],
      rows: items.map((row) => ({
        [variable]: row.value ?? null,
        frequency: num(row.count),
        percent: num(row.percentage),
        cumulativePercent: num(row.cumulativePercentage)
      }))
    }
  ];
}

export function buildTableData(raw: unknown): TableData[] {
  const result = raw as { success?: boolean; data?: unknown } | null;
  const payload = result && typeof result === "object" && "data" in result ? result.data : raw;

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;
  const isPcaPayload =
    "explainedVarianceRatio" in objectPayload &&
    "loadings" in objectPayload &&
    ("eigenvalues" in objectPayload || "communalities" in objectPayload || "sortedLoadings" in objectPayload);

  if (isPcaPayload) {
    const pcaTables = buildPcaTables(objectPayload);
    if (pcaTables.length > 0) {
      return pcaTables;
    }
  }

  const isRegressionPayload =
    "rSquared" in objectPayload &&
    "adjustedRSquared" in objectPayload &&
    "coefficients" in objectPayload &&
    ("modelSummary" in objectPayload || "anova" in objectPayload || "standardizedCoefficients" in objectPayload || "multicollinearity" in objectPayload);

  if (isRegressionPayload) {
    const regressionTables = buildRegressionTables(objectPayload);
    if (regressionTables.length > 0) {
      return regressionTables;
    }
  }

  const isCronbachPayload =
    "alpha" in objectPayload &&
    "itemAnalysis" in objectPayload &&
    Array.isArray((objectPayload as { itemAnalysis?: unknown }).itemAnalysis) &&
    ("standardizedAlpha" in objectPayload ||
      "interItemCorrelationMean" in objectPayload ||
      "caseProcessing" in objectPayload ||
      "scaleStatistics" in objectPayload);

  if (isCronbachPayload) {
    const cronbachTables = buildCronbachTables(objectPayload);
    if (cronbachTables.length > 0) {
      return cronbachTables;
    }
  }

  // Shape-matched builders. Each guard names fields unique to that analysis so a payload
  // can only take one branch; anything unmatched still falls through to the generic dump
  // below, which is what every other analysis relied on before these existed.
  const matched =
    ("chiSquare" in objectPayload && "table" in objectPayload && "cramersV" in objectPayload
      ? buildCrosstabsTables(objectPayload)
      : null) ??
    ("leveneTest" in objectPayload && "equalVariance" in objectPayload && "unequalVariance" in objectPayload
      ? buildIndependentTTestTables(objectPayload)
      : null) ??
    ("mean1" in objectPayload && "mean2" in objectPayload && "stdDifference" in objectPayload
      ? buildPairedTTestTables(objectPayload)
      : null) ??
    ("fStatistic" in objectPayload && "groupStats" in objectPayload && "sumOfSquaresBetween" in objectPayload
      ? buildAnovaTables(objectPayload)
      : null) ??
    ("comparisons" in objectPayload && "alpha" in objectPayload && !("itemAnalysis" in objectPayload)
      ? buildPostHocTables(objectPayload)
      : null) ??
    ("statistics" in objectPayload && asRecordArray(objectPayload.statistics).some((row) => "skewness" in row)
      ? buildDescriptivesTables(objectPayload)
      : null) ??
    ("frequencies" in objectPayload && "totalCount" in objectPayload
      ? buildFrequenciesTables(objectPayload)
      : null);

  if (matched && matched.length > 0) {
    return matched;
  }

  const tables: TableData[] = [];

  for (const [key, value] of Object.entries(objectPayload)) {
    if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "object" && item !== null)) {
      const rows = value as Array<Record<string, unknown>>;
      const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
      tables.push({ title: key, columns, rows });
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const row = value as Record<string, unknown>;
      tables.push({
        title: key,
        columns: ["statistic", "value"],
        rows: Object.entries(row).map(([stat, val]) => ({ statistic: stat, value: val }))
      });
    }
  }

  if (tables.length > 0) {
    return tables;
  }

  return [
    {
      title: "Summary",
      columns: ["statistic", "value"],
      rows: Object.entries(objectPayload).map(([stat, val]) => ({ statistic: stat, value: val }))
    }
  ];
}

export function formatApaCell(value: unknown): string {
  return formatApaValue(value);
}

function buildApaClipboardText(tables: TableData[]): string {
  return tables
    .map((table, index) => {
      const header = [`Table ${index + 1}`, table.title].join("\t");
      const columns = table.columns.join("\t");
      const rows = table.rows.map((row) => table.columns.map((column) => formatApaValue(row[column])).join("\t")).join("\n");
      return `${header}\n${columns}\n${rows}`;
    })
    .join("\n\n");
}

export function buildApaClipboardHtml(tables: TableData[]): string {
  const sections = tables
    .map((table, index) => {
      const widths =
        table.columns.length === 2 && table.columns[0] === "statistic" && table.columns[1] === "value"
          ? ["40%", "60%"]
          : table.columns.map(() => `${(100 / Math.max(1, table.columns.length)).toFixed(2)}%`);

      const colgroup = widths.map((width) => `<col style="width:${width};" />`).join("");
      const headerCells = table.columns
        .map(
          (column) =>
            `<th style="padding:6px 8px;text-align:left;font-weight:600;font-size:12px;border-top:1px solid #0f172a;border-bottom:1px solid #0f172a;">${column}</th>`
        )
        .join("");
      const bodyRows = table.rows
        .map((row) => {
          const cells = table.columns
            .map(
              (column) =>
                `<td style="padding:6px 8px;vertical-align:top;font-size:12px;line-height:1.4;">${formatApaValue(row[column])}</td>`
            )
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `
        <div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;margin-bottom:4px;">Table ${index + 1}</div>
          <div style="font-size:12px;font-style:italic;color:#334155;margin-bottom:6px;">${table.title}</div>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;border-bottom:1px solid #0f172a;">
            <colgroup>${colgroup}</colgroup>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `<div>${sections}</div>`;
}

export async function copyApaTablesToClipboard(tables: TableData[]): Promise<boolean> {
  if (tables.length === 0 || typeof window === "undefined") {
    return false;
  }

  const text = buildApaClipboardText(tables);
  const html = buildApaClipboardHtml(tables);

  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" })
      });
      await navigator.clipboard.write([item]);
      return true;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}
