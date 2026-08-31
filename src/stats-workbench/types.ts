import type * as React from "react";
import type { SupportedLanguage } from "./i18n";

export const VARIABLE_DRAG_DATA_FORMAT = "application/x.winm2m-variable";

export type VariableType = "continuous" | "nominal" | "unknown";
export type RoleKey =
  | "variable"
  | "variables"
  | "rowVariable"
  | "colVariable"
  | "groupVariable"
  | "dependentVariable"
  | "independentVariables"
  | "variable1"
  | "variable2"
  | "items";

export type AnalysisKind =
  | "frequencies"
  | "descriptives"
  | "crosstabs"
  | "ttestIndependent"
  | "ttestPaired"
  | "anovaOneway"
  | "posthocTukey"
  | "linearRegression"
  | "logisticBinary"
  | "logisticMultinomial"
  | "kmeans"
  | "hierarchicalCluster"
  | "pca"
  | "mds"
  | "cronbachAlpha";

export type AnalysisPayload = {
  analysisType: AnalysisKind;
  method: AnalysisKind;
  input: Record<string, unknown>;
  options: Record<string, unknown>;
  assignments: Record<RoleKey, string[]>;
};

/**
 * How a failed run should be read by whoever is logging it.
 *
 * Only two values, deliberately. The engine reports failures as free-form strings,
 * so the one distinction we can draw honestly is "the environment broke" versus
 * "the analysis itself refused". Inventing finer buckets from message matching
 * would be guesswork that looks like data.
 */
export type AnalysisFailureKind =
  /** Worker init, script fetch, SDK not ready — not the user's doing. */
  | "SYSTEM"
  /** The analysis ran and rejected: bad roles, too few cases, no convergence. */
  | "STATS";

/**
 * 실행을 누가 시작했는가.
 *
 * 워크벤치는 화면 진입·변수 변경 시 스스로 한 번 돌린다. 그 실행까지 "학생이 분석을
 * 수행했다" 로 기록하면 학습 로그가 오염된다 — 아무것도 누르지 않아도 완수로 잡힌다.
 * 기록하는 쪽이 구별할 수 있도록 계기를 함께 알린다.
 */
export type AnalysisTrigger =
  /** 사용자가 실행을 눌렀거나 임베더가 명시적으로 호출했다. */
  | "manual"
  /** 워크벤치가 상태 변화를 보고 스스로 돌렸다. */
  | "auto";

export type AnalysisFailure = {
  /** Untranslated, straight from the thrower. Translate at the point of display. */
  message: string;
  kind: AnalysisFailureKind;
  /** Stable slug for logs and aggregation. Never translated. */
  code: string;
};

export type AnalysisResult = {
  payload: AnalysisPayload;
  /** 이 실행을 누가 시작했는지. 기록 여부를 가르는 기준이다. */
  trigger: AnalysisTrigger;
  /** Undefined when `error` is set. */
  result: unknown;
  /**
   * Present only when the run failed.
   *
   * Failures are reported through the same callback as successes on purpose — an
   * embedder recording a learning log needs "tried and failed" and "never tried"
   * to be different things, and a callback that only fires on success cannot tell
   * them apart.
   */
  error?: AnalysisFailure;
};

export type ExternalDataInput = {
  rows: Record<string, unknown>[];
  columns?: VariableMeta[];
  id?: string;
  name?: string;
};

export type ExternalAnalysisInput = Omit<Record<string, unknown>, "data">;

export type RunState = {
  /** Whether `run()` would do anything right now. */
  canRun: boolean;
  /** Why not, phrased for a user, when `canRun` is false. */
  reason: string | null;
  workerReady: boolean;
};

export type StatsWorkbenchControl = {
  injectData: (data: ExternalDataInput) => void;
  clearInjectedData: () => void;
  /**
   * Runs whatever the role panel currently holds — the same thing the panel's own run
   * action does. For an embedder that wants its own run button on top of roles the
   * visitor set by hand.
   */
  run: () => void;
  /**
   * Runs one analysis on the injected data, naming the variables yourself.
   *
   * Pass each role under the key that analysis declares — `ttestIndependent` takes
   * `variable` and `groupVariable`, `ttestPaired` takes `variable1`/`variable2`,
   * `descriptives` takes `variables`. Those roles are mirrored into the panel, so the
   * screen shows what was run instead of warning that nothing is set.
   *
   * Anything else you pass is treated as an option (`equalVariance`, `alpha`, …).
   * Arguments the SDK needs but you cannot know — the two group values an independent
   * t-test compares, for instance — are derived from the data for you.
   */
  executeAnalysis: (method: AnalysisKind, input?: ExternalAnalysisInput) => Promise<unknown>;
  runFrequencies: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runDescriptives: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runCrosstabs: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runTtestIndependent: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runTtestPaired: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runAnovaOneway: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runPosthocTukey: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runLinearRegression: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runLogisticBinary: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runLogisticMultinomial: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runKmeans: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runHierarchicalCluster: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runPca: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runMds: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runCronbachAlpha: (input?: ExternalAnalysisInput) => Promise<unknown>;
  setResultVisible: (next: boolean) => void;
  toggleResultVisible: () => boolean;
  setAutoShowResult: (next: boolean) => void;
  toggleAutoShowResult: () => boolean;
  getAutoShowResult: () => boolean;
  copyApaTable: () => Promise<boolean>;
  /**
   * The APA tables as HTML — the same markup `copyApaTable` puts on the clipboard,
   * handed back instead of written out. `null` when there is no result to render.
   *
   * The clipboard is the wrong road for an embedder that wants to *keep* a result:
   * reading it back needs a permission prompt, and it destroys whatever the person
   * had copied a moment ago. An embedder collecting results into a report needs the
   * markup itself, and the markup carries inline styles precisely so it survives
   * being pasted into an editor that knows nothing about this package's CSS.
   */
  getApaTableHtml: () => string | null;
  assignVariableToRole: (variableName: string, role: RoleKey) => boolean;
  assignVariableToBestRole: (variableName: string) => boolean;
  handleExternalVariableDrop: (item: VariableDragItem, role?: RoleKey) => boolean;
};

