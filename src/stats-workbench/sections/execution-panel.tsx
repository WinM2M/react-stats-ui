import { Copy, MoreHorizontal, RefreshCw, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { buildTableData, copyApaTablesToClipboard, formatApaCell, type TableData } from "../result-utils";
import type { PayloadInfo } from "../types";
import { cn } from "../utils";

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
  minimalChrome?: boolean;
  onCloseResult?: () => void;
  autoShowResult?: boolean;
  onAutoShowResultChange?: (next: boolean) => void;
};


function ApaTable({ table, index }: { table: TableData; index: number }) {
  const { t } = useTranslation();
  const translatedTitle = table.title === "Summary" ? t("summary") : table.title;
  const translatedColumns = table.columns.map((column) => {
    if (column === "statistic") return t("statistic");
    if (column === "value") return t("value");
    return column;
  });

  return (
    <div className="mb-4 overflow-x-auto">
      <div className="mb-1 text-xs font-semibold text-slate-700">{t("tableLabel", { index: index + 1 })}</div>
      <div className="mb-2 text-xs italic text-slate-600">{translatedTitle}</div>
      <table className="w-full border-collapse text-left text-xs text-slate-700">
        <thead className="border-b border-t border-slate-900">
          <tr>
            {translatedColumns.map((column) => (
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
                  {formatApaCell(row[column])}
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
  workerProgress,
  minimalChrome = false,
  onCloseResult,
  autoShowResult = true,
  onAutoShowResultChange
}: ExecutionPanelProps) {
  const { t } = useTranslation();
  const [resultView, setResultView] = React.useState<"table" | "json">("table");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "error">("idle");
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

  const handleCopyApaTable = React.useCallback(async () => {
    if (tables.length === 0) {
      return;
    }

    const copied = await copyApaTablesToClipboard(tables);
    if (copied) {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1200);
    } else {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1400);
    }
  }, [tables]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl bg-white p-4 shadow-sm max-[640px]:p-2",
        minimalChrome ? "" : "border border-slate-200"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{t("analysisResult")}</div>
          {minimalChrome && onAutoShowResultChange ? (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              {t("autoShowResult")}
              <button
                type="button"
                onClick={() => onAutoShowResultChange(!autoShowResult)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition",
                  autoShowResult ? "bg-sky-500" : "bg-slate-300"
                )}
                aria-pressed={autoShowResult}
                aria-label={t("autoShowResult")}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition",
                    autoShowResult ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </label>
          ) : null}
          {minimalChrome ? null : (
            <button
              type="button"
              onClick={onRun}
              disabled={runDisabled}
              className="rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("runAnalysis")}
              title={runDisabled ? (isRunning ? t("running") : t("standby")) : t("runAnalysis")}
            >
              <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
        <div className="relative" ref={moreRef}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              className={
                minimalChrome
                  ? "rounded p-1.5 text-slate-700 hover:bg-slate-50"
                  : "rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50"
              }
              aria-label={t("moreActions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {minimalChrome && onCloseResult ? (
              <button
                type="button"
                onClick={onCloseResult}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-50"
                aria-label={t("hideResult")}
                title={t("hideResult")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

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
                {resultView === "table" ? t("switchToJson") : t("switchToApa")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onTogglePayload();
                  setMoreOpen(false);
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showPayload ? t("hidePayload") : t("showPayload")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!workerReady ? (
        <p className="mb-2 text-xs text-amber-700">{t("workerInitializingPercent", { progress: workerProgress ?? 0 })}</p>
      ) : !payloadInfo.canRun ? (
        <p className="mb-2 text-xs text-amber-700">{payloadInfo.reason}</p>
      ) : null}

      {error ? <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 bg-white p-2">
        {resultView === "table" ? (
          result ? (
            tables.length > 0 ? (
              <div>
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCopyApaTable()}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    aria-label={t("copy")}
                    title={copyStatus === "copied" ? t("copied") : copyStatus === "error" ? t("copyFailed") : t("copy")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copyStatus === "copied" ? t("copied") : copyStatus === "error" ? t("copyFailed") : t("copy")}
                  </button>
                </div>
                {tables.map((table, index) => (
                  <ApaTable key={`${table.title}-${index}`} table={table} index={index} />
                ))}
              </div>
            ) : (
                <div className="text-sm text-slate-500">{t("renderUnavailable")}</div>
            )
          ) : (
              <div className="text-sm text-slate-500">{t("runToView")}</div>
          )
        ) : result ? (
          <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(result, null, 2)}</pre>
        ) : (
            <div className="text-sm text-slate-500">{t("runToView")}</div>
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
