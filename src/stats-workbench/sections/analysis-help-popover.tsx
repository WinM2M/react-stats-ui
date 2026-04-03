import * as React from "react";
import type { AnalysisKind } from "../types";
import { getAnalysisHelp, getAnalysisHelpUi } from "../help-resources";
import { fetchWikipediaSummary } from "../help-resources/wikipedia";

type AnalysisHelpPopoverProps = {
  analysisType: AnalysisKind;
  language: string;
  onClose: () => void;
  maxHeight?: number | null;
};

export function AnalysisHelpPopover({ analysisType, language, onClose, maxHeight = null }: AnalysisHelpPopoverProps) {
  const ui = React.useMemo(() => getAnalysisHelpUi(language), [language]);
  const content = React.useMemo(() => getAnalysisHelp(language, analysisType), [language, analysisType]);
  const [wikiState, setWikiState] = React.useState<{
    loading: boolean;
    extract: string;
    description: string;
    title: string;
    pageUrl: string;
  }>({
    loading: true,
    extract: "",
    description: "",
    title: "",
    pageUrl: ""
  });

  React.useEffect(() => {
    let cancelled = false;
    setWikiState({ loading: true, extract: "", description: "", title: "", pageUrl: "" });

    void fetchWikipediaSummary(language, content.wikipediaTitle)
      .then((summary) => {
        if (cancelled) {
          return;
        }
        if (!summary) {
          setWikiState({ loading: false, extract: "", description: "", title: "", pageUrl: "" });
          return;
        }

        setWikiState({
          loading: false,
          extract: summary.extract,
          description: summary.description ?? "",
          title: summary.title,
          pageUrl: summary.pageUrl
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setWikiState({ loading: false, extract: "", description: "", title: "", pageUrl: "" });
      });

    return () => {
      cancelled = true;
    };
  }, [language, content.wikipediaTitle]);

  return (
    <div
      className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(760px,96vw)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
      style={maxHeight !== null ? { maxHeight: `${maxHeight}px` } : { maxHeight: "70vh" }}
    >
      <div className="pr-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{ui.popoverTitle}</h3>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
            {ui.close}
          </button>
        </div>

        <section className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          {wikiState.loading ? <p className="text-sm text-slate-700">{ui.wikipediaLoading}</p> : null}
          {!wikiState.loading && wikiState.extract ? <p className="text-sm text-slate-700">{wikiState.extract}</p> : null}
          {!wikiState.loading && !wikiState.extract ? <p className="text-sm text-slate-700">{ui.wikipediaUnavailable}</p> : null}
          {!wikiState.loading && wikiState.pageUrl ? (
            <p className="mt-1 text-xs text-slate-600">
              {ui.wikipediaSourcePrefix}: 
              <a href={wikiState.pageUrl} target="_blank" rel="noreferrer" className="text-sky-700 underline hover:text-sky-800">
                Wikipedia ({wikiState.title || "Wikipedia"})
              </a>
            </p>
          ) : null}
        </section>

        <section className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{content.formulaTitle}</div>
          <div className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            <img src={content.formulaSvgUrl} alt={content.formulaAlt} className="h-[3.75rem] w-auto max-w-full" />
          </div>
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
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.apaExample}</div>
          <div className="mb-1 text-xs italic text-slate-600">{content.apaExample.title}</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="border-b border-t border-slate-900">
                <tr>
                  {content.apaExample.columns.map((column) => (
                    <th key={column} className="px-2 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="border-b border-slate-900">
                {content.apaExample.rows.map((row, rowIndex) => (
                  <tr key={`${content.apaExample.title}-${rowIndex}`}>
                    {content.apaExample.columns.map((column) => (
                      <td key={`${column}-${rowIndex}`} className="px-2 py-1.5 align-top">
                        {row[column] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
