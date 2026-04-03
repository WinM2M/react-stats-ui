import type { AnalysisKind } from "../types";

export type HelpReference = {
  label: string;
  url: string;
};

export type HelpOption = {
  name: string;
  description: string;
};

export type HelpFaq = {
  question: string;
  answer: string;
};

export type HelpApaExample = {
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
};

export type AnalysisHelpContent = {
  overview: string;
  purpose: string;
  formulaTitle: string;
  formulaAlt: string;
  formulaSvgUrl: string;
  wikipediaTitle: string;
  apaExample: HelpApaExample;
  dataTypes: string[];
  options: HelpOption[];
  interpretation: string[];
  faqs: HelpFaq[];
  references: HelpReference[];
};

export type HelpUiText = {
  helpButtonAria: string;
  popoverTitle: string;
  close: string;
  overview: string;
  purpose: string;
  wikipediaDefinition: string;
  wikipediaSourcePrefix: string;
  wikipediaLoading: string;
  wikipediaUnavailable: string;
  dataTypes: string;
  options: string;
  interpretation: string;
  faq: string;
  references: string;
  apaExample: string;
  noOptions: string;
};

export type AnalysisHelpResource = {
  ui: HelpUiText;
  analyses: Record<AnalysisKind, AnalysisHelpContent>;
};
