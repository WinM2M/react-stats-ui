import * as React from "react";
import { useTranslation } from "react-i18next";
import { CircleHelp } from "lucide-react";
import { ANALYSIS_DEFS, ANALYSIS_GROUPS } from "../constants";
import { getAnalysisHelpUi } from "../help-resources";
import { AnalysisHelpPopover } from "./analysis-help-popover";
import type { AnalysisKind } from "../types";

type AnalysisTypePanelProps = {
  analysisType: AnalysisKind;
  onChange: (next: AnalysisKind) => void;
  showPrefix?: boolean;
  subtleUnderline?: boolean;
  showHelpButton?: boolean;
};

export function AnalysisTypePanel({
  analysisType,
  onChange,
  showPrefix = true,
  subtleUnderline = false,
  showHelpButton = true
}: AnalysisTypePanelProps) {
  const { t, i18n } = useTranslation();
  const [openList, setOpenList] = React.useState(false);
  const [openHelp, setOpenHelp] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const helpUi = React.useMemo(() => getAnalysisHelpUi(i18n.language), [i18n.language]);
  const selectedLabel = t(`analysisKinds.${analysisType}`, { defaultValue: ANALYSIS_DEFS[analysisType].label });

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpenList(false);
        setOpenHelp(false);
      }
    };

    if (openList || openHelp) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openList, openHelp]);

  return (
    <section className="relative" ref={popoverRef}>
      <div className="flex items-center gap-2">
        {showPrefix ? <span className="relative -top-0.5 text-sm font-semibold text-slate-700">{t("analysis")}:</span> : null}
        <button
          type="button"
          onClick={() => {
            setOpenList((prev) => !prev);
            setOpenHelp(false);
          }}
          className={`w-80 truncate bg-white px-3 pb-2 text-left text-xl font-bold leading-tight text-slate-900 hover:bg-slate-50 ${
            subtleUnderline ? "border-b border-slate-300" : "border-b-2 border-black"
          }`}
        >
          {selectedLabel}
        </button>
        {showHelpButton ? (
          <button
            type="button"
            onClick={() => {
              setOpenHelp((prev) => !prev);
              setOpenList(false);
            }}
            className="rounded-full p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label={helpUi.helpButtonAria}
            title={helpUi.helpButtonAria}
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {openList ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(420px,92vw)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-72 overflow-auto">
            {ANALYSIS_GROUPS.map((group) => (
              <section key={group.key} className="mb-2 last:mb-0">
                <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {t(`analysisGroups.${group.key}`)}
                </div>
                <ul>
                  {group.items.map((value) => {
                    const def = ANALYSIS_DEFS[value];
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(value);
                            setOpenList(false);
                          }}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                            value === analysisType ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {t(`analysisKinds.${value}`, { defaultValue: def.label })}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {openHelp && showHelpButton ? (
        <AnalysisHelpPopover analysisType={analysisType} language={i18n.language} onClose={() => setOpenHelp(false)} />
      ) : null}
    </section>
  );
}
