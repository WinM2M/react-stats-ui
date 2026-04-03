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
  wikipediaTitle: string;
  formulaLatex: string;
  apaExample: {
    title: string;
    columns: string[];
    rows: Array<Record<string, string>>;
  };
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
    wikipediaTitle: "Frequency_(statistics)",
    formulaLatex: "f_i=\\frac{n_i}{N}",
    apaExample: {
      title: "Frequencies",
      columns: ["Category", "n", "%", "Cumulative %"],
      rows: [
        { Category: "Agree", n: "42", "%": "52.5", "Cumulative %": "52.5" },
        { Category: "Neutral", n: "24", "%": "30.0", "Cumulative %": "82.5" },
        { Category: "Disagree", n: "14", "%": "17.5", "Cumulative %": "100.0" }
      ]
    },
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
    wikipediaTitle: "Descriptive_statistics",
    formulaLatex: "\\bar{x}=\\frac{1}{N}\\sum_{i=1}^{N}x_i",
    apaExample: {
      title: "Descriptive Statistics",
      columns: ["Variable", "N", "M", "SD", "Min", "Max"],
      rows: [
        { Variable: "Score", N: "120", M: "73.42", SD: "8.11", Min: "51", Max: "92" },
        { Variable: "Hours", N: "120", M: "5.37", SD: "1.44", Min: "2", Max: "9" }
      ]
    },
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
    wikipediaTitle: "Contingency_table",
    formulaLatex: "\\chi^2=\\sum\\frac{(O_{ij}-E_{ij})^2}{E_{ij}}",
    apaExample: {
      title: "Chi-Square Test of Independence",
      columns: ["Statistic", "Value", "df", "p"],
      rows: [{ Statistic: "Pearson Chi-Square", Value: "9.84", df: "2", p: ".007" }]
    },
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
    wikipediaTitle: "Student%27s_t-test",
    formulaLatex: "t=\\frac{\\bar{X}_1-\\bar{X}_2}{S_p\\sqrt{\\frac{1}{n_1}+\\frac{1}{n_2}}}",
    apaExample: {
      title: "Independent Samples t Test",
      columns: ["Group", "N", "M", "SD", "t", "df", "p"],
      rows: [
        { Group: "Control", N: "45", M: "68.20", SD: "9.10", t: "2.31", df: "88", p: ".023" },
        { Group: "Treatment", N: "45", M: "72.85", SD: "9.95", t: "2.31", df: "88", p: ".023" }
      ]
    },
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
    wikipediaTitle: "Paired_difference_test",
    formulaLatex: "t=\\frac{\\bar{D}}{S_D/\\sqrt{n}}",
    apaExample: {
      title: "Paired Samples t Test",
      columns: ["Pair", "M Difference", "SD", "t", "df", "p"],
      rows: [{ Pair: "Pre - Post", "M Difference": "-4.20", SD: "6.11", t: "-3.54", df: "39", p: ".001" }]
    },
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
    wikipediaTitle: "Analysis_of_variance",
    formulaLatex: "F=\\frac{MS_{between}}{MS_{within}}",
    apaExample: {
      title: "One-Way ANOVA",
      columns: ["Source", "SS", "df", "MS", "F", "p"],
      rows: [
        { Source: "Between Groups", SS: "412.83", df: "2", MS: "206.42", F: "5.67", p: ".004" },
        { Source: "Within Groups", SS: "3204.11", df: "88", MS: "36.41", F: "", p: "" }
      ]
    },
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
    wikipediaTitle: "Tukey%27s_range_test",
    formulaLatex: "q=\\frac{\\bar{X}_i-\\bar{X}_j}{\\sqrt{MS_W/n}}",
    apaExample: {
      title: "Tukey HSD Pairwise Comparisons",
      columns: ["Comparison", "Mean Difference", "95% CI", "p adj"],
      rows: [
        { Comparison: "A - B", "Mean Difference": "2.91", "95% CI": "[0.58, 5.24]", "p adj": ".011" },
        { Comparison: "A - C", "Mean Difference": "1.04", "95% CI": "[-1.19, 3.27]", "p adj": ".522" }
      ]
    },
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
    wikipediaTitle: "Linear_regression",
    formulaLatex: "Y=\\beta_0+\\beta_1X_1+\\cdots+\\beta_pX_p+\\epsilon",
    apaExample: {
      title: "Linear Regression Coefficients",
      columns: ["Predictor", "B", "SE", "t", "p", "95% CI"],
      rows: [
        { Predictor: "Intercept", B: "21.34", SE: "4.12", t: "5.18", p: "< .001", "95% CI": "[13.16, 29.52]" },
        { Predictor: "StudyHours", B: "3.02", SE: "0.64", t: "4.72", p: "< .001", "95% CI": "[1.75, 4.29]" }
      ]
    },
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
    wikipediaTitle: "Logistic_regression",
    formulaLatex: "\\ln\\left(\\frac{p}{1-p}\\right)=\\beta_0+\\beta_1X_1+\\cdots+\\beta_pX_p",
    apaExample: {
      title: "Binary Logistic Regression",
      columns: ["Predictor", "B", "SE", "OR", "z", "p"],
      rows: [
        { Predictor: "Age", B: "0.08", SE: "0.03", OR: "1.08", z: "2.67", p: ".008" },
        { Predictor: "Income", B: "0.41", SE: "0.15", OR: "1.50", z: "2.73", p: ".006" }
      ]
    },
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
    wikipediaTitle: "Multinomial_logistic_regression",
    formulaLatex: "\\ln\\left(\\frac{P(Y=k)}{P(Y=K)}\\right)=\\beta_{k0}+\\beta_{k1}X_1+\\cdots+\\beta_{kp}X_p",
    apaExample: {
      title: "Multinomial Logistic Regression",
      columns: ["Outcome (vs Ref)", "Predictor", "B", "SE", "OR", "p"],
      rows: [
        { "Outcome (vs Ref)": "Class A", Predictor: "Score", B: "0.25", SE: "0.09", OR: "1.28", p: ".005" },
        { "Outcome (vs Ref)": "Class B", Predictor: "Score", B: "-0.13", SE: "0.07", OR: "0.88", p: ".061" }
      ]
    },
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
    wikipediaTitle: "K-means_clustering",
    formulaLatex: "J=\\sum_{j=1}^{K}\\sum_{i\\in C_j}\\|x_i-\\mu_j\\|^2",
    apaExample: {
      title: "K-Means Cluster Summary",
      columns: ["Cluster", "n", "Centroid 1", "Centroid 2", "Within SS"],
      rows: [
        { Cluster: "1", n: "34", "Centroid 1": "0.82", "Centroid 2": "-0.14", "Within SS": "41.2" },
        { Cluster: "2", n: "29", "Centroid 1": "-0.43", "Centroid 2": "0.91", "Within SS": "37.8" }
      ]
    },
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
    wikipediaTitle: "Hierarchical_clustering",
    formulaLatex: "\\Delta(A,B)=\\frac{n_An_B}{n_A+n_B}\\|\\bar{x}_A-\\bar{x}_B\\|^2",
    apaExample: {
      title: "Hierarchical Clustering Solution",
      columns: ["Cluster", "n", "Average Distance", "Silhouette"],
      rows: [
        { Cluster: "1", n: "31", "Average Distance": "1.44", Silhouette: "0.46" },
        { Cluster: "2", n: "33", "Average Distance": "1.31", Silhouette: "0.49" }
      ]
    },
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
    wikipediaTitle: "Factor_analysis",
    formulaLatex: "X=\\Lambda F+\\epsilon",
    apaExample: {
      title: "Exploratory Factor Loadings",
      columns: ["Item", "Factor 1", "Factor 2", "Communality"],
      rows: [
        { Item: "Q1", "Factor 1": "0.78", "Factor 2": "0.12", Communality: "0.63" },
        { Item: "Q2", "Factor 1": "0.09", "Factor 2": "0.71", Communality: "0.57" }
      ]
    },
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
    wikipediaTitle: "Principal_component_analysis",
    formulaLatex: "\\mathrm{EVR}_k=\\frac{\\lambda_k}{\\sum_{i=1}^{p}\\lambda_i}",
    apaExample: {
      title: "PCA Explained Variance",
      columns: ["Component", "Eigenvalue", "% Variance", "Cumulative %"],
      rows: [
        { Component: "1", Eigenvalue: "3.11", "% Variance": "38.9", "Cumulative %": "38.9" },
        { Component: "2", Eigenvalue: "1.88", "% Variance": "23.5", "Cumulative %": "62.4" }
      ]
    },
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
    wikipediaTitle: "Multidimensional_scaling",
    formulaLatex: "\\sigma=\\sqrt{\\frac{\\sum_{i<j}(d_{ij}-\\delta_{ij})^2}{\\sum_{i<j}d_{ij}^2}}",
    apaExample: {
      title: "MDS Fit Statistics",
      columns: ["Dimensions", "Stress-1", "RSQ", "Iterations"],
      rows: [{ Dimensions: "2", "Stress-1": "0.083", RSQ: "0.94", Iterations: "119" }]
    },
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
    wikipediaTitle: "Cronbach%27s_alpha",
    formulaLatex: "\\alpha=\\frac{K}{K-1}\\left(1-\\frac{\\sum_{i=1}^{K}\\sigma_{Y_i}^2}{\\sigma_X^2}\\right)",
    apaExample: {
      title: "Reliability Statistics",
      columns: ["Scale", "Items", "Cronbach's alpha", "95% CI"],
      rows: [{ Scale: "Satisfaction", Items: "8", "Cronbach's alpha": "0.86", "95% CI": "[0.81, 0.90]" }]
    },
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

function buildFormulaSvgUrl(formulaLatex: string): string {
  const expression = `\\dpi{170}\\bg_white ${formulaLatex}`;
  const encoded = encodeURIComponent(expression);
  return `https://latex.codecogs.com/svg.image?${encoded}`;
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
      formulaSvgUrl: buildFormulaSvgUrl(spec.formulaLatex),
      wikipediaTitle: spec.wikipediaTitle,
      apaExample: spec.apaExample,
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
