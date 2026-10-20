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
    items: [
      "efaPafOblimin",
      "efaPafPromax",
      "efaMlOblimin",
      "efaMlPromax",
      "efaPafVarimax",
      "pca"
    ]
  },
  {
    key: "scale",
    items: ["mds", "cronbachAlpha"]
  }
];

export const ANALYSIS_DEFS: Record<AnalysisKind, AnalysisDef> = {
  frequencies: {
    // 문항을 하나씩 훑는 것이 이 분석의 쓰임이다. 변수를 여럿 넣으면 문항마다
    // 표가 하나씩 나온다.
    roles: [
      { key: "variable", label: "Variables", multi: true, required: true, minItems: 1 }
    ],
    label: "Frequencies"
  },
  descriptives: {
    label: "Descriptives",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 1 }]
  },
  crosstabs: {
    label: "Crosstabs",
    roles: [
      // 행만 여럿 받는다. 다중응답 문항은 보기마다 열이 하나씩 생기므로 그
      // 묶음을 통째로 행에 놓고 같은 열 변수와 교차하는 것이 하는 일이다.
      { key: "rowVariable", label: "Row Variables", multi: true, required: true, minItems: 1 },
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
  pca: {
    label: "Principal Components x Varimax",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 2 }]
  },
  efaPafOblimin: {
    label: "Principal Axis Factoring x Direct Oblimin",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 3 }]
  },
  efaPafPromax: {
    label: "Principal Axis Factoring x Promax",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 3 }]
  },
  efaMlOblimin: {
    label: "Maximum Likelihood x Direct Oblimin",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 3 }]
  },
  efaMlPromax: {
    label: "Maximum Likelihood x Promax",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 3 }]
  },
  efaPafVarimax: {
    label: "Principal Axis Factoring x Varimax",
    roles: [{ key: "variables", label: "Variables", multi: true, required: true, minItems: 3 }]
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
