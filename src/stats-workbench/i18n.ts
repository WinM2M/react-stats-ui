import i18next from "i18next";
import { initReactI18next } from "react-i18next";

export type SupportedLanguage = "en" | "ar" | "zh" | "fr" | "ru" | "es" | "ko" | "ja" | "vi";

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "fr", label: "French" },
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "vi", label: "Vietnamese" }
];

const common = {
  analysis: "Analysis",
  datasets: "Datasets",
  importXlsx: "Import XLSX",
  noDatasetSelected: "No dataset selected",
  dropDatasetFile: "Drop a file here to load a dataset.",
  variables: "Variables",
  noAvailableVariables: "No available variables.",
  roleAssignment: "Role Assignment",
  options: "Options",
  analysisResult: "Analysis Result",
  runAnalysis: "Run analysis",
  hideResult: "Hide Result",
  switchToJson: "Switch to JSON",
  switchToApa: "Switch to APA Table",
  showPayload: "Show API Payload",
  hidePayload: "Hide API Payload",
  runToView: "Run an analysis to view results.",
  renderUnavailable: "Table rendering is not available for this result shape.",
  copied: "Copied",
  copyFailed: "Failed",
  copy: "Copy",
  loadingWorker: "Initializing analysis worker",
  initProgress: "Initialization progress",
  workerPreparing: "Preparing worker execution.",
  workerComplete: "Worker connected and analysis completed.",
  workerFailed: "Worker execution failed.",
  workerStatus: "Worker status",
  running: "Running",
  loading: "Loading",
  ready: "Ready",
  error: "Error",
  standby: "Standby",
  language: "Language"
};

const resources = {
  en: { translation: common },
  ar: { translation: { ...common, analysis: "التحليل", datasets: "مجموعات البيانات", variables: "المتغيرات", roleAssignment: "تعيين الأدوار", options: "الخيارات", analysisResult: "نتيجة التحليل", language: "اللغة" } },
  zh: { translation: { ...common, analysis: "分析", datasets: "数据集", variables: "变量", roleAssignment: "角色分配", options: "选项", analysisResult: "分析结果", language: "语言" } },
  fr: { translation: { ...common, analysis: "Analyse", datasets: "Jeux de donnees", variables: "Variables", roleAssignment: "Affectation des roles", options: "Options", analysisResult: "Resultat d'analyse", language: "Langue" } },
  ru: { translation: { ...common, analysis: "Анализ", datasets: "Наборы данных", variables: "Переменные", roleAssignment: "Назначение ролей", options: "Параметры", analysisResult: "Результат анализа", language: "Язык" } },
  es: { translation: { ...common, analysis: "Analisis", datasets: "Conjuntos de datos", variables: "Variables", roleAssignment: "Asignacion de roles", options: "Opciones", analysisResult: "Resultado del analisis", language: "Idioma" } },
  ko: { translation: { ...common, analysis: "분석", datasets: "데이터셋", variables: "변수", roleAssignment: "역할 할당", options: "옵션", analysisResult: "분석 결과", language: "언어" } },
  ja: { translation: { ...common, analysis: "分析", datasets: "データセット", variables: "変数", roleAssignment: "ロール割り当て", options: "オプション", analysisResult: "分析結果", language: "言語" } },
  vi: { translation: { ...common, analysis: "Phan tich", datasets: "Tap du lieu", variables: "Bien", roleAssignment: "Gan vai tro", options: "Tuy chon", analysisResult: "Ket qua phan tich", language: "Ngon ngu" } }
};

export const workbenchI18n = i18next.createInstance();

void workbenchI18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});
