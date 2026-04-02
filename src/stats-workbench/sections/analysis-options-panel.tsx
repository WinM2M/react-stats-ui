import type { AnalysisKind } from "../types";
import { SelectBox } from "../ui/select-box";

type AnalysisOptionsPanelProps = {
  analysisType: AnalysisKind;
  options: Record<string, unknown>;
  onOptionsChange: (next: Record<string, unknown>) => void;
  groupCandidates: Array<string | number>;
};

export function AnalysisOptionsPanel({ analysisType, options, onOptionsChange, groupCandidates }: AnalysisOptionsPanelProps) {
  const updateOption = (key: string, value: unknown) => onOptionsChange({ ...options, [key]: value });

  return (
    <div className="flex h-full min-h-0 select-none flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
      <div className="mb-2 text-sm font-semibold">Options</div>

      <div className="min-h-0 flex-1 overflow-auto">
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
              className="h-9 w-full select-text rounded-md border border-slate-300 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
              className="h-9 w-full select-text rounded-md border border-slate-300 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
      </div>
    </div>
  );
}
