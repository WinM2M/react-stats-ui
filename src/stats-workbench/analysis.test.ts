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

describe("getPayload — 역할만 주어졌을 때", () => {
  it("집단 값을 데이터에서 파생한다", () => {
    // 외부 호출자는 역할 이름만 안다. group1Value/group2Value 는 데이터에서 나오는
    // 값이라 호출자가 줄 수 없고, 이게 없으면 SDK 가 표로 그릴 수 없는 형태를 돌려준다.
    const info = getPayload(
      "ttestIndependent",
      [
        { sex: "남", score: 3 },
        { sex: "여", score: 4 },
        { sex: "남", score: 5 }
      ],
      assign({ variable: ["score"], groupVariable: ["sex"] }),
      {}
    );
    expect(info.canRun).toBe(true);
    expect(info.payload.input.group1Value).toBe("남");
    expect(info.payload.input.group2Value).toBe("여");
    expect(info.payload.input.variable).toBe("score");
    expect(info.payload.input.groupVariable).toBe("sex");
  });
});

describe("getPayload — 직접 고른 집단 값", () => {
  const numeric = [
    { sex: 1, score: 3 },
    { sex: 2, score: 4 },
    { sex: 1, score: 5 }
  ];
  const run = (data: Record<string, unknown>[], options: Record<string, unknown>) =>
    getPayload("ttestIndependent", data, assign({ variable: ["score"], groupVariable: ["sex"] }), options);

  it("숫자 집단에서 문자열로 고른 값을 원래 숫자로 되돌린다", () => {
    const info = run(numeric, { group1Value: "1", group2Value: "2" });
    expect(info.payload.input.group1Value).toBe(1);
    expect(info.payload.input.group2Value).toBe(2);
  });

  it("순서를 바꿔 골라도 원래 값으로 되돌린다", () => {
    const info = run(numeric, { group1Value: "2", group2Value: "1" });
    expect(info.payload.input.group1Value).toBe(2);
    expect(info.payload.input.group2Value).toBe(1);
  });

  it("문자열 집단은 그대로 둔다", () => {
    const info = run(
      [
        { sex: "남", score: 3 },
        { sex: "여", score: 4 }
      ],
      { group1Value: "여", group2Value: "남" }
    );
    expect(info.payload.input.group1Value).toBe("여");
    expect(info.payload.input.group2Value).toBe("남");
  });

  it("고르지 않은 쪽은 후보의 앞 값을 쓴다", () => {
    const info = run(numeric, { group1Value: "2" });
    expect(info.payload.input.group1Value).toBe(2);
    expect(info.payload.input.group2Value).toBe(2);
  });
});
