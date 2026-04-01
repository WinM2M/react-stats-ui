import type { AnalysisDef, AnalysisKind, RoleKey } from "./types";

export const ANALYSIS_DEFS: Record<AnalysisKind, AnalysisDef> = {
  independent_t_test: {
    label: "Independent Samples T-Test",
    roles: [
      { key: "groupVar", label: "Group Variable", multi: false, required: true },
      { key: "dependentVar", label: "Test Variable", multi: false, required: true }
    ]
  },
  multiple_regression: {
    label: "Multiple Regression",
    roles: [
      { key: "dependentVar", label: "Dependent Variable", multi: false, required: true },
      { key: "independentVars", label: "Independent Variables", multi: true, required: true }
    ]
  },
  factor_analysis: {
    label: "Factor Analysis",
    roles: [{ key: "analysisVars", label: "Analysis Variables", multi: true, required: true }]
  }
};

export const EMPTY_ASSIGNMENTS: Record<RoleKey, string[]> = {
  groupVar: [],
  dependentVar: [],
  independentVars: [],
  analysisVars: []
};
