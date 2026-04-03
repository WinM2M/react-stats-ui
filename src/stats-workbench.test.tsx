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
