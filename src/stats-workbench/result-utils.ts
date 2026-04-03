export type TableData = {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
};

function formatApaValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "NA";
    }
    if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
      return value.toExponential(3);
    }
    return value.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
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
