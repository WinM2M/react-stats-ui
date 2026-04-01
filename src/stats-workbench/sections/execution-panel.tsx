import * as Separator from "@radix-ui/react-separator";
import { Play } from "lucide-react";
import type { AnalysisKind, PayloadInfo } from "../types";
import { SelectBox } from "../ui/select-box";

type ExecutionPanelProps = {
  analysisType: AnalysisKind;
  options: Record<string, unknown>;
  onOptionsChange: (next: Record<string, unknown>) => void;
  isRunning: boolean;
  payloadInfo: PayloadInfo;
  onRun: () => void;
  result: unknown;
  error: string;
  showPayload: boolean;
  onTogglePayload: () => void;
};

export function ExecutionPanel({
  analysisType,
  options,
  onOptionsChange,
  isRunning,
  payloadInfo,
  onRun,
  result,
  error,
  showPayload,
  onTogglePayload
}: ExecutionPanelProps) {
  return (
    <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[340px_1fr] max-[780px]:gap-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 text-sm font-semibold">Options</div>

        {analysisType === "independent_t_test" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Equal Variance Assumption</label>
            <SelectBox
              value={String(Boolean(options.equalVariance))}
              onChange={(value) => onOptionsChange({ ...options, equalVariance: value === "true" })}
              items={[
                { value: "true", label: "Enabled" },
                { value: "false", label: "Disabled" }
              ]}
            />
          </div>
        )}

        {analysisType === "multiple_regression" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Include Intercept</label>
            <SelectBox
              value={String(Boolean(options.includeIntercept))}
              onChange={(value) => onOptionsChange({ ...options, includeIntercept: value === "true" })}
              items={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" }
              ]}
            />
          </div>
        )}

        {analysisType === "factor_analysis" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Number of Factors</label>
            <SelectBox
              value={String(options.factorCount ?? 2)}
              onChange={(value) => onOptionsChange({ ...options, factorCount: Number(value) })}
              items={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        )}

        <Separator.Root className="my-3 h-px bg-slate-200" />

        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || !payloadInfo.canRun}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running" : "Run Analysis"}
        </button>
        {!payloadInfo.canRun ? <p className="mt-2 text-xs text-amber-700">{payloadInfo.reason}</p> : null}
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Analysis Result</div>
          <button
            type="button"
            onClick={onTogglePayload}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {showPayload ? "Hide API Payload" : "Show API Payload"}
          </button>
        </div>

        {error ? <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</div> : null}

        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2">
          {result ? (
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
    </div>
  );
}