export type StatsWorkbenchProps = {
  className?: string;
  style?: React.CSSProperties;
  initialAnalysis?: AnalysisKind;
  layoutMode?: "full" | "minimal";
  language?: SupportedLanguage;
  showDatasetPopover?: boolean;
  showAnalysisHelpButton?: boolean;
  /**
   * Restricts which analyses the picker offers. Omit for all of them. A single entry
   * drops the dropdown entirely and shows the name as a label, which is what an
   * embedder wanting one fixed test on a page needs.
   *
   * This is a UI affordance, not a security boundary — the engine itself is open
   * source and reachable from the console either way.
   */
  allowedAnalyses?: AnalysisKind[];
  /**
   * Runs before the result panel's copy button copies anything. Returning false
   * cancels the copy, leaving the embedder free to show its own prompt first and
   * then call `copyApaTable()` on the ref to go ahead.
   */
  onBeforeCopyApaTable?: () => boolean | Promise<boolean>;
  /**
   * APA 표 복사 단추의 문구. 기본값은 로케일의 "Copy".
   *
   * 기본 문구는 무엇을 복사하는지 말하지 않는다. 임베더 실측에서, 결과까지 도달한
   * 방문자 5명 중 이 단추를 누른 사람이 0명이었다 — 눌러 보고 그만둔 것이 아니라
   * 손이 가지 않았다. "Copy APA table" 처럼 무엇을 주는지 적을 수 있게 연다.
   *
   * 복사 직후·실패 문구는 바뀌지 않는다. 그건 이름이 아니라 상태 알림이다.
   */
  apaCopyLabel?: string;
  /**
   * APA 표 복사 단추의 무게. 기본은 표 위에 조용히 붙는 회색 단추(`subtle`).
   *
   * `strong` 은 채운 단추다. 이 표를 가져가는 것이 그 화면에서 할 만한 다음 일인 곳에서
   * 쓴다. 결과를 보여주는 것 자체가 목적인 공개 계산기 페이지가 그런 경우다.
   */
  apaCopyEmphasis?: "subtle" | "strong";
  /**
   * Fires whenever the answer to "would `run()` work" changes. An embedder drawing its
   * own run button needs this to enable it, since a ref method cannot re-render them.
   */
  onRunStateChange?: (state: RunState) => void;
  /**
   * Which side of the assignment panel the variable list sits on. Defaults to the left.
   * An embedder whose other screens put it on the right needs `"end"` so a visitor
   * moving between them is not hunting for it.
   */
  variableListPosition?: "start" | "end";
  minimalAutoShowResultEnabled?: boolean;
  analysisExecutor?: (payload: AnalysisPayload) => Promise<unknown>;
  onResult?: (result: AnalysisResult) => void;
  /**
   * Fires when the analysis help popover is opened, not when it is closed.
   *
   * An embedder tracking what a learner consulted needs the open event; the panel
   * otherwise keeps that entirely to itself.
   */
  onHelpOpen?: (analysisType: AnalysisKind) => void;
  hideInternalVariableList?: boolean;
};

export type Dataset = {
  id: string;
  name: string;
  createdAt: number;
  rows: Record<string, unknown>[];
  columns: VariableMeta[];
};

export type VariableMeta = {
  name: string;
  type: VariableType;
};

export type VariableDragItem = {
  variableName: string;
  variableNames?: string[];
  variableType?: VariableType;
  datasetId?: string | null;
  datasetName?: string | null;
  source?: "stats-workbench" | "external";
  meta?: Record<string, unknown>;
};

export type AnalysisDef = {
  label: string;
  roles: {
    key: RoleKey;
    label: string;
    multi: boolean;
    required: boolean;
    minItems?: number;
  }[];
};

export type PayloadInfo = {
  payload: AnalysisPayload;
  canRun: boolean;
  reason?: string;
  meta?: Record<string, unknown>;
};
