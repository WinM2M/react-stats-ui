import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";
import * as React from "react";
import { StatsWorkbench } from "./stats-workbench";
import type { StatsWorkbenchControl } from "./stats-workbench";

jest.mock("./stats-workbench/data-store", () => ({
  getDatasets: jest.fn(async () => []),
  putDataset: jest.fn(async () => undefined),
  removeDataset: jest.fn(async () => undefined),
  parseXlsx: jest.fn(async () => ({
    id: "mock",
    name: "mock.xlsx",
    createdAt: Date.now(),
    rows: [],
    columns: []
  }))
}));

jest.mock("./stats-workbench/analysis", () => ({
  ensureWorkerInitialized: jest.fn(async () => undefined),
  executeDefaultAnalysis: jest.fn(async () => ({})),
  executeExternalAnalysis: jest.fn(async (_method: string, data: Array<Record<string, unknown>>, input: Record<string, unknown>) => ({
    success: true,
    data: {
      summary: {
        input,
        sampleSize: data.length
      }
    }
  })),
  validateForRole: jest.fn(() => null),
  getPayload: jest.fn((analysisType: string, rows: Array<Record<string, unknown>>, assignments: Record<string, string[]>, options: Record<string, unknown>) => ({
    payload: {
      analysisType,
      method: analysisType,
      input: { data: rows },
      assignments,
      options
    },
    canRun: rows.length > 0,
    reason: rows.length > 0 ? undefined : "Dataset does not contain rows."
  }))
}));

describe("StatsWorkbench external control", () => {
  it("hides dataset popover when showDatasetPopover is false", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(<StatsWorkbench ref={ref} analysisExecutor={async () => ({})} showDatasetPopover={false} />);

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(screen.queryByText("No dataset selected")).toBeNull();
  });

  it("runs external wrapper with injected data through analysisExecutor", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    const analysisExecutor = jest.fn(async (payload: Record<string, unknown>) => ({ success: true, payload }));

    render(<StatsWorkbench ref={ref} analysisExecutor={analysisExecutor} layoutMode="minimal" showDatasetPopover={false} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    act(() => {
      ref.current?.injectData({ rows: [{ score: 10, group: "A" }, { score: 15, group: "B" }] });
    });

    await act(async () => {
      await ref.current?.runTtestIndependent({
        variable: "score",
        groupVariable: "group",
        group1Value: "A",
        group2Value: "B"
      });
    });

    expect(analysisExecutor).toHaveBeenCalled();
    const payload = analysisExecutor.mock.calls[analysisExecutor.mock.calls.length - 1][0] as {
      method: string;
      input: { data: unknown[] };
    };
    expect(payload.method).toBe("ttestIndependent");
    expect(payload.input.data).toHaveLength(2);
  });

  it("hands back the APA tables as HTML, rather than only to the clipboard", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(<StatsWorkbench ref={ref} layoutMode="minimal" showDatasetPopover={false} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    // Nothing has been run yet: there is no result to hand back.
    expect(ref.current?.getApaTableHtml()).toBeNull();

    act(() => {
      ref.current?.injectData({ rows: [{ score: 10 }, { score: 15 }] });
    });
    await act(async () => {
      await ref.current?.runFrequencies({ variable: "score" });
    });

    const html = ref.current?.getApaTableHtml();
    expect(html).toContain("<table");
    // The markup carries its own styling, because the embedder pasting it into a
    // report editor has none of this package's CSS.
    expect(html).toContain("style=");
  });

  it("throws when external run is requested without injected data", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(<StatsWorkbench ref={ref} analysisExecutor={async () => ({})} showDatasetPopover={false} />);

    await waitFor(() => expect(ref.current).not.toBeNull());
    await expect(ref.current?.runFrequencies({ variable: "x" })).rejects.toThrow("No injected dataset found");
  });

  it("allows external control of minimal auto-show result state", async () => {
    window.localStorage.removeItem("stats-workbench.minimalAutoShowResult");
    const ref = React.createRef<StatsWorkbenchControl>();
    render(<StatsWorkbench ref={ref} analysisExecutor={async () => ({})} layoutMode="minimal" showDatasetPopover={false} />);

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current?.getAutoShowResult()).toBe(true);

    act(() => {
      ref.current?.setAutoShowResult(false);
    });
    expect(ref.current?.getAutoShowResult()).toBe(false);

    let next = true;
    act(() => {
      next = ref.current?.toggleAutoShowResult() ?? false;
    });
    expect(next).toBe(true);
    expect(ref.current?.getAutoShowResult()).toBe(true);
  });

  it("hides auto-show switch when minimalAutoShowResultEnabled is false", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        minimalAutoShowResultEnabled={false}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current?.getAutoShowResult()).toBe(false);

    act(() => {
      ref.current?.setResultVisible(true);
    });

    expect(screen.queryByText("Auto show result")).toBeNull();
  });
});

