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

export type AnalysisResult = {
  payload: AnalysisPayload;
  result: unknown;
};

export type ExternalDataInput = {
  rows: Record<string, unknown>[];
  columns?: VariableMeta[];
  id?: string;
  name?: string;
};

export type ExternalAnalysisInput = Omit<Record<string, unknown>, "data">;

export type StatsWorkbenchControl = {
  injectData: (data: ExternalDataInput) => void;
  clearInjectedData: () => void;
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
  minimalAutoShowResultEnabled?: boolean;
  analysisExecutor?: (payload: AnalysisPayload) => Promise<unknown>;
  onResult?: (result: AnalysisResult) => void;
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
