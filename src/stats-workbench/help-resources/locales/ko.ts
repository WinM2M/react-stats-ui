import { createBaseLocale } from "./base";

export const koHelpLocale = createBaseLocale({
  ui: {
    helpButtonAria: "분석 도움말 열기",
    popoverTitle: "분석 도움말",
    close: "닫기",
    overview: "개요",
    purpose: "목적",
    dataTypes: "데이터 유형 및 형태",
    options: "옵션",
    interpretation: "결과 해석 가이드",
    faq: "자주 묻는 질문",
    references: "참고 링크",
    noOptions: "이 분석은 현재 UI에서 설정 가능한 옵션이 없습니다."
  },
  templates: {
    overview: (analysisLabel, summary) => `${analysisLabel} 분석은 ${summary}을(를) 제공합니다.`,
    purpose: (purposeText) => `이 방법은 ${purposeText}에 사용됩니다.`,
    faq: {
      assumptionsQ: "먼저 어떤 가정을 확인해야 하나요?",
      assumptionsA: "변수 유형, 결측치, 표본 설계가 해당 분석의 가정과 맞는지 먼저 확인하세요.",
      unstableQ: "옵션을 바꾸면 결과가 불안정한데 어떻게 하나요?",
      unstableA: "이상치, 스케일링, 표본 크기를 점검하고 대안 모델과 비교해 강건성을 확인하세요."
    }
  }
});
