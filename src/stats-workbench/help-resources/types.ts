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

export type AnalysisHelpContent = {
  overview: string;
  purpose: string;
  formulaTitle: string;
  formulaAlt: string;
  formulaSvg: string;
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
  dataTypes: string;
  options: string;
  interpretation: string;
  faq: string;
  references: string;
  noOptions: string;
};

export type AnalysisHelpResource = {
  ui: HelpUiText;
  analyses: Record<AnalysisKind, AnalysisHelpContent>;
};
