import type { AnalysisDef, AnalysisKind, RoleKey } from "./types";

export const ANALYSIS_GROUPS: Array<{
  key: "descriptive" | "compareMeans" | "regression" | "classify" | "dimensionReduction" | "scale";
  items: AnalysisKind[];
}> = [
  {
    key: "descriptive",
    items: ["frequencies", "descriptives", "crosstabs"]
  },
  {
    key: "compareMeans",
    items: ["ttestIndependent", "ttestPaired", "anovaOneway", "posthocTukey"]
  },
  {
    key: "regression",
    items: ["linearRegression", "logisticBinary", "logisticMultinomial"]
  },
  {
    key: "classify",
    items: ["kmeans", "hierarchicalCluster"]
  },
  {
    key: "dimensionReduction",
    items: ["efa", "pca"]
  },
  {
    key: "scale",
    items: ["mds", "cronbachAlpha"]
  }
];

export const ANALYSIS_DEFS: Record<AnalysisKind, AnalysisDef> = {
  frequencies: {
    label: "Frequencies",
    roles: [
      { key: "variable", label: "Variable", multi: false, required: true }
    ]
  },
  descriptives: {
    label: "Descriptives",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 1 }]
  },
  crosstabs: {
    label: "Crosstabs",
    roles: [
      { key: "rowVariable", label: "Row Variable", multi: false, required: true },
      { key: "colVariable", label: "Column Variable", multi: false, required: true }
    ]
  },
  ttestIndependent: {
    label: "Independent-Samples T-Test",
    roles: [
      { key: "variable", label: "Test Variable", multi: false, required: true },
      { key: "groupVariable", label: "Group Variable", multi: false, required: true }
    ]
  },
  ttestPaired: {
    label: "Paired-Samples T-Test",
    roles: [
      { key: "variable1", label: "Variable 1", multi: false, required: true },
      { key: "variable2", label: "Variable 2", multi: false, required: true }
    ]
  },
  anovaOneway: {
    label: "One-Way ANOVA",
    roles: [
      { key: "variable", label: "Dependent Variable", multi: false, required: true },
      { key: "groupVariable", label: "Group Variable", multi: false, required: true }
    ]
  },
  posthocTukey: {
    label: "Post-hoc Tukey HSD",
    roles: [
      { key: "variable", label: "Dependent Variable", multi: false, required: true },
      { key: "groupVariable", label: "Group Variable", multi: false, required: true }
    ]
  },
  linearRegression: {
    label: "Linear Regression (OLS)",
    roles: [
      { key: "dependentVariable", label: "Dependent Variable", multi: false, required: true },
      { key: "independentVariables", label: "Independent Variables", multi: true, required: true, minItems: 1 }
    ]
  },
  logisticBinary: {
    label: "Binary Logistic Regression",
    roles: [
      { key: "dependentVariable", label: "Dependent Variable", multi: false, required: true },
      { key: "independentVariables", label: "Independent Variables", multi: true, required: true, minItems: 1 }
    ]
  },
  logisticMultinomial: {
    label: "Multinomial Logistic Regression",
    roles: [
      { key: "dependentVariable", label: "Dependent Variable", multi: false, required: true },
      { key: "independentVariables", label: "Independent Variables", multi: true, required: true, minItems: 1 }
    ]
  },
  kmeans: {
    label: "K-Means Clustering",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 2 }]
  },
  hierarchicalCluster: {
    label: "Hierarchical Clustering",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 2 }]
  },
  efa: {
    label: "Exploratory Factor Analysis",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 2 }]
  },
  pca: {
    label: "Principal Component Analysis",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 2 }]
  },
  mds: {
    label: "Multidimensional Scaling",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 2 }]
  },
  cronbachAlpha: {
    label: "Cronbach Alpha",
    roles: [{ key: "items", label: "Scale Items", multi: true, required: true, minItems: 2 }]
  }
};

export const EMPTY_ASSIGNMENTS: Record<RoleKey, string[]> = {
  variable: [],
  variables: [],
  rowVariable: [],
  colVariable: [],
  groupVariable: [],
  dependentVariable: [],
  independentVariables: [],
  variable1: [],
  variable2: [],
  items: []
};
