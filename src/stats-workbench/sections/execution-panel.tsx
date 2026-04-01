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
  const groupCandidates = (payloadInfo.meta?.groupCandidates as Array<string | number> | undefined) ?? [];
  const updateOption = (key: string, value: unknown) => onOptionsChange({ ...options, [key]: value });

  return (
    <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[340px_1fr] max-[780px]:gap-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 text-sm font-semibold">Options</div>

        {analysisType === "ttestIndependent" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Equal Variance Assumption</label>
            <SelectBox
              value={String(Boolean(options.equalVariance))}
              onChange={(value) => updateOption("equalVariance", value === "true")}
              items={[
                { value: "true", label: "Enabled" },
                { value: "false", label: "Disabled" }
              ]}
            />
            {groupCandidates.length >= 2 ? (
              <>
                <label className="text-xs font-medium text-slate-600">Group 1 Value</label>
                <SelectBox
                  value={String(options.group1Value ?? groupCandidates[0])}
                  onChange={(value) => updateOption("group1Value", value)}
                  items={groupCandidates.map((candidate) => ({ value: String(candidate), label: String(candidate) }))}
                />
                <label className="text-xs font-medium text-slate-600">Group 2 Value</label>
                <SelectBox
                  value={String(options.group2Value ?? groupCandidates[1])}
                  onChange={(value) => updateOption("group2Value", value)}
                  items={groupCandidates.map((candidate) => ({ value: String(candidate), label: String(candidate) }))}
                />
              </>
            ) : null}
          </div>
        )}

        {analysisType === "posthocTukey" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Alpha</label>
            <input
              type="number"
              min={0.001}
              max={0.5}
              step={0.001}
              value={Number(options.alpha ?? 0.05)}
              onChange={(event) => updateOption("alpha", Number(event.target.value))}
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
        )}

        {(analysisType === "linearRegression" || analysisType === "logisticBinary") && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Add Constant</label>
            <SelectBox
              value={String(Boolean(options.addConstant))}
              onChange={(value) => updateOption("addConstant", value === "true")}
              items={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" }
              ]}
            />
          </div>
        )}

        {analysisType === "logisticMultinomial" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Reference Category</label>
            <input
              type="text"
              value={String(options.referenceCategory ?? "")}
              onChange={(event) => updateOption("referenceCategory", event.target.value)}
              placeholder="Optional"
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
        )}

        {analysisType === "kmeans" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Clusters (K)</label>
            <SelectBox
              value={String(options.k ?? 3)}
              onChange={(value) => updateOption("k", Number(value))}
              items={[2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        )}

        {analysisType === "hierarchicalCluster" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Linkage Method</label>
            <SelectBox
              value={String(options.method ?? "ward")}
              onChange={(value) => updateOption("method", value)}
              items={[
                { value: "ward", label: "Ward" },
                { value: "complete", label: "Complete" },
                { value: "average", label: "Average" },
                { value: "single", label: "Single" }
              ]}
            />
            <label className="text-xs font-medium text-slate-600">Distance Metric</label>
            <SelectBox
              value={String(options.metric ?? "euclidean")}
              onChange={(value) => updateOption("metric", value)}
              items={[
                { value: "euclidean", label: "Euclidean" },
                { value: "cityblock", label: "Cityblock" },
                { value: "cosine", label: "Cosine" }
              ]}
            />
          </div>
        )}

        {analysisType === "efa" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Number of Factors</label>
            <SelectBox
              value={String(options.nFactors ?? 2)}
              onChange={(value) => updateOption("nFactors", Number(value))}
              items={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
            />
            <label className="text-xs font-medium text-slate-600">Rotation</label>
            <SelectBox
              value={String(options.rotation ?? "varimax")}
              onChange={(value) => updateOption("rotation", value)}
              items={[
                { value: "varimax", label: "Varimax" },
                { value: "promax", label: "Promax" },
                { value: "oblimin", label: "Oblimin" },
                { value: "none", label: "None" }
              ]}
            />
          </div>
        )}

        {(analysisType === "pca" || analysisType === "mds") && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Number of Components</label>
            <SelectBox
              value={String(options.nComponents ?? 2)}
              onChange={(value) => updateOption("nComponents", Number(value))}
              items={[2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
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
