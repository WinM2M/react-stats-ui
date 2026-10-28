import { createBaseLocale } from "./base";

export const koHelpLocale = createBaseLocale({
  ui: {
    helpButtonAria: "분석 도움말 열기",
    popoverTitle: "분석 도움말",
    close: "닫기",
    overview: "개요",
    purpose: "목적",
    wikipediaDefinition: "위키피디아 정의",
    wikipediaSourcePrefix: "출처",
    wikipediaLoading: "위키피디아 정의를 불러오는 중...",
    wikipediaUnavailable: "위키피디아 정의를 불러올 수 없습니다.",
    dataTypes: "데이터 유형 및 형태",
    options: "옵션",
    interpretation: "결과 해석 가이드",
    faq: "자주 묻는 질문",
    references: "참고 링크",
    apaExample: "예제",
    noOptions: "이 분석은 현재 UI에서 설정 가능한 옵션이 없습니다."
  },
  purpose: {
    factorsCorrelated:
      "문항들 뒤에 있는 요인을 찾을 때. 요인끼리 서로 상관이 있다고 보는 경우에 씁니다 — 태도·성격 척도는 대개 그렇습니다",
    factorsCorrelatedLarge:
      "문항이 많은 자료에서 서로 상관된 요인을 찾을 때. Promax 가 Oblimin 보다 빠르게 해에 도달합니다",
    factorsFitCorrelated:
      "서로 상관된 요인을 찾으면서 모형 적합도까지 보고할 때. 문항을 정규분포로 볼 수 있을 때 씁니다",
    factorsFitCorrelatedLarge:
      "문항이 많은 자료에서 상관된 요인을 찾으면서 적합도도 볼 때",
    factorsIndependent:
      "요인을 서로 독립으로 두고 볼 때. 적재량 하나하나를 따로 읽기 쉬워집니다",
    componentsSummary:
      "잠재요인을 따지기보다 여러 변수를 몇 개로 줄여 요약하거나 뒤 분석에 넘길 때"
  },
  interpretation: {
    bootstrapCI:
      "간접효과는 부트스트랩 신뢰구간이 0 을 품는지로 판정합니다. p 값이 없는 것이 이 방법의 요지입니다.",
    indexModMed:
      "한 수준에서 유의하고 다른 수준에서 유의하지 않다는 것만으로는 「매개가 조절된다」고 말할 수 없습니다. 조절된 매개 지수를 보십시오.",
    conditionalEffect:
      "조건부 효과는 조절변수의 평균과 ±1 표준편차에서 계산됩니다. 세 줄은 기준점이지 자료 안의 집단이 아닙니다.",
    causalOrder:
      "경로는 자료가 알려 주는 것이 아니라 연구자가 세우는 가정입니다. 한 시점에서 잰 자료는 X·M·Y 의 순서를 정해 주지 않습니다.",
    centeringInteraction:
      "상호작용이 든 모형의 주효과는 「상대 변수가 0 일 때의 효과」입니다. 전체 효과로 읽지 마십시오."
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
