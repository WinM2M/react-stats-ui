/**
 * 결과 표에 **읽을 수 없는 글자**가 서지 않는가.
 *
 * 머리글 번역은 늘어선 조건문이었고, 거기 없는 열쇠값은 그대로 화면에 찍혔다 --
 * 다중응답 표의 머리가 `option`·`percentOfResponses`·`percentOfCases` 였다.
 * 한국어 화면의 문제로 보이지만 영어로 봐도 못 읽는 글자라, 번역이 아니라 **표기**가
 * 빠진 것이다.
 *
 * 조건문을 표로 바꿨어도 **새 분석을 더할 때 한 줄 빠뜨리는 성질**은 그대로다. 그래서
 * 표를 만드는 쪽(`result-utils.ts`)의 소스를 읽어 열쇠값을 뽑고, 말을 가진 표와
 * 대조한다. 빠지면 여기서 멈춘다.
 */
import { readFileSync } from "fs";
import path from "path";

import { TABLE_TITLE_KEYS, COLUMN_KEYS, LABEL_COLUMNS } from "./sections/execution-panel";
import { resources } from "./i18n";

const source = readFileSync(path.join(__dirname, "result-utils.ts"), "utf8");

function emittedColumns(): string[] {
  const found = new Set<string>();
  for (const block of source.matchAll(/columns:\s*\[([^\]]*)\]/g)) {
    for (const piece of block[1].split(",")) {
      const name = piece.trim().replace(/^"|"$/g, "");
      // `...loadingColumns` 처럼 펼쳐 넣는 것은 이름이 번호로 붙는다(component1…).
      if (name && !name.startsWith("...")) found.add(name);
    }
  }
  return [...found];
}

function emittedTitles(): string[] {
  return [...new Set([...source.matchAll(/title:\s*"([^"]+)"/g)].map((m) => m[1]))];
}

describe("결과 표의 말", () => {
  /*
   * 🔴 **뽑기가 실패하면 이 테스트는 조용히 통과한다.** `result-utils.ts` 가 다른
   * 모양으로 바뀌어 정규식이 아무것도 못 잡으면 빈 배열끼리 비교해 초록으로 끝난다 --
   * 울타리가 사라진 줄 모르는 채로. 그래서 먼저 **뽑히긴 했는지**를 본다.
   */
  it("소스에서 열쇠값이 실제로 뽑힌다", () => {
    expect(emittedColumns().length).toBeGreaterThan(40);
    expect(emittedTitles().length).toBeGreaterThan(15);
    // 눈으로 확인한 표본 몇 개가 그 안에 있어야 한다.
    expect(emittedColumns()).toEqual(expect.arrayContaining(["percentOfResponses", "eigenvalue"]));
    expect(emittedTitles()).toEqual(
      expect.arrayContaining(["Multiple Response Frequencies", "ANOVA"])
    );
  });

  it("만들어지는 열에 모두 이름이 있다", () => {
    const missing = emittedColumns().filter(
      (column) => !COLUMN_KEYS[column] && !column.startsWith("component")
    );
    expect(missing).toEqual([]);
  });

  it("만들어지는 표 제목에 모두 이름이 있다", () => {
    expect(emittedTitles().filter((title) => !TABLE_TITLE_KEYS[title])).toEqual([]);
  });

  it("이름이 가리키는 번역이 영어와 한국어에 실제로 있다", () => {
    const en = resources.en.translation as Record<string, unknown>;
    const ko = resources.ko.translation as Record<string, unknown>;
    const keys = [...new Set([...Object.values(COLUMN_KEYS), ...Object.values(TABLE_TITLE_KEYS)])];
    expect(keys.filter((key) => typeof en[key] !== "string")).toEqual([]);
    expect(keys.filter((key) => typeof ko[key] !== "string")).toEqual([]);
  });

  it("보기 칸은 이름표 묶음에 들어 있지 않다", () => {
    // 응답자가 고른 보기가 우연히 `Total` 이어도 바뀌면 안 된다. 합계 줄은 자리로
    // 가린다 -- 글자로 가리면 같은 이름의 보기와 구별할 수 없다.
    expect(LABEL_COLUMNS.has("option")).toBe(false);
    expect(LABEL_COLUMNS.has("statistic")).toBe(true);
  });

  it("다중응답 표의 머리가 한국어로 선다", () => {
    const ko = resources.ko.translation as unknown as Record<string, string>;
    expect(ko[COLUMN_KEYS.percentOfResponses]).toBe("응답 기준 %");
    expect(ko[COLUMN_KEYS.percentOfCases]).toBe("케이스 기준 %");
    expect(ko[TABLE_TITLE_KEYS["Multiple Response Frequencies"]]).toBe("다중응답 빈도");
  });
});
