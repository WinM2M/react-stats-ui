import { classifyAnalysisFailure } from "./failure";

describe("classifyAnalysisFailure", () => {
  it.each([
    ["workerUrl is required. Point it to the stats-worker.js file", "worker_url_missing"],
    ["Failed to fetch worker script from https://x/y.js: 404 Not Found", "worker_fetch_failed"],
    ["SDK not initialized. Call init() first.", "sdk_not_initialized"],
    ["Worker error: RuntimeError: memory access out of bounds", "worker_error"],
    ["Worker is still initializing.", "worker_not_ready"]
  ])("reads %s as a SYSTEM failure", (message, code) => {
    const failure = classifyAnalysisFailure(new Error(message));
    expect(failure.kind).toBe("SYSTEM");
    expect(failure.code).toBe(code);
    expect(failure.message).toBe(message);
  });

  it("falls back to STATS for anything the engine itself rejected", () => {
    const failure = classifyAnalysisFailure(new Error("Group variable must have exactly two levels"));
    expect(failure).toEqual({
      message: "Group variable must have exactly two levels",
      kind: "STATS",
      code: "analysis_failed"
    });
  });

  it("keeps the untranslated message so the embedder can log it verbatim", () => {
    // 번역된 문자열을 넘기면 집계가 언어별로 쪼개진다. 원문을 그대로 보존해야 한다.
    const failure = classifyAnalysisFailure(new Error("표본이 부족합니다"));
    expect(failure.message).toBe("표본이 부족합니다");
    expect(failure.code).toBe("analysis_failed");
  });

  it("survives a thrown non-Error", () => {
    expect(classifyAnalysisFailure("boom")).toEqual({
      message: "boom",
      kind: "STATS",
      code: "analysis_failed"
    });
    expect(classifyAnalysisFailure(undefined).message).toBe("");
  });
});
