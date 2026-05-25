export type TableData = {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
};

function buildPcaTables(objectPayload: Record<string, unknown>): TableData[] {
  const explainedVarianceRatio = Array.isArray(objectPayload.explainedVarianceRatio)
    ? (objectPayload.explainedVarianceRatio as number[])
    : [];
  const cumulativeVarianceRatio = Array.isArray(objectPayload.cumulativeVarianceRatio)
    ? (objectPayload.cumulativeVarianceRatio as number[])
    : [];
  const eigenvalues = Array.isArray(objectPayload.eigenvalues) ? (objectPayload.eigenvalues as number[]) : [];
  const nComponents = typeof objectPayload.nComponents === "number" ? objectPayload.nComponents : explainedVarianceRatio.length;

  const tables: TableData[] = [];

  if (explainedVarianceRatio.length > 0 || eigenvalues.length > 0) {
    const rowCount = Math.max(explainedVarianceRatio.length, eigenvalues.length, cumulativeVarianceRatio.length, nComponents || 0);
    const rows = Array.from({ length: rowCount }).map((_, index) => ({
      component: index + 1,
      eigenvalue: eigenvalues[index] ?? null,
      variance: typeof explainedVarianceRatio[index] === "number" ? explainedVarianceRatio[index] * 100 : null,
      cumulativeVariance: typeof cumulativeVarianceRatio[index] === "number" ? cumulativeVarianceRatio[index] * 100 : null
    }));

    tables.push({
      title: "Eigenvalues",
      columns: ["component", "eigenvalue", "variance", "cumulativeVariance"],
      rows
    });
  }

  if (objectPayload.communalities && typeof objectPayload.communalities === "object" && !Array.isArray(objectPayload.communalities)) {
    const rows = Object.entries(objectPayload.communalities as Record<string, unknown>).map(([variable, communality]) => ({
      variable,
      communality
    }));

    tables.push({
      title: "Communalities",
      columns: ["variable", "communality"],
      rows
    });
  }

  const sortedLoadings = Array.isArray(objectPayload.sortedLoadings)
    ? (objectPayload.sortedLoadings as Array<Record<string, unknown>>)
    : [];
  if (sortedLoadings.length > 0) {
    const maxComponents = sortedLoadings.reduce((max, item) => {
      const loadings = Array.isArray(item.loadings) ? (item.loadings as unknown[]) : [];
      return Math.max(max, loadings.length);
    }, 0);

    const loadingColumns = Array.from({ length: maxComponents }).map((_, idx) => `component${idx + 1}`);
    const rows = sortedLoadings.map((item) => {
      const row: Record<string, unknown> = {
        variable: item.variable ?? "",
        dominantComponent: item.dominantComponent,
        dominantLoading: item.dominantLoading
      };
      const loadings = Array.isArray(item.loadings) ? (item.loadings as unknown[]) : [];
      loadingColumns.forEach((column, index) => {
        row[column] = loadings[index] ?? null;
      });
      return row;
    });

    tables.push({
      title: "Rotated Component Matrix",
      columns: ["variable", "dominantComponent", "dominantLoading", ...loadingColumns],
      rows
    });
  } else if (objectPayload.loadings && typeof objectPayload.loadings === "object" && !Array.isArray(objectPayload.loadings)) {
    const loadingsEntries = Object.entries(objectPayload.loadings as Record<string, unknown>);
    const maxComponents = loadingsEntries.reduce((max, [, loading]) => {
      const values = Array.isArray(loading) ? (loading as unknown[]) : [];
      return Math.max(max, values.length);
    }, 0);
    const loadingColumns = Array.from({ length: maxComponents }).map((_, idx) => `component${idx + 1}`);
    const rows = loadingsEntries.map(([variable, loading]) => {
      const row: Record<string, unknown> = { variable };
      const values = Array.isArray(loading) ? (loading as unknown[]) : [];
      loadingColumns.forEach((column, index) => {
        row[column] = values[index] ?? null;
      });
      return row;
    });

    tables.push({
      title: "Rotated Component Matrix",
      columns: ["variable", ...loadingColumns],
      rows
    });
  }

  return tables;
}

function buildRegressionTables(objectPayload: Record<string, unknown>): TableData[] {
  const tables: TableData[] = [];

  const modelSummary = objectPayload.modelSummary && typeof objectPayload.modelSummary === "object"
    ? (objectPayload.modelSummary as Record<string, unknown>)
    : null;

  const selectedVariables = Array.isArray(objectPayload.selectedVariables)
    ? (objectPayload.selectedVariables as unknown[]).map((item) => String(item))
    : [];

  tables.push({
    title: "Model Summary",
    columns: ["rSquared", "adjustedRSquared", "fStatistic", "fPValue", "observations", "method", "selectedVariables"],
    rows: [
      {
        rSquared: modelSummary?.rSquared ?? objectPayload.rSquared,
        adjustedRSquared: modelSummary?.adjustedRSquared ?? objectPayload.adjustedRSquared,
        fStatistic: objectPayload.fStatistic,
        fPValue: objectPayload.fPValue,
        observations: objectPayload.observations,
        method: objectPayload.method,
        selectedVariables: selectedVariables.join(", ")
      }
    ]
  });

  const coefficients = Array.isArray(objectPayload.coefficients)
    ? (objectPayload.coefficients as Array<Record<string, unknown>>)
    : [];
  if (coefficients.length > 0) {
    const rows = coefficients.map((coef) => ({
      variable: coef.variable,
      b: coef.coefficient,
      stdError: coef.stdError,
      t: coef.tStatistic,
      p: coef.pValue,
      ci: Array.isArray(coef.confidenceInterval) ? `[${coef.confidenceInterval[0]}, ${coef.confidenceInterval[1]}]` : "NA"
    }));
    tables.push({
      title: "Unstandardized Coefficients",
      columns: ["variable", "b", "stdError", "t", "p", "ci"],
      rows
    });
  }

  const standardizedCoefficients = Array.isArray(objectPayload.standardizedCoefficients)
    ? (objectPayload.standardizedCoefficients as Array<Record<string, unknown>>)
    : [];
  if (standardizedCoefficients.length > 0) {
    const rows = standardizedCoefficients.map((coef) => ({
      variable: coef.variable,
      beta: coef.coefficient,
      stdError: coef.stdError,
      t: coef.tStatistic,
      p: coef.pValue
    }));
    tables.push({
      title: "Standardized Coefficients",
      columns: ["variable", "beta", "stdError", "t", "p"],
      rows
    });
  }

  const multicollinearity = Array.isArray(objectPayload.multicollinearity)
    ? (objectPayload.multicollinearity as Array<Record<string, unknown>>)
    : [];
  if (multicollinearity.length > 0) {
    tables.push({
      title: "Multicollinearity",
      columns: ["variable", "tolerance", "vif"],
      rows: multicollinearity
    });
  }

  return tables;
}

function formatApaValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "NA";
    }
    if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
      return value.toExponential(3);
    }
    const truncated = value < 0 ? Math.ceil(value * 1000) / 1000 : Math.floor(value * 1000) / 1000;
    return truncated.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (value === null || value === undefined) {
    return "NA";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
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
    ("modelSummary" in objectPayload || "standardizedCoefficients" in objectPayload || "multicollinearity" in objectPayload);

  if (isRegressionPayload) {
    const regressionTables = buildRegressionTables(objectPayload);
    if (regressionTables.length > 0) {
      return regressionTables;
    }
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

function buildApaClipboardHtml(tables: TableData[]): string {
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
