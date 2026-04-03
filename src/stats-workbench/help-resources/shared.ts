import type { AnalysisKind } from "../types";
import type { AnalysisHelpContent, AnalysisHelpResource, HelpUiText } from "./types";

export type LocalePack = {
  ui: HelpUiText;
  templates: {
    overview: (analysisLabel: string, summary: string) => string;
    purpose: (purposeText: string) => string;
    dataType: Record<"continuous" | "categorical" | "mixed", string>;
    dataShape: Record<
      "single" | "multi" | "paired" | "grouped" | "matrix" | "crossTable" | "items",
      string
    >;
    interpretationPrefix: string;
    faq: {
      assumptionsQ: string;
      assumptionsA: string;
      unstableQ: string;
      unstableA: string;
    };
  };
  optionNames: Record<string, string>;
  optionDescriptions: Record<string, string>;
  purpose: Record<string, string>;
  interpretation: Record<string, string>;
};

type AnalysisSpec = {
  label: string;
  summary: string;
  purposeKey: string;
  formula: string;
  dataTypes: Array<"continuous" | "categorical" | "mixed">;
  dataShapes: Array<"single" | "multi" | "paired" | "grouped" | "matrix" | "crossTable" | "items">;
  optionKeys: string[];
  interpretationKeys: string[];
  references: Array<{ label: string; url: string }>;
};