describe("StatsWorkbench allowedAnalyses", () => {
  it("offers only the listed analyses in the picker", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="crosstabs"
        allowedAnalyses={["crosstabs", "ttestIndependent"]}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => {
      screen.getByRole("button", { name: "Crosstabs (Chi-Square Test)" }).click();
    });

    expect(screen.queryByText("Independent-Samples T-Test")).not.toBeNull();
    expect(screen.queryByText("Linear Regression (OLS)")).toBeNull();
    expect(screen.queryByText("Principal Component Analysis")).toBeNull();
  });

  it("drops the dropdown entirely when only one analysis is allowed", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="crosstabs"
        allowedAnalyses={["crosstabs"]}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(screen.queryByText("Crosstabs (Chi-Square Test)")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Crosstabs (Chi-Square Test)" })).toBeNull();
  });

  it("opens on an allowed analysis when initialAnalysis contradicts the list", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="pca"
        allowedAnalyses={["crosstabs"]}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(screen.queryByText("Crosstabs (Chi-Square Test)")).not.toBeNull();
    expect(screen.queryByText("Principal Component Analysis")).toBeNull();
  });

  it("refuses an external run of an analysis outside the list", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="crosstabs"
        allowedAnalyses={["crosstabs"]}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => {
      ref.current?.injectData({ rows: [{ x: 1, y: 2 }] });
    });

    await expect(ref.current?.executeAnalysis("pca", { variables: ["x", "y"] })).rejects.toThrow(
      'Analysis "pca" is not in allowedAnalyses.'
    );
  });
});

describe("StatsWorkbench APA 복사 단추 꾸미기", () => {
  const renderWithTables = async (props: Record<string, unknown>) => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({
          success: true,
          data: { tables: [{ title: "Descriptives", rows: [{ group: "A", n: 3 }] }] }
        })}
        layoutMode="minimal"
        showDatasetPopover={false}
        {...props}
      />
    );
    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => {
      ref.current?.injectData({ rows: [{ score: 10, group: "A" }, { score: 15, group: "B" }] });
    });
    await act(async () => {
      await ref.current?.runTtestIndependent({ variable: "score", groupVariable: "group" });
    });
    return document.querySelector("[data-apa-copy]") as HTMLElement | null;
  };

  it("문구를 임베더가 정할 수 있다", async () => {
    // 기본값 "Copy" 는 무엇을 복사하는지 말하지 않는다. 결과까지 온 방문자 다섯 중
    // 이 단추를 누른 사람이 0명이었던 것이 이 prop 의 이유다.
    const btn = await renderWithTables({ apaCopyLabel: "Copy APA table" });
    expect(btn?.textContent).toContain("Copy APA table");
  });

  it("문구를 안 주면 로케일 기본값을 쓴다", async () => {
    const btn = await renderWithTables({});
    expect(btn?.textContent).toContain("Copy");
  });

  it("강조하면 채운 단추가 된다", async () => {
    const subtle = await renderWithTables({});
    const subtleClass = subtle?.className ?? "";
    document.body.innerHTML = "";
    const strong = await renderWithTables({ apaCopyEmphasis: "strong" });
    expect(subtleClass).not.toContain("bg-indigo-600");
    expect(strong?.className).toContain("bg-indigo-600");
  });
});

