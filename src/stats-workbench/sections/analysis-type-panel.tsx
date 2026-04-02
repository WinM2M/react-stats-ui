import * as React from "react";
import { ChevronDown } from "lucide-react";
import { ANALYSIS_DEFS } from "../constants";
import type { AnalysisKind } from "../types";

type AnalysisTypePanelProps = {
  analysisType: AnalysisKind;
  onChange: (next: AnalysisKind) => void;
};

export function AnalysisTypePanel({ analysisType, onChange }: AnalysisTypePanelProps) {
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const selectedLabel = ANALYSIS_DEFS[analysisType].label;

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <section className="relative" ref={popoverRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Analysis
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
        <span className="max-w-[280px] truncate text-lg font-bold leading-tight text-slate-900">{selectedLabel}</span>
      </div>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(420px,92vw)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <ul className="max-h-64 overflow-auto">
            {Object.entries(ANALYSIS_DEFS).map(([value, def]) => (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(value as AnalysisKind);
                    setOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    value === analysisType ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {def.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
