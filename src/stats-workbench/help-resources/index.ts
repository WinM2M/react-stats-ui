import type { SupportedLanguage } from "../i18n";
import type { AnalysisKind } from "../types";
import { buildAnalysisHelpResource } from "./shared";
import type { AnalysisHelpResource } from "./types";
import { arHelpLocale } from "./locales/ar";
import { enHelpLocale } from "./locales/en";
import { esHelpLocale } from "./locales/es";
import { frHelpLocale } from "./locales/fr";
import { jaHelpLocale } from "./locales/ja";
import { koHelpLocale } from "./locales/ko";
import { ruHelpLocale } from "./locales/ru";
import { viHelpLocale } from "./locales/vi";
import { zhHelpLocale } from "./locales/zh";

const byLanguage: Record<SupportedLanguage, AnalysisHelpResource> = {
  en: buildAnalysisHelpResource(enHelpLocale),
  ar: buildAnalysisHelpResource(arHelpLocale),
  zh: buildAnalysisHelpResource(zhHelpLocale),
  fr: buildAnalysisHelpResource(frHelpLocale),
  ru: buildAnalysisHelpResource(ruHelpLocale),
  es: buildAnalysisHelpResource(esHelpLocale),
  ko: buildAnalysisHelpResource(koHelpLocale),
  ja: buildAnalysisHelpResource(jaHelpLocale),
  vi: buildAnalysisHelpResource(viHelpLocale)
};

export function getAnalysisHelp(language: string, analysisType: AnalysisKind): AnalysisHelpResource["analyses"][AnalysisKind] {
  const langCode = language.slice(0, 2) as SupportedLanguage;
  const resource = byLanguage[langCode] ?? byLanguage.en;
  return resource.analyses[analysisType];
}

export function getAnalysisHelpUi(language: string): AnalysisHelpResource["ui"] {
  const langCode = language.slice(0, 2) as SupportedLanguage;
  return (byLanguage[langCode] ?? byLanguage.en).ui;
}
