import type { ReactNode } from "react";
import { Copy, MoreHorizontal, RefreshCw, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { buildTableData, copyApaTablesToClipboard, formatApaCell, type TableData } from "../result-utils";
import type { PayloadInfo } from "../types";
import { cn } from "../utils";

type ExecutionPanelProps = {
  isRunning: boolean;
  payloadInfo: PayloadInfo;
  onRun: () => void;
  result: unknown;
  error: string;
  showPayload: boolean;
  /**
   * The "..." menu that switches the result to raw JSON and shows the API
   * payload. Developer tools: an embedder whose users are researchers, not
   * API callers, has no use for them on screen.
   */
  showDeveloperMenu?: boolean;
  variableLabel?: (name: string) => string | undefined;
  onTogglePayload: () => void;
  workerReady: boolean;
  workerProgress: number | null;
  minimalChrome?: boolean;
  onCloseResult?: () => void;
  autoShowResult?: boolean;
  onAutoShowResultChange?: (next: boolean) => void;
  onBeforeCopy?: () => boolean | Promise<boolean>;
  /**
   * 복사 단추의 문구를 바꾼다.
   *
   * 기본값 "Copy" 는 무엇을 복사하는지 말하지 않는다. 임베더 쪽 실측에서, 결과까지 온
   * 방문자 5명 중 이 단추를 누른 사람이 0명이었다 — 눌러 보고 그만둔 것이 아니라
   * 손이 가지 않았다. 무엇을 주는지가 문구에 없으면 눈에 띄어도 이유가 생기지 않는다.
   */
  copyLabel?: string;
  /**
   * 복사 단추의 무게.
   *
   * `subtle`(기본)은 표 위에 조용히 붙는 회색 단추다. `strong`은 채운 단추로, 이 표를
   * 가져가는 것이 이 화면에서 할 만한 다음 일이라고 말하는 화면에서 쓴다.
   */
  copyEmphasis?: "subtle" | "strong";
  /**
   * Rendered under the result, once there is one.
   *
   * The host owns what goes here. Factor analysis, for instance, wants a "make
   * these factors into variables" panel -- which needs to know where the
   * host keeps variables, something this component has no business knowing.
   */
  resultFooter?: ReactNode;
};


/*
 * 결과 표의 **말**을 모아 둔 자리.
 *
 * 전에는 `if (column === "...")` 가 길게 늘어서 있었고, 거기 없는 열쇠값은 화면에
 * 그대로 찍혔다 -- `percentOfResponses`, `cellsWithExpectedCountBelow5` 같은 낱말이
 * 표 머리에 섰다. 영어로 봐도 못 읽는 글자라 번역 이전에 **표기** 문제였고, 늘어선
 * 조건문은 새 표를 만들 때마다 조용히 한 줄씩 빠뜨리게 되어 있었다.
 *
 * 표로 바꾼다. 빠진 자리는 아래 `EXPECTED_*` 를 대조하는 테스트가 잡는다.
 */
export const TABLE_TITLE_KEYS: Record<string, string> = {
  Summary: "summary",
  Eigenvalues: "resultEigenvalues",
  Communalities: "resultCommunalities",
  "Rotated Component Matrix": "resultRotatedComponentMatrix",
  "Model Summary": "resultModelSummary",
  "Unstandardized Coefficients": "resultUnstandardizedCoefficients",
  "Standardized Coefficients": "resultStandardizedCoefficients",
  Multicollinearity: "resultMulticollinearity",
  "Case Processing Summary": "resultCaseProcessingSummary",
  "Reliability Statistics": "resultReliabilityStatistics",
  "Item Statistics": "resultItemStatistics",
  "Item-Total Statistics": "resultItemTotalStatistics",
  "Scale Statistics": "resultScaleStatistics",
  "Multiple Response Frequencies": "titleMultipleResponseFrequencies",
  "Case Summary": "titleCaseSummary",
  "Chi-Square Tests": "titleChiSquareTests",
  "Symmetric Measures": "titleSymmetricMeasures",
  "Descriptive Statistics": "titleDescriptiveStatistics",
  Descriptives: "titleDescriptives",
  "Group Statistics": "titleGroupStatistics",
  "Independent Samples Test": "titleIndependentSamplesTest",
  "Levene's Test for Equality of Variances": "titleLevenesTest",
  "Paired Samples Statistics": "titlePairedSamplesStatistics",
  "Paired Samples Test": "titlePairedSamplesTest",
  ANOVA: "titleAnova",
  "Effect Size": "titleEffectSize",
  Coefficients: "titleCoefficients",
  "Collinearity Statistics": "titleCollinearityStatistics",
  Method: "titleMethod",
  "Total Variance Explained": "titleTotalVarianceExplained",
  "Component Correlation Matrix": "titleComponentCorrelationMatrix"
};

export const COLUMN_KEYS: Record<string, string> = {
  statistic: "statistic",
  value: "value",
  rSquared: "resultRSquared",
  adjustedRSquared: "resultAdjustedRSquared",
  fStatistic: "resultFStatistic",
  fPValue: "resultP",
  observations: "resultObservations",
  method: "resultMethod",
  selectedVariables: "resultSelectedVariables",
  b: "resultB",
  beta: "resultBeta",
  stdError: "resultStdError",
  t: "resultT",
  p: "resultP",
  ci: "resultCI",
  tolerance: "resultTolerance",
  vif: "resultVIF",
  component: "resultComponent",
  eigenvalue: "resultEigenvalue",
  variance: "resultVariance",
  cumulativeVariance: "resultCumulativeVariance",
  dominantComponent: "resultDominantComponent",
  dominantLoading: "resultLoading",
  cases: "resultCases",
  n: "resultObservations",
  percent: "resultPercent",
  cronbachAlpha: "resultCronbachAlpha",
  nOfItems: "resultNOfItems",
  item: "resultItem",
  mean: "resultMean",
  stdDeviation: "resultStdDeviation",
  minimum: "resultMinimum",
  maximum: "resultMaximum",
  scaleMeanIfItemDeleted: "resultScaleMeanIfItemDeleted",
  scaleStdIfItemDeleted: "resultScaleStdIfItemDeleted",
  correctedItemTotalCorrelation: "resultCorrectedItemTotalCorrelation",
  alphaIfItemDeleted: "resultAlphaIfItemDeleted",
  option: "resultOption",
  frequency: "resultFrequency",
  cumulativePercent: "resultCumulativePercent",
  percentOfResponses: "resultPercentOfResponses",
  percentOfCases: "resultPercentOfCases",
  percentOfRow: "resultPercentOfRow",
  percentOfColumn: "resultPercentOfColumn",
  percentOfTotal: "resultPercentOfTotal",
  rowVariable: "resultRowVariable",
  colVariable: "resultColVariable",
  variable: "resultVariable",
  observed: "resultObserved",
  expected: "resultExpected",
  test: "resultTest",
  df: "resultDf",
  significance: "resultSignificance",
  asymptoticSignificance: "resultAsymptoticSignificance",
  significanceTwoTailed: "resultSignificanceTwoTailed",
  minimumExpectedCount: "resultMinimumExpectedCount",
  cellsWithExpectedCountBelow5: "resultCellsBelowFive",
  conclusion: "resultConclusion",
  significantDifference: "resultSignificantDifference",
  measure: "resultMeasure",
  group: "resultGroup",
  group1: "resultGroup1",
  group2: "resultGroup2",
  meanDifference: "resultMeanDifference",
  lower95: "resultLower95",
  upper95: "resultUpper95",
  pair: "resultPair",
  source: "resultSource",
  sumOfSquares: "resultSumOfSquares",
  meanSquare: "resultMeanSquare",
  f: "resultF",
  r: "resultR",
  pValue: "resultPValue",
  skewness: "resultSkewness",
  kurtosis: "resultKurtosis",
  initial: "resultInitial",
  extraction: "resultExtraction",
  variancePercent: "resultVariancePercent",
  durbinWatson: "resultDurbinWatson",
  stdErrorOfEstimate: "resultStdErrorOfEstimate"
};

/*
 * 셀에 **이름표로 들어간 글자**. 데이터가 아니라 표가 스스로 붙인 말이라 번역한다.
 *
 * 🔴 아무 칸에나 적용하지 않는다. 응답자가 고른 보기가 우연히 `Total` 일 수 있고,
 * 그걸 바꾸면 **데이터를 고쳐 보여 주는** 셈이다. 그래서 표가 이름표를 놓는 칸으로만
 * 범위를 좁힌다.
 */
const LABEL_COLUMNS = new Set(["statistic", "source", "test", "measure", "item", "option"]);

export const CELL_KEYS: Record<string, string> = {
  "Valid cases": "cellValidCases",
  "Missing cases": "cellMissingCases",
  "Total responses": "cellTotalResponses",
  Total: "cellTotal",
  "Between Groups": "cellBetweenGroups",
  "Within Groups": "cellWithinGroups",
  "Pearson Chi-Square": "cellPearsonChiSquare",
  "N of Valid Cases": "cellNOfValidCases",
  "Cramer's V": "cellCramersV",
  "Cram\u00e9r's V": "cellCramersV",
  "Eta-squared": "cellEtaSquared"
};

function ApaTable({ table, index }: { table: TableData; index: number }) {
  const { t } = useTranslation();
  const titleKey = TABLE_TITLE_KEYS[table.title ?? ""];
  const translatedTitle = titleKey ? t(titleKey) : table.title;
  const translatedColumns = table.columns.map((column) => {
    const key = COLUMN_KEYS[column];
    if (key) return t(key);
    // `component1`, `component2` … 처럼 번호가 붙어 오는 적재량 열.
    if (column.startsWith("component")) return `${t("resultComponent")} ${column.replace("component", "")}`;
    return column;
  });

  /** 표가 스스로 붙인 이름표만 바꾼다. 응답 값은 건드리지 않는다. */
  const translateCell = (column: string, value: unknown) => {
    if (typeof value !== "string" || !LABEL_COLUMNS.has(column)) return value;
    const key = CELL_KEYS[value];
    return key ? t(key) : value;
  };

  return (
    <div className="mb-4 overflow-x-auto">
      <div className="mb-1 text-xs font-semibold text-slate-700">{t("tableLabel", { index: index + 1 })}</div>
      <div className="mb-2 text-xs italic text-slate-600">{translatedTitle}</div>
      {/* Use w-auto so the table only consumes the horizontal space its
          content needs.  Wrapping in an inline-block container keeps the
          underlying flex/grid parent from stretching the table to the full
          available width while still allowing horizontal scroll for wide
          tables. */}
      <div className="inline-block max-w-full align-top">
        <table className="w-auto border-collapse text-left text-xs text-slate-700">
          <thead className="border-b border-t border-slate-900">
            <tr>
              {translatedColumns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="border-b border-slate-900">
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`}>
                {table.columns.map((column) => {
                  const raw = row[column];
                  let display: unknown = translateCell(column, raw);
                  if (column === "cases" && typeof raw === "string") {
                    if (raw === "Valid") display = t("resultValid");
                    else if (raw === "Excluded") display = t("resultExcluded");
                    else if (raw === "Total") display = t("resultTotal");
                  }
                  return (
                    <td key={`${table.title}-${rowIndex}-${column}`} className="whitespace-nowrap px-3 py-1.5 align-top">
                      {formatApaCell(display, column)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExecutionPanel({
  isRunning,
  payloadInfo,
  onRun,
  result,
  error,
  showPayload,
  showDeveloperMenu = true,
  variableLabel,
  onTogglePayload,
  workerReady,
  workerProgress,
  minimalChrome = false,
  onCloseResult,
  autoShowResult = true,
  onAutoShowResultChange,
  onBeforeCopy,
  copyLabel,
  copyEmphasis = "subtle",
  resultFooter,
}: ExecutionPanelProps) {
  const { t } = useTranslation();
  const [resultView, setResultView] = React.useState<"table" | "json">("table");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "error">("idle");
  const moreRef = React.useRef<HTMLDivElement>(null);
  const tables = buildTableData(result, { variableLabel });
  /* 복사한 직후·실패는 라이브러리 문구를 쓴다. 그건 상태 알림이지 이름이 아니다. */
  const copyIdleLabel = copyLabel ?? t("copy");
  const copyStatusLabel =
    copyStatus === "copied" ? t("copied") : copyStatus === "error" ? t("copyFailed") : copyIdleLabel;
  const runDisabled = isRunning || !payloadInfo.canRun || !workerReady;

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    if (moreOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [moreOpen]);

  const handleCopyApaTable = React.useCallback(async () => {
    if (tables.length === 0) {
      return;
    }

    // The embedder may want to say something first. It gets the last word, and no
    // status flashes here — whatever it puts on screen is the feedback.
    if (onBeforeCopy && (await onBeforeCopy()) === false) {
      return;
    }

    const copied = await copyApaTablesToClipboard(tables);
    if (copied) {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1200);
    } else {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1400);
    }
  }, [onBeforeCopy, tables]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm max-[640px]:p-2",
        minimalChrome ? "" : "border border-slate-200"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{t("analysisResult")}</div>
          {minimalChrome && onAutoShowResultChange ? (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              {t("autoShowResult")}
              <button
                type="button"
                onClick={() => onAutoShowResultChange(!autoShowResult)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition",
                  autoShowResult ? "bg-sky-500" : "bg-slate-300"
                )}
                aria-pressed={autoShowResult}
                aria-label={t("autoShowResult")}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition",
                    autoShowResult ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </label>
          ) : null}
          {minimalChrome ? null : (
            <button
              type="button"
              onClick={onRun}
              disabled={runDisabled}
              className="rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("runAnalysis")}
              title={runDisabled ? (isRunning ? t("running") : t("standby")) : t("runAnalysis")}
            >
              <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
        <div className="relative" ref={moreRef}>
          <div className="flex items-center gap-1">
            {showDeveloperMenu ? (
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              className={
                minimalChrome
                  ? "rounded p-1.5 text-slate-700 hover:bg-slate-50"
                  : "rounded border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50"
              }
              aria-label={t("moreActions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            ) : null}
            {minimalChrome && onCloseResult ? (
              <button
                type="button"
                onClick={onCloseResult}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-50"
                aria-label={t("hideResult")}
                title={t("hideResult")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {moreOpen && showDeveloperMenu ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setResultView((prev) => (prev === "table" ? "json" : "table"));
                  setMoreOpen(false);
                }}
                className="mb-1 w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {resultView === "table" ? t("switchToJson") : t("switchToApa")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onTogglePayload();
                  setMoreOpen(false);
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showPayload ? t("hidePayload") : t("showPayload")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!workerReady ? (
        <p className="mb-2 text-xs text-amber-700">{t("workerInitializingPercent", { progress: workerProgress ?? 0 })}</p>
      ) : !payloadInfo.canRun ? (
        <p className="mb-2 text-xs text-amber-700">{payloadInfo.reason}</p>
      ) : null}

      {error ? <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</div> : null}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded border border-slate-200 bg-white p-2">
        {resultView === "table" ? (
          result ? (
            tables.length > 0 ? (
              <div className="min-w-0">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    data-apa-copy=""
                    onClick={() => void handleCopyApaTable()}
                    className={
                      copyEmphasis === "strong"
                        ? "inline-flex items-center gap-1.5 rounded-md border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                        : "inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    }
                    aria-label={copyIdleLabel}
                    title={copyStatusLabel}
                  >
                    <Copy className={copyEmphasis === "strong" ? "h-4 w-4" : "h-3.5 w-3.5"} />
                    {copyStatusLabel}
                  </button>
                </div>
                {tables.map((table, index) => (
                  <ApaTable key={`${table.title}-${index}`} table={table} index={index} />
                ))}
              </div>
            ) : (
                <div className="text-sm text-slate-500">{t("renderUnavailable")}</div>
            )
          ) : (
              <div className="text-sm text-slate-500">{t("runToView")}</div>
          )
        ) : result ? (
          <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(result, null, 2)}</pre>
        ) : (
            <div className="text-sm text-slate-500">{t("runToView")}</div>
        )}
        {/*
          결과 아래에 붙는 것은 결과와 **같이 스크롤한다.**

          밖에 두고 `shrink-0` 를 주었더니, 요인 열두 개짜리 패널이 제 높이를
          그대로 가져가 정작 결과표가 한 줄만 남았다. 아래에 있는 것은 내려서
          보면 되지만, 결과는 돌리자마자 보여야 한다.
        */}
        {result && resultFooter ? <div className="mt-2">{resultFooter}</div> : null}
      </div>

      {showPayload ? (
        <div className="mt-2 min-h-0 overflow-auto rounded border border-slate-200 bg-white p-2">
          <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(payloadInfo.payload, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
