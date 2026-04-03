import type * as React from "react";
import type { SupportedLanguage } from "./i18n";

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
  | "efa"
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
  runEfa: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runPca: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runMds: (input?: ExternalAnalysisInput) => Promise<unknown>;
  runCronbachAlpha: (input?: ExternalAnalysisInput) => Promise<unknown>;
  setResultVisible: (next: boolean) => void;
  toggleResultVisible: () => boolean;
  setAutoShowResult: (next: boolean) => void;
  toggleAutoShowResult: () => boolean;
  getAutoShowResult: () => boolean;
  copyApaTable: () => Promise<boolean>;
};

export type StatsWorkbenchProps = {
  className?: string;
  style?: React.CSSProperties;
  initialAnalysis?: AnalysisKind;
  layoutMode?: "full" | "minimal";
  language?: SupportedLanguage;
  showDatasetPopover?: boolean;
  showAnalysisHelpButton?: boolean;
  minimalAutoShowResultEnabled?: boolean;
  analysisExecutor?: (payload: AnalysisPayload) => Promise<unknown>;
  onResult?: (result: AnalysisResult) => void;
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
