import * as React from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
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
  /** Fires when the help popover opens, not when it closes. */
  onHelpOpen?: (analysisType: AnalysisKind) => void;
  /** When given, only these analyses are offered. Undefined means all of them. */
  allowedAnalyses?: AnalysisKind[];
};

export function AnalysisTypePanel({
  analysisType,
  onChange,
  showPrefix = true,
  subtleUnderline = false,
  showHelpButton = true,
  onHelpOpen,
  allowedAnalyses
}: AnalysisTypePanelProps) {
  const { t, i18n } = useTranslation();
  const [openList, setOpenList] = React.useState(false);
  const [openHelp, setOpenHelp] = React.useState(false);
  const [helpMaxHeight, setHelpMaxHeight] = React.useState<number | null>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const helpUi = React.useMemo(() => getAnalysisHelpUi(i18n.language), [i18n.language]);
  const selectedLabel = t(`analysisKinds.${analysisType}`, { defaultValue: ANALYSIS_DEFS[analysisType].label });

  const groups = React.useMemo(() => {
    if (!allowedAnalyses) {
      return ANALYSIS_GROUPS;
    }

    const allowed = new Set(allowedAnalyses);
    return ANALYSIS_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => allowed.has(item) ) })).filter(
      (group) => group.items.length > 0
    );
  }, [allowedAnalyses]);

  // With nothing to switch to, a dropdown is just a button that does nothing.
  const choosable = groups.reduce((count, group) => count + group.items.length, 0) > 1;

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

  React.useEffect(() => {
    if (!openHelp) {
      return;
    }

    const updateMaxHeight = () => {
      const anchor = popoverRef.current;
      if (!anchor) {
        return;
      }

      const root = anchor.closest('[data-stats-workbench-root="true"]') as HTMLElement | null;
      if (!root) {
        setHelpMaxHeight(null);
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const spaceBelow = rootRect.bottom - (anchorRect.bottom + 8);
      setHelpMaxHeight(Math.max(0, Math.floor(spaceBelow)));
    };

    updateMaxHeight();
    window.addEventListener("resize", updateMaxHeight);
    return () => window.removeEventListener("resize", updateMaxHeight);
  }, [openHelp]);

  return (
    <section className="relative" ref={popoverRef}>
      <div className="flex items-center gap-2">
        {showPrefix ? <span className="relative -top-0.5 text-sm font-semibold text-slate-700">{t("analysis")}:</span> : null}
        {choosable ? (
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
        ) : (
          <span
            className={`w-80 truncate bg-white px-3 pb-2 text-left text-xl font-bold leading-tight text-slate-900 ${
              subtleUnderline ? "border-b border-slate-300" : "border-b-2 border-black"
            }`}
          >
            {selectedLabel}
          </span>
        )}
        {showHelpButton ? (
          <button
            type="button"
            onClick={() => {
              setOpenHelp((prev) => {
                // 여는 순간에만 알린다 — 닫기까지 세면 열람 횟수가 두 배로 잡힌다
                if (!prev) {
                  onHelpOpen?.(analysisType);
                }
                return !prev;
              });
              setOpenList(false);
            }}
            className="rounded-full p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label={helpUi.helpButtonAria}
            title={helpUi.helpButtonAria}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {openList ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(420px,92vw)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-72 overflow-auto">
            {groups.map((group) => (
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
        <AnalysisHelpPopover
          analysisType={analysisType}
          language={i18n.language}
          onClose={() => setOpenHelp(false)}
          maxHeight={helpMaxHeight}
        />
      ) : null}
    </section>
  );
}
