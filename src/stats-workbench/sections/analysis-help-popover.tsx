import * as React from "react";
import type { AnalysisKind } from "../types";
import { getAnalysisHelp, getAnalysisHelpUi } from "../help-resources";

type AnalysisHelpPopoverProps = {
  analysisType: AnalysisKind;
  language: string;
  onClose: () => void;
};

export function AnalysisHelpPopover({ analysisType, language, onClose }: AnalysisHelpPopoverProps) {
  const ui = React.useMemo(() => getAnalysisHelpUi(language), [language]);
  const content = React.useMemo(() => getAnalysisHelp(language, analysisType), [language, analysisType]);
  const formulaDataUri = React.useMemo(
    () => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(content.formulaSvg)}`,
    [content.formulaSvg]
  );

  return (
    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(760px,96vw)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="max-h-[70vh] overflow-auto pr-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{ui.popoverTitle}</h3>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
            {ui.close}
          </button>
        </div>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.overview}</div>
          <p className="text-sm text-slate-700">{content.overview}</p>
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.purpose}</div>
          <p className="text-sm text-slate-700">{content.purpose}</p>
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{content.formulaTitle}</div>
          <img src={formulaDataUri} alt={content.formulaAlt} className="w-full rounded-lg border border-slate-200" />
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.dataTypes}</div>
          <ul className="space-y-1 text-sm text-slate-700">
            {content.dataTypes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.options}</div>
          {content.options.length ? (
            <ul className="space-y-1 text-sm text-slate-700">
              {content.options.map((option) => (
                <li key={option.name}>
                  <strong className="font-semibold">{option.name}</strong>: {option.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-700">{ui.noOptions}</p>
          )}
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.interpretation}</div>
          <ul className="space-y-1 text-sm text-slate-700">
            {content.interpretation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.faq}</div>
          <ul className="space-y-2 text-sm text-slate-700">
            {content.faqs.map((faq) => (
              <li key={faq.question}>
                <div className="font-semibold text-slate-800">Q. {faq.question}</div>
                <div>A. {faq.answer}</div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.references}</div>
          <ul className="space-y-1 text-sm text-slate-700">
            {content.references.map((reference) => (
              <li key={reference.url}>
                <a href={reference.url} target="_blank" rel="noreferrer" className="text-sky-700 underline hover:text-sky-800">
                  {reference.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
