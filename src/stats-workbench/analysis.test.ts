import { getPayload } from "./analysis";
import { EMPTY_ASSIGNMENTS } from "./constants";

const assign = (over: Record<string, string[]>) => ({ ...EMPTY_ASSIGNMENTS, ...over });

describe("getPayload — 독립표본 t-검정의 집단 후보", () => {
  const build = (data: Record<string, unknown>[]) =>
    getPayload("ttestIndependent", data, assign({ variable: ["score"], groupVariable: ["sex"] }), {});

  it("빈 칸을 집단으로 세지 않는다", () => {
    // 결측이 하나라도 섞이면 예전에는 "" 가 집단 후보로 올라왔고, 그 값이 그대로
    // Select 항목 value 가 되어 임베더 화면 전체를 죽였다.
    const info = build([
      { sex: "남", score: 3 },
      { sex: "여", score: 4 },
      { sex: "", score: 5 },
      { sex: "   ", score: 2 },
      { sex: null, score: 1 }
    ]);
    expect(info.meta?.groupCandidates).toEqual(["남", "여"]);
  });

  it("살아 있는 집단이 하나뿐이면 실행을 막는다", () => {
    const info = build([
      { sex: "남", score: 3 },
      { sex: "", score: 4 }
    ]);
    expect(info.meta?.groupCandidates).toEqual(["남"]);
    expect(info.canRun).toBe(false);
  });

  it("숫자 코드로 된 집단은 그대로 남긴다", () => {
    const info = build([
      { sex: 1, score: 3 },
      { sex: 2, score: 4 },
      { sex: "", score: 5 }
    ]);
    expect(info.meta?.groupCandidates).toEqual([1, 2]);
  });
});
