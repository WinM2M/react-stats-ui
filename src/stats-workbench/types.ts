import type * as React from "react";

export type VariableType = "continuous" | "nominal" | "unknown";
export type RoleKey = "groupVar" | "dependentVar" | "independentVars" | "analysisVars";

export type AnalysisKind = "independent_t_test" | "multiple_regression" | "factor_analysis";

export type AnalysisPayload = {
  analysisType: AnalysisKind;
  data: Record<string, unknown>[];
  groupVar?: string;
  dependentVar?: string;
  testVar?: string;
  independentVars?: string[];
  analysisVars?: string[];
  options: Record<string, unknown>;
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
  }[];
};

export type PayloadInfo = { payload: AnalysisPayload; canRun: boolean; reason?: string };
