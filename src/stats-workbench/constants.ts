import type { AnalysisDef, AnalysisKind, RoleKey } from "./types";

export const ANALYSIS_GROUPS: Array<{
  key: "descriptive" | "compareMeans" | "regression" | "classify" | "conditionalProcess" | "dimensionReduction" | "scale";
  items: AnalysisKind[];
}> = [
  {
    key: "descriptive",
    items: ["frequencies", "multipleResponse", "descriptives", "crosstabs"]
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
    // 경로를 묻는 분석이라 회귀 바로 뒤에 둔다. 회귀 묶음 안에 9개를 넣으면
    // 회귀 3종이 밀려 보이지 않는다.
    key: "conditionalProcess",
    items: [
      "processModeration",
      "processModeration2",
      "processModeration3Way",
      "processMediation",
      "processSerialMediation",
      "processModMedFirstStage",
      "processModMedSecondStage",
      "processModMedBothStages",
      "processModMedAllPaths"
    ]
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
      { key: "variables", label: "Variables", multi: true, required: true, minItems: 1 }
    ],
    label: "Frequencies"
  },
  multipleResponse: {
    // 「모두 고르세요」 문항 하나가 통째로 들어온다. 보기마다 생긴 0/1 변수
    // 전부를 한 칸에 넣는 것이지, 서로 다른 문항을 섞는 자리가 아니다.
    label: "Multiple Response Frequencies",
    roles: [
      { key: "variables", label: "Option Variables", multi: true, required: true, minItems: 2 }
    ]
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
  processModeration: {
    // Y = i + b1X + b2W + b3XW. 조절변수가 매개변수 자리로 들어가지 않도록 칸을 따로 둔다.
    label: "Simple Moderation (Model 1)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "moderator", label: "Moderator (W)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processModeration2: {
    // 두 조절변수가 **각각** X 와 곱해진다. 셋이 함께 곱해지는 3원 상호작용은 모형 3 이다.
    label: "Two Moderators (Model 2)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "moderator", label: "Moderator (W)", multi: false, required: true },
      { key: "moderator2", label: "Moderator (Z)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processModeration3Way: {
    // XxWxZ 까지 넣는다. W 의 조절이 Z 수준에 따라 달라지는가를 묻는 자리다.
    label: "Three-Way Interaction (Model 3)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "moderator", label: "Moderator (W)", multi: false, required: true },
      { key: "moderator2", label: "Moderator (Z)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processMediation: {
    // **병렬**이다. 매개변수를 여럿 넣으면 X 가 각각을 따로 거쳐 Y 로 간다. 서로를 거치게 하려면 모형 6 이다.
    label: "Parallel Mediation (Model 4)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "mediators", label: "Mediators (M)", multi: true, required: true, minItems: 1 },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processSerialMediation: {
    // **순서가 뜻을 가진다**: X -> M1 -> M2 -> Y. 넣은 차례가 곧 경로라 최소 두 개가 필요하다.
    label: "Serial Mediation (Model 6)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "mediators", label: "Mediators (M, in order)", multi: true, required: true, minItems: 2 },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processModMedFirstStage: {
    // 조절변수가 X -> M (a경로)에 걸린다.
    label: "Moderated Mediation, First Stage (Model 7)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "mediators", label: "Mediators (M)", multi: true, required: true, minItems: 1 },
      { key: "moderator", label: "Moderator of a-path (W)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processModMedSecondStage: {
    // 조절변수가 M -> Y (b경로)에 걸린다. 계산기에는 `v` 인자로 넘어가는 유일한 모형이다.
    label: "Moderated Mediation, Second Stage (Model 14)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "mediators", label: "Mediators (M)", multi: true, required: true, minItems: 1 },
      { key: "moderator", label: "Moderator of b-path (W)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processModMedBothStages: {
    // 같은 조절변수가 a 와 b 두 경로 모두에 걸린다.
    label: "Moderated Mediation, Both Stages (Model 58)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "mediators", label: "Mediators (M)", multi: true, required: true, minItems: 1 },
      { key: "moderator", label: "Moderator of a- and b-paths (W)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
  },
  processModMedAllPaths: {
    // a, b 에 더해 직접효과 c' 까지 조절된다. 그래서 직접효과도 수준별로 여러 줄이 나온다.
    label: "Moderated Mediation, All Paths (Model 59)",
    roles: [
      { key: "predictor", label: "Independent Variable (X)", multi: false, required: true },
      { key: "outcomeVariable", label: "Dependent Variable (Y)", multi: false, required: true },
      { key: "mediators", label: "Mediators (M)", multi: true, required: true, minItems: 1 },
      { key: "moderator", label: "Moderator of all paths (W)", multi: false, required: true },
      { key: "covariates", label: "Covariates", multi: true, required: false }
    ]
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
  items: [],
  predictor: [],
  outcomeVariable: [],
  mediators: [],
  moderator: [],
  moderator2: [],
  covariates: []
};