const ANALYSIS_SPECS: Record<AnalysisKind, AnalysisSpec> = {
  frequencies: {
    label: "Frequencies",
    summary: "counts and proportions of categories",
    purposeKey: "distribution",
    formula: "p_i = n_i / N",
    dataTypes: ["categorical"],
    dataShapes: ["single"],
    optionKeys: [],
    interpretationKeys: ["dominantCategory", "sparseCells"],
    references: [
      { label: "Wikipedia: Frequency (statistics)", url: "https://en.wikipedia.org/wiki/Frequency_(statistics)" },
      { label: "Wikipedia: Histogram", url: "https://en.wikipedia.org/wiki/Histogram" }
    ]
  },
  descriptives: {
    label: "Descriptives",
    summary: "central tendency and variability",
    purposeKey: "summarize",
    formula: "mean = (sum x_i) / n",
    dataTypes: ["continuous"],
    dataShapes: ["multi"],
    optionKeys: [],
    interpretationKeys: ["meanStd", "outlier"],
    references: [
      { label: "Wikipedia: Descriptive statistics", url: "https://en.wikipedia.org/wiki/Descriptive_statistics" },
      { label: "NIST: Summary Statistics", url: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda35s.htm" }
    ]
  },
  crosstabs: {
    label: "Crosstabs",
    summary: "association patterns between two categorical variables",
    purposeKey: "association",
    formula: "chi2 = sum((O_ij - E_ij)^2 / E_ij)",
    dataTypes: ["categorical"],
    dataShapes: ["crossTable"],
    optionKeys: [],
    interpretationKeys: ["residuals", "sparseCells"],
    references: [
      { label: "Wikipedia: Contingency table", url: "https://en.wikipedia.org/wiki/Contingency_table" },
      { label: "Wikipedia: Chi-squared test", url: "https://en.wikipedia.org/wiki/Chi-squared_test" }
    ]
  },
  ttestIndependent: {
    label: "Independent-Samples T-Test",
    summary: "mean difference between two independent groups",
    purposeKey: "compareMeans",
    formula: "t = (x1_bar - x2_bar) / SE",
    dataTypes: ["continuous", "categorical"],
    dataShapes: ["grouped"],
    optionKeys: ["equalVariance", "group1Value", "group2Value"],
    interpretationKeys: ["pValue", "effectSize"],
    references: [
      { label: "Wikipedia: Student's t-test", url: "https://en.wikipedia.org/wiki/Student%27s_t-test" },
      { label: "Wikipedia: Welch's t-test", url: "https://en.wikipedia.org/wiki/Welch%27s_t-test" }
    ]
  },
  ttestPaired: {
    label: "Paired-Samples T-Test",
    summary: "mean difference within matched pairs",
    purposeKey: "pairedDifference",
    formula: "t = d_bar / (s_d / sqrt(n))",
    dataTypes: ["continuous"],
    dataShapes: ["paired"],
    optionKeys: [],
    interpretationKeys: ["pValue", "practicalChange"],
    references: [
      { label: "Wikipedia: Paired difference test", url: "https://en.wikipedia.org/wiki/Paired_difference_test" },
      { label: "Wikipedia: Student's t-test", url: "https://en.wikipedia.org/wiki/Student%27s_t-test" }
    ]
  },
  anovaOneway: {
    label: "One-Way ANOVA",
    summary: "mean differences across three or more groups",
    purposeKey: "compareManyMeans",
    formula: "F = MS_between / MS_within",
    dataTypes: ["continuous", "categorical"],
    dataShapes: ["grouped"],
    optionKeys: [],
    interpretationKeys: ["pValue", "posthocNeeded"],
    references: [
      { label: "Wikipedia: Analysis of variance", url: "https://en.wikipedia.org/wiki/Analysis_of_variance" },
      { label: "Wikipedia: F-test", url: "https://en.wikipedia.org/wiki/F-test" }
    ]
  },
  posthocTukey: {
    label: "Post-hoc Tukey HSD",
    summary: "which group pairs differ after ANOVA",
    purposeKey: "posthoc",
    formula: "q = (x_i_bar - x_j_bar) / SE",
    dataTypes: ["continuous", "categorical"],
    dataShapes: ["grouped"],
    optionKeys: ["alpha"],
    interpretationKeys: ["pairwise", "familywiseError"],
    references: [
      { label: "Wikipedia: Tukey's range test", url: "https://en.wikipedia.org/wiki/Tukey%27s_range_test" },
      { label: "Wikipedia: Family-wise error rate", url: "https://en.wikipedia.org/wiki/Family-wise_error_rate" }
    ]
  },
  linearRegression: {
    label: "Linear Regression (OLS)",
    summary: "linear relationship between predictors and an outcome",
    purposeKey: "regression",
    formula: "y = beta0 + beta1*x1 + ... + epsilon",
    dataTypes: ["continuous", "mixed"],
    dataShapes: ["multi"],
    optionKeys: ["addConstant"],
    interpretationKeys: ["coefSign", "rSquared"],
    references: [
      { label: "Wikipedia: Linear regression", url: "https://en.wikipedia.org/wiki/Linear_regression" },
      { label: "Wikipedia: Ordinary least squares", url: "https://en.wikipedia.org/wiki/Ordinary_least_squares" }
    ]
  },
  logisticBinary: {
    label: "Binary Logistic Regression",
    summary: "probability of a binary outcome",
    purposeKey: "classification",
    formula: "log(p/(1-p)) = beta0 + beta1*x1 + ...",
    dataTypes: ["mixed"],
    dataShapes: ["multi"],
    optionKeys: ["addConstant"],
    interpretationKeys: ["oddsRatio", "classification"],
    references: [
      { label: "Wikipedia: Logistic regression", url: "https://en.wikipedia.org/wiki/Logistic_regression" },
      { label: "Wikipedia: Odds ratio", url: "https://en.wikipedia.org/wiki/Odds_ratio" }
    ]
  },
  logisticMultinomial: {
    label: "Multinomial Logistic Regression",
    summary: "probabilities across multiple outcome categories",
    purposeKey: "multiclass",
    formula: "log(P(y=k)/P(y=ref)) = beta_k0 + beta_k*x",
    dataTypes: ["mixed"],
    dataShapes: ["multi"],
    optionKeys: ["referenceCategory"],
    interpretationKeys: ["reference", "classification"],
    references: [
      {
        label: "Wikipedia: Multinomial logistic regression",
        url: "https://en.wikipedia.org/wiki/Multinomial_logistic_regression"
      },
      { label: "Wikipedia: Logistic regression", url: "https://en.wikipedia.org/wiki/Logistic_regression" }
    ]
  },
  kmeans: {
    label: "K-Means Clustering",
    summary: "partitions observations into K clusters",
    purposeKey: "clustering",
    formula: "arg min sum(||x - mu_k||^2)",
    dataTypes: ["continuous"],
    dataShapes: ["matrix"],
    optionKeys: ["k"],
    interpretationKeys: ["clusterSeparation", "clusterSize"],
    references: [
      { label: "Wikipedia: K-means clustering", url: "https://en.wikipedia.org/wiki/K-means_clustering" },
      { label: "Wikipedia: Elbow method", url: "https://en.wikipedia.org/wiki/Elbow_method_(clustering)" }
    ]
  },
  hierarchicalCluster: {
    label: "Hierarchical Clustering",
    summary: "nested cluster tree from pairwise distances",
    purposeKey: "hierarchical",
    formula: "d(A,B) = linkage(distance matrix)",
    dataTypes: ["continuous"],
    dataShapes: ["matrix"],
    optionKeys: ["method", "metric"],
    interpretationKeys: ["dendrogram", "clusterSeparation"],
    references: [
      { label: "Wikipedia: Hierarchical clustering", url: "https://en.wikipedia.org/wiki/Hierarchical_clustering" },
      { label: "Wikipedia: Dendrogram", url: "https://en.wikipedia.org/wiki/Dendrogram" }
    ]
  },
  efa: {
    label: "Exploratory Factor Analysis",
    summary: "latent factors that explain covariance",
    purposeKey: "latentStructure",
    formula: "x = Lambda*f + epsilon",
    dataTypes: ["continuous"],
    dataShapes: ["matrix"],
    optionKeys: ["nFactors", "rotation"],
    interpretationKeys: ["factorLoading", "communalities"],
    references: [
      { label: "Wikipedia: Factor analysis", url: "https://en.wikipedia.org/wiki/Factor_analysis" },
      { label: "Wikipedia: Factor loading", url: "https://en.wikipedia.org/wiki/Factor_loading" }
    ]
  },
  pca: {
    label: "Principal Component Analysis",
    summary: "orthogonal components with maximum variance",
    purposeKey: "dimensionReduction",
    formula: "Z = X * W",
    dataTypes: ["continuous"],
    dataShapes: ["matrix"],
    optionKeys: ["nComponents"],
    interpretationKeys: ["explainedVariance", "componentLoading"],
    references: [
      { label: "Wikipedia: Principal component analysis", url: "https://en.wikipedia.org/wiki/Principal_component_analysis" },
      { label: "Wikipedia: Scree plot", url: "https://en.wikipedia.org/wiki/Scree_plot" }
    ]
  },
  mds: {
    label: "Multidimensional Scaling",
    summary: "low-dimensional embedding from distances",
    purposeKey: "distanceMap",
    formula: "arg min stress(D, d(X))",
    dataTypes: ["continuous"],
    dataShapes: ["matrix"],
    optionKeys: ["nComponents"],
    interpretationKeys: ["stress", "distancePreservation"],
    references: [
      { label: "Wikipedia: Multidimensional scaling", url: "https://en.wikipedia.org/wiki/Multidimensional_scaling" },
      { label: "Wikipedia: Stress majorization", url: "https://en.wikipedia.org/wiki/Stress_majorization" }
    ]
  },
  cronbachAlpha: {
    label: "Cronbach Alpha",
    summary: "internal consistency of scale items",
    purposeKey: "reliability",
    formula: "alpha = (k/(k-1)) * (1 - sum(s_i^2)/s_total^2)",
    dataTypes: ["continuous", "categorical"],
    dataShapes: ["items"],
    optionKeys: [],
    interpretationKeys: ["alphaThreshold", "itemRevision"],
    references: [
      { label: "Wikipedia: Cronbach's alpha", url: "https://en.wikipedia.org/wiki/Cronbach%27s_alpha" },
      { label: "Wikipedia: Reliability (statistics)", url: "https://en.wikipedia.org/wiki/Reliability_(statistics)" }
    ]
  }
};

function escapeXml(text: string): string {
  return text
    .split("&")
    .join("&amp;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;")
    .split('"')
    .join("&quot;")
    .split("'")
    .join("&apos;");
}

function buildFormulaSvg(label: string, formula: string): string {
  const title = `${label} formula`;
  const escapedTitle = escapeXml(title);
  const escapedFormula = escapeXml(formula);

  return [
    "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='120' viewBox='0 0 720 120' role='img' aria-labelledby='formulaTitle formulaText'>",
    `<title id='formulaTitle'>${escapedTitle}</title>`,
    "<rect x='1' y='1' width='718' height='118' rx='12' fill='#f8fafc' stroke='#cbd5e1'/>",
    "<text id='formulaText' x='24' y='74' font-family='ui-monospace, SFMono-Regular, Menlo, monospace' font-size='24' fill='#0f172a'>",
    escapedFormula,
    "</text>",
    "</svg>"
  ].join("");
}

export function buildAnalysisHelpResource(localePack: LocalePack): AnalysisHelpResource {
  const analyses = Object.entries(ANALYSIS_SPECS).reduce<Record<AnalysisKind, AnalysisHelpContent>>((acc, [key, spec]) => {
    const kind = key as AnalysisKind;
    const dataTypeLines = spec.dataTypes.map((typeKey) => localePack.templates.dataType[typeKey]);
    const dataShapeLines = spec.dataShapes.map((shapeKey) => localePack.templates.dataShape[shapeKey]);
    const options = spec.optionKeys.map((optionKey) => ({
      name: localePack.optionNames[optionKey] ?? optionKey,
      description: localePack.optionDescriptions[optionKey] ?? optionKey
    }));
    const interpretation = spec.interpretationKeys.map(
      (itemKey) => `${localePack.templates.interpretationPrefix}${localePack.interpretation[itemKey] ?? itemKey}`
    );

    acc[kind] = {
      overview: localePack.templates.overview(spec.label, spec.summary),
      purpose: localePack.templates.purpose(localePack.purpose[spec.purposeKey] ?? spec.purposeKey),
      formulaTitle: `${spec.label} Formula`,
      formulaAlt: `${spec.label} key formula`,
      formulaSvg: buildFormulaSvg(spec.label, spec.formula),
      dataTypes: [...dataTypeLines, ...dataShapeLines],
      options,
      interpretation,
      faqs: [
        {
          question: localePack.templates.faq.assumptionsQ,
          answer: localePack.templates.faq.assumptionsA
        },
        {
          question: localePack.templates.faq.unstableQ,
          answer: localePack.templates.faq.unstableA
        }
      ],
      references: spec.references
    };

    return acc;
  }, {} as Record<AnalysisKind, AnalysisHelpContent>);

  return {
    ui: localePack.ui,
    analyses
  };
}