describe("StatsWorkbench onBeforeCopyApaTable", () => {
  const renderWithResult = async (onBeforeCopyApaTable?: () => boolean | Promise<boolean>) => {
    const ref = React.createRef<StatsWorkbenchControl>();
    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({ success: true, data: { summary: { statistic: 1.5 } } })}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="crosstabs"
        onBeforeCopyApaTable={onBeforeCopyApaTable}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => {
      ref.current?.injectData({ rows: [{ x: 1, y: 2 }] });
    });
    await act(async () => {
      await ref.current?.executeAnalysis("crosstabs", { rowVariable: "x", colVariable: "y" });
    });
    act(() => {
      ref.current?.setResultVisible(true);
    });

    return ref;
  };

  it("lets the embedder cancel the copy the result panel would have made", async () => {
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const onBeforeCopyApaTable = jest.fn(() => false);
    await renderWithResult(onBeforeCopyApaTable);

    await act(async () => {
      screen.getByRole("button", { name: "Copy" }).click();
    });

    expect(onBeforeCopyApaTable).toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText("Copied")).toBeNull();
  });

  it("copies as usual once the embedder says go ahead", async () => {
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const onBeforeCopyApaTable = jest.fn(async () => true);
    await renderWithResult(onBeforeCopyApaTable);

    await act(async () => {
      screen.getByRole("button", { name: "Copy" }).click();
    });

    expect(onBeforeCopyApaTable).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalled();
  });
});

describe("StatsWorkbench run control", () => {
  it("reports when a run would work and runs the current assignments", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    const analysisExecutor = jest.fn(async (payload: Record<string, unknown>) => ({ success: true, payload }));
    const states: Array<{ canRun: boolean; reason: string | null }> = [];

    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={analysisExecutor}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="descriptives"
        minimalAutoShowResultEnabled={false}
        onRunStateChange={(state) => states.push({ canRun: state.canRun, reason: state.reason })}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    // Nothing loaded yet, so the embedder is told a run would go nowhere.
    expect(states.length).toBeGreaterThan(0);
    expect(states[states.length - 1].canRun).toBe(false);

    act(() => {
      ref.current?.injectData({ rows: [{ score: 1 }, { score: 2 }] });
    });
    act(() => {
      ref.current?.assignVariableToRole("score", "variables");
    });

    await waitFor(() => expect(states[states.length - 1].canRun).toBe(true));
    expect(states[states.length - 1].reason).toBeNull();

    await act(async () => {
      ref.current?.run();
    });

    await waitFor(() => expect(analysisExecutor).toHaveBeenCalled());
    const payload = analysisExecutor.mock.calls[analysisExecutor.mock.calls.length - 1][0] as {
      analysisType: string;
      assignments: Record<string, string[]>;
    };
    expect(payload.analysisType).toBe("descriptives");
    expect(payload.assignments.variables).toEqual(["score"]);
  });

  it("tells the embedder while an analysis is running", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    let release: (value: { success: boolean }) => void = () => {};
    // Held open so the running window is observable rather than over before we look.
    const analysisExecutor = jest.fn(
      () => new Promise<{ success: boolean }>((resolve) => { release = resolve; })
    );
    const states: Array<{ canRun: boolean; isRunning: boolean }> = [];

    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={analysisExecutor}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="descriptives"
        minimalAutoShowResultEnabled={false}
        onRunStateChange={(state) => states.push({ canRun: state.canRun, isRunning: state.isRunning })}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => { ref.current?.injectData({ rows: [{ score: 1 }, { score: 2 }] }); });
    act(() => { ref.current?.assignVariableToRole("score", "variables"); });
    await waitFor(() => expect(states[states.length - 1].canRun).toBe(true));
    expect(states[states.length - 1].isRunning).toBe(false);

    act(() => { ref.current?.run(); });

    // 이 창이 비어 있던 것이 문제였다. 임베더가 자기 버튼을 돌릴 수 있어야 한다.
    await waitFor(() => expect(states[states.length - 1].isRunning).toBe(true));

    await act(async () => { release({ success: true }); });
    await waitFor(() => expect(states[states.length - 1].isRunning).toBe(false));
  });

  it("also reports running for the external executeAnalysis path", async () => {
    const ref = React.createRef<StatsWorkbenchControl>();
    let release: (value: { success: boolean }) => void = () => {};
    const analysisExecutor = jest.fn(
      () => new Promise<{ success: boolean }>((resolve) => { release = resolve; })
    );
    const states: Array<boolean> = [];

    render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={analysisExecutor}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="descriptives"
        minimalAutoShowResultEnabled={false}
        onRunStateChange={(state) => states.push(state.isRunning)}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => { ref.current?.injectData({ rows: [{ score: 1 }, { score: 2 }] }); });

    // 임베더가 자기 역할 배정으로 직접 부르는 경로. 0.22.0 은 이쪽을 빠뜨렸다.
    let pending: Promise<unknown> | undefined;
    act(() => { pending = ref.current?.executeAnalysis("descriptives", { variables: ["score"] }); });
    await waitFor(() => expect(states[states.length - 1]).toBe(true));

    await act(async () => { release({ success: true }); await pending; });
    await waitFor(() => expect(states[states.length - 1]).toBe(false));
  });
})

