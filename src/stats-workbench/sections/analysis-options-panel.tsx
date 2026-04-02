import type { AnalysisKind } from "../types";
import { useTranslation } from "react-i18next";
import { SelectBox } from "../ui/select-box";

type AnalysisOptionsPanelProps = {
  analysisType: AnalysisKind;
  options: Record<string, unknown>;
  onOptionsChange: (next: Record<string, unknown>) => void;
  groupCandidates: Array<string | number>;
  borderless?: boolean;
};

export function AnalysisOptionsPanel({ analysisType, options, onOptionsChange, groupCandidates, borderless = false }: AnalysisOptionsPanelProps) {
  const { t } = useTranslation();
  const updateOption = (key: string, value: unknown) => onOptionsChange({ ...options, [key]: value });

  return (
    <div
      className={`flex h-full min-h-0 select-none flex-col rounded-xl bg-white p-4 shadow-sm max-[640px]:p-2 ${
        borderless ? "" : "border border-slate-200"
      }`}
    >
      <div className="mb-2 text-sm font-semibold">{t("options")}</div>

      <div className="min-h-0 flex-1 overflow-auto">
        {analysisType === "ttestIndependent" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{t("optionsEqualVariance")}</label>
            <SelectBox
              value={String(Boolean(options.equalVariance))}
              onChange={(value) => updateOption("equalVariance", value === "true")}
              items={[
                { value: "true", label: t("optionsEnabled") },
                { value: "false", label: t("optionsDisabled") }
              ]}
            />
            {groupCandidates.length >= 2 ? (
              <>
                <label className="text-xs font-medium text-slate-600">{t("optionsGroup1")}</label>
                <SelectBox
                  value={String(options.group1Value ?? groupCandidates[0])}
                  onChange={(value) => updateOption("group1Value", value)}
                  items={groupCandidates.map((candidate) => ({ value: String(candidate), label: String(candidate) }))}
                />
                <label className="text-xs font-medium text-slate-600">{t("optionsGroup2")}</label>
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
            <label className="text-xs font-medium text-slate-600">{t("optionsAlpha")}</label>
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
            <label className="text-xs font-medium text-slate-600">{t("optionsAddConstant")}</label>
            <SelectBox
              value={String(Boolean(options.addConstant))}
              onChange={(value) => updateOption("addConstant", value === "true")}
              items={[
                { value: "true", label: t("optionsYes") },
                { value: "false", label: t("optionsNo") }
              ]}
            />
          </div>
        )}

        {analysisType === "logisticMultinomial" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{t("optionsReferenceCategory")}</label>
            <input
              type="text"
              value={String(options.referenceCategory ?? "")}
              onChange={(event) => updateOption("referenceCategory", event.target.value)}
              placeholder={t("optionsOptional")}
              className="h-9 w-full select-text rounded-md border border-slate-300 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
        )}

        {analysisType === "kmeans" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{t("optionsClusters")}</label>
            <SelectBox
              value={String(options.k ?? 3)}
              onChange={(value) => updateOption("k", Number(value))}
              items={[2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        )}

        {analysisType === "hierarchicalCluster" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{t("optionsLinkageMethod")}</label>
            <SelectBox
              value={String(options.method ?? "ward")}
              onChange={(value) => updateOption("method", value)}
              items={[
                { value: "ward", label: t("optionsWard") },
                { value: "complete", label: t("optionsComplete") },
                { value: "average", label: t("optionsAverage") },
                { value: "single", label: t("optionsSingle") }
              ]}
            />
            <label className="text-xs font-medium text-slate-600">{t("optionsDistanceMetric")}</label>
            <SelectBox
              value={String(options.metric ?? "euclidean")}
              onChange={(value) => updateOption("metric", value)}
              items={[
                { value: "euclidean", label: t("optionsEuclidean") },
                { value: "cityblock", label: t("optionsCityblock") },
                { value: "cosine", label: t("optionsCosine") }
              ]}
            />
          </div>
        )}

        {analysisType === "efa" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{t("optionsNumberFactors")}</label>
            <SelectBox
              value={String(options.nFactors ?? 2)}
              onChange={(value) => updateOption("nFactors", Number(value))}
              items={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
            />
            <label className="text-xs font-medium text-slate-600">{t("optionsRotation")}</label>
            <SelectBox
              value={String(options.rotation ?? "varimax")}
              onChange={(value) => updateOption("rotation", value)}
              items={[
                { value: "varimax", label: t("optionsVarimax") },
                { value: "promax", label: t("optionsPromax") },
                { value: "oblimin", label: t("optionsOblimin") },
                { value: "none", label: t("optionsNone") }
              ]}
            />
          </div>
        )}

        {(analysisType === "pca" || analysisType === "mds") && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{t("optionsNumberComponents")}</label>
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
