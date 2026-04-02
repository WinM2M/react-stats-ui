import { MoreHorizontal, RefreshCw } from "lucide-react";
import * as React from "react";
import type { PayloadInfo } from "../types";

type ExecutionPanelProps = {
  isRunning: boolean;
  payloadInfo: PayloadInfo;
  onRun: () => void;
  result: unknown;
  error: string;
  showPayload: boolean;
  onTogglePayload: () => void;
  workerReady: boolean;
  workerProgress: number | null;
};

type TableData = {
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

function buildTableData(raw: unknown): TableData[] {
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
        columns: ["Statistic", "Value"],
        rows: Object.entries(row).map(([stat, val]) => ({ Statistic: stat, Value: val }))
      });
    }
  }

  if (tables.length > 0) {
    return tables;
  }

  return [
    {
      title: "Summary",
      columns: ["Statistic", "Value"],
      rows: Object.entries(objectPayload).map(([stat, val]) => ({ Statistic: stat, Value: val }))
    }
  ];
}

function ApaTable({ table, index }: { table: TableData; index: number }) {
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="mb-1 text-xs font-semibold text-slate-700">Table {index + 1}</div>
      <div className="mb-2 text-xs italic text-slate-600">{table.title}</div>
      <table className="w-full border-collapse text-left text-xs text-slate-700">
        <thead className="border-b border-t border-slate-900">
          <tr>
            {table.columns.map((column) => (
              <th key={column} className="px-2 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="border-b border-slate-900">
          {table.rows.map((row, rowIndex) => (
            <tr key={`${table.title}-${rowIndex}`}>
              {table.columns.map((column) => (
                <td key={`${table.title}-${rowIndex}-${column}`} className="px-2 py-1.5 align-top">
                  {formatApaValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExecutionPanel({
  isRunning,
  payloadInfo,
  onRun,
  result,
  error,
  showPayload,
  onTogglePayload,
  workerReady,
  workerProgress
}: ExecutionPanelProps) {
  const [resultView, setResultView] = React.useState<"table" | "json">("table");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const tables = buildTableData(result);
  const runDisabled = isRunning || !payloadInfo.canRun || !workerReady;

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    if (moreOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [moreOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[640px]:p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Analysis Result</div>
          <button
            type="button"
            onClick={onRun}
            disabled={runDisabled}
            className="rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Run analysis"
            title={runDisabled ? (isRunning ? "Analysis running" : "Analysis not ready") : "Run analysis"}
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className="rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50"
            aria-label="More result actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {moreOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setResultView((prev) => (prev === "table" ? "json" : "table"));
                  setMoreOpen(false);
                }}
                className="mb-1 w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {resultView === "table" ? "Switch to JSON" : "Switch to APA Table"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onTogglePayload();
                  setMoreOpen(false);
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showPayload ? "Hide API Payload" : "Show API Payload"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!workerReady ? (
        <p className="mb-2 text-xs text-amber-700">Analysis is available after worker initialization completes ({workerProgress ?? 0}%).</p>
      ) : !payloadInfo.canRun ? (
        <p className="mb-2 text-xs text-amber-700">{payloadInfo.reason}</p>
      ) : null}

      {error ? <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 bg-white p-2">
        {resultView === "table" ? (
          result ? (
            tables.length > 0 ? (
              <div>
                {tables.map((table, index) => (
                  <ApaTable key={`${table.title}-${index}`} table={table} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Table rendering is not available for this result shape.</div>
            )
          ) : (
            <div className="text-sm text-slate-500">Run an analysis to view results.</div>
          )
        ) : result ? (
          <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(result, null, 2)}</pre>
        ) : (
          <div className="text-sm text-slate-500">Run an analysis to view results.</div>
        )}
      </div>

      {showPayload ? (
        <div className="mt-2 min-h-0 overflow-auto rounded border border-slate-200 bg-white p-2">
          <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(payloadInfo.payload, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