describe("StatsWorkbench variableListPosition", () => {
  const columnsOf = async (position?: "start" | "end") => {
    const ref = React.createRef<StatsWorkbenchControl>();
    const { container, unmount } = render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="descriptives"
        variableListPosition={position}
      />
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    act(() => {
      ref.current?.injectData({ rows: [{ score: 1 }, { score: 2 }] });
    });

    const grid = container.querySelector(".sm\\:grid-cols-\\[1fr_2fr\\], .sm\\:grid-cols-\\[2fr_1fr\\]");
    // The draggable card is unique to the list; the word "Variables" is not, because
    // descriptives names its role that too.
    await waitFor(() => expect(container.querySelector('[draggable="true"]')).not.toBeNull());
    const card = container.querySelector('[draggable="true"]') as Element;
    // Which of the grid's own children contains the card decides which column it lands in.
    const own = [...(grid?.children ?? [])];
    const index = own.findIndex((child) => child.contains(card));
    const template = grid?.className.includes("2fr_1fr") ? "2fr_1fr" : "1fr_2fr";
    unmount();
    return { index, template };
  };

  it("puts the variable list in the first column by default", async () => {
    expect(await columnsOf()).toEqual({ index: 0, template: "1fr_2fr" });
  });

  it("moves it to the last column, and gives the roles the wider one", async () => {
    expect(await columnsOf("end")).toEqual({ index: 1, template: "2fr_1fr" });
  });
})

describe("StatsWorkbench analysis labels", () => {
  const pickerLabel = async (language?: "en" | "ko") => {
    const ref = React.createRef<StatsWorkbenchControl>();
    const { container, unmount } = render(
      <StatsWorkbench
        ref={ref}
        analysisExecutor={async () => ({})}
        layoutMode="minimal"
        showDatasetPopover={false}
        initialAnalysis="crosstabs"
        allowedAnalyses={["crosstabs"]}
        language={language}
      />
    );
    await waitFor(() => expect(ref.current).not.toBeNull());
    // The single allowed analysis renders as a plain label rather than a dropdown.
    const label = container.querySelector("span.w-80")?.textContent ?? "";
    unmount();
    return label;
  };

  it("names the test inside the crosstabs entry, so it can be found", async () => {
    // Someone looking for a chi-square test does not search for "Crosstabs".
    expect(await pickerLabel("en")).toContain("Chi-Square");
  });

  it("translates the picker rather than leaving every locale in English", async () => {
    expect(await pickerLabel("ko")).toBe("교차분석 (카이제곱 검정)");
  });
})
