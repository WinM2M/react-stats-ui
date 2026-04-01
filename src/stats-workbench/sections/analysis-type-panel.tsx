import { ANALYSIS_DEFS } from "../constants";
import type { AnalysisKind } from "../types";
import { SelectBox } from "../ui/select-box";

type AnalysisTypePanelProps = {
  analysisType: AnalysisKind;
  onChange: (next: AnalysisKind) => void;
};

export function AnalysisTypePanel({ analysisType, onChange }: AnalysisTypePanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis Type</label>
      <SelectBox
        value={analysisType}
        onChange={(value) => onChange(value as AnalysisKind)}
        items={Object.entries(ANALYSIS_DEFS).map(([value, def]) => ({ value, label: def.label }))}
      />
    </div>
  );
}
