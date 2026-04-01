import type * as React from "react";

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

export type StatsWorkbenchProps = {
  className?: string;
  style?: React.CSSProperties;
  initialAnalysis?: AnalysisKind;
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
