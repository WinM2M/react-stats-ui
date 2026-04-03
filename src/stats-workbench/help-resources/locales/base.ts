import type { LocalePack } from "../shared";

type LocaleOverride = Partial<Omit<LocalePack, "templates">> & {
  templates?: Partial<Omit<LocalePack["templates"], "faq" | "dataType" | "dataShape">> & {
    faq?: Partial<LocalePack["templates"]["faq"]>;
    dataType?: Partial<LocalePack["templates"]["dataType"]>;
    dataShape?: Partial<LocalePack["templates"]["dataShape"]>;
  };
};

export function createBaseLocale(overrides: LocaleOverride = {}): LocalePack {
  const base: LocalePack = {
    ui: {
      helpButtonAria: "Open analysis help",
      popoverTitle: "Analysis Help",
      close: "Close",
      overview: "Overview",
      purpose: "Purpose",
      dataTypes: "Data Types and Shape",
      options: "Options",
      interpretation: "Interpretation Guide",
      faq: "FAQ",
      references: "References",
      noOptions: "This method has no configurable options in this UI."
    },
    templates: {
      overview: (analysisLabel, summary) => `${analysisLabel} provides ${summary}.`,
      purpose: (purposeText) => `Use this method to ${purposeText}.`,
      dataType: {
        continuous: "Supports continuous numeric variables.",
        categorical: "Supports categorical/nominal variables.",
        mixed: "Supports a mix of numeric and categorical variables."
      },
      dataShape: {
        single: "Input shape: one selected variable.",
        multi: "Input shape: one dependent target or multiple selected variables.",
        paired: "Input shape: two paired measurements from the same entities.",
        grouped: "Input shape: one measurement variable + one group variable.",
        matrix: "Input shape: matrix-like multivariate records (row = case, column = feature).",
        crossTable: "Input shape: two categorical variables to create a contingency table.",
        items: "Input shape: multiple scale items that represent one construct."
      },
      interpretationPrefix: "- ",
      faq: {
        assumptionsQ: "What assumptions should I check first?",
        assumptionsA:
          "Start with variable type, missing values, and whether your sampling/design matches the method assumptions.",
        unstableQ: "What if results are unstable after changing options?",
        unstableA: "Re-check outliers, scaling, and sample size, then compare with an alternative method for robustness."
      }
    },
    optionNames: {
      equalVariance: "Equal Variance Assumption",
      group1Value: "Group 1 Value",
      group2Value: "Group 2 Value",
      alpha: "Alpha",
      addConstant: "Add Constant",
      referenceCategory: "Reference Category",
      k: "Clusters (K)",
      method: "Linkage Method",
      metric: "Distance Metric",
      nFactors: "Number of Factors",
      rotation: "Rotation",
      nComponents: "Number of Components"
    },
    optionDescriptions: {
      equalVariance: "Choose whether both groups are assumed to have similar variance.",
      group1Value: "Select the category treated as group 1 for pairwise comparison.",
      group2Value: "Select the category treated as group 2 for pairwise comparison.",
      alpha: "Significance threshold used to control false positives.",
      addConstant: "Adds an intercept term to the regression equation.",
      referenceCategory: "Sets the baseline outcome used for coefficient interpretation.",
      k: "Sets the number of clusters to partition the dataset into.",
      method: "Defines how distances between clusters are merged.",
      metric: "Defines the distance function used between observations.",
      nFactors: "Defines the number of latent factors to extract.",
      rotation: "Applies rotation to improve factor interpretability.",
      nComponents: "Sets the lower-dimensional component count to keep."
    },
    purpose: {
      distribution: "profile category distributions",
      summarize: "summarize central tendency and spread",
      association: "inspect whether two categorical variables are related",
      compareMeans: "test whether two independent groups differ in mean",
      pairedDifference: "test within-subject or matched-pair mean differences",
      compareManyMeans: "test whether multiple groups share the same mean",
      posthoc: "identify which pairs differ after a significant omnibus test",
      regression: "model and explain linear relationships",
      classification: "model binary class probabilities",
      multiclass: "model multi-class outcome probabilities",
      clustering: "discover compact groups in unlabeled data",
      hierarchical: "explore nested grouping structure",
      latentStructure: "identify hidden latent constructs",
      dimensionReduction: "reduce dimensionality while preserving variance",
      distanceMap: "project dissimilarities into a low-dimensional map",
      reliability: "evaluate internal consistency of scale items"
    },
    interpretation: {
      dominantCategory: "Check which categories dominate and whether rare levels need consolidation.",
      sparseCells: "Review sparse cells before relying on asymptotic significance tests.",
      meanStd: "Read mean and standard deviation together to avoid over-interpreting the center only.",
      outlier: "Inspect extreme values because outliers can dominate summary statistics.",
      residuals: "Use residual patterns to identify cells driving association.",
      pValue: "Combine p-values with effect size and confidence intervals for practical conclusions.",
      effectSize: "Report effect size to quantify practical magnitude beyond significance.",
      practicalChange: "Compare paired change size with domain-relevant thresholds.",
      posthocNeeded: "If global ANOVA is significant, inspect post-hoc tests to locate differences.",
      pairwise: "Interpret pairwise adjusted p-values as family-wise controlled comparisons.",
      familywiseError: "Keep family-wise error control in mind when many pairs are tested.",
      coefSign: "Coefficient signs and scales indicate direction and strength of associations.",
      rSquared: "Use model fit metrics alongside residual diagnostics.",
      oddsRatio: "Interpret coefficients via odds ratios for clearer effect communication.",
      classification: "Use confusion-related metrics instead of accuracy alone when classes are imbalanced.",
      reference: "Interpret coefficients relative to the selected reference category.",
      clusterSeparation: "Evaluate whether clusters are compact and well separated.",
      clusterSize: "Check cluster size balance; tiny clusters may indicate over-partitioning.",
      dendrogram: "Use dendrogram height jumps to decide meaningful cut points.",
      factorLoading: "Interpret factors using salient loadings and cross-loading patterns.",
      communalities: "Low communalities may indicate weak representation by extracted factors.",
      explainedVariance: "Use cumulative explained variance to judge retained components.",
      componentLoading: "Component loadings describe how original variables contribute to each component.",
      stress: "Lower stress implies better distance preservation in low dimensions.",
      distancePreservation: "Validate whether neighborhood relationships are preserved after projection.",
      alphaThreshold: "Use alpha as a reliability guideline, not a strict pass/fail rule.",
      itemRevision: "Inspect item-total behavior when reliability is lower than expected."
    }
  };

  return {
    ...base,
    ...overrides,
    ui: { ...base.ui, ...(overrides.ui ?? {}) },
    templates: {
      ...base.templates,
      ...(overrides.templates ?? {}),
      dataType: { ...base.templates.dataType, ...(overrides.templates?.dataType ?? {}) },
      dataShape: { ...base.templates.dataShape, ...(overrides.templates?.dataShape ?? {}) },
      faq: { ...base.templates.faq, ...(overrides.templates?.faq ?? {}) }
    },
    optionNames: { ...base.optionNames, ...(overrides.optionNames ?? {}) },
    optionDescriptions: { ...base.optionDescriptions, ...(overrides.optionDescriptions ?? {}) },
    purpose: { ...base.purpose, ...(overrides.purpose ?? {}) },
    interpretation: { ...base.interpretation, ...(overrides.interpretation ?? {}) }
  };
}
