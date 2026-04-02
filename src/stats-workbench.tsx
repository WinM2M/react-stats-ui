import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";
import { PROGRESS_EVENT_NAME } from "@winm2m/inferential-stats-js";
import {
  ensureWorkerInitialized,
  executeDefaultAnalysis,
  getPayload,
  validateForRole
} from "./stats-workbench/analysis";
import { ANALYSIS_DEFS, EMPTY_ASSIGNMENTS } from "./stats-workbench/constants";
import { getDatasets, parseXlsx, putDataset, removeDataset } from "./stats-workbench/data-store";
import { AnalysisTypePanel } from "./stats-workbench/sections/analysis-type-panel";
import { DatasetPanel } from "./stats-workbench/sections/dataset-panel";
import { ExecutionPanel } from "./stats-workbench/sections/execution-panel";
import { VariableAssignmentPanel } from "./stats-workbench/sections/variable-assignment-panel";
import { WorkerSignalIndicator } from "./stats-workbench/sections/worker-signal-indicator";
import type {
  AnalysisPayload,
  AnalysisKind,
  Dataset,
  RoleKey,
  StatsWorkbenchProps,
  VariableMeta
} from "./stats-workbench/types";
import { cn } from "./stats-workbench/utils";

function normalizeInitialAnalysis(kind: string): AnalysisKind {
  if (kind === "independent_t_test") {
    return "ttestIndependent";
  }
  if (kind === "multiple_regression") {
    return "linearRegression";
  }
  if (kind === "factor_analysis") {
    return "efa";
  }
  return kind as AnalysisKind;
}

export type {
  AnalysisDef,
  AnalysisKind,
  AnalysisPayload,
  AnalysisResult,
  Dataset,
  PayloadInfo,
  RoleKey,
  StatsWorkbenchProps,
  VariableMeta,
  VariableType
} from "./stats-workbench/types";

export function StatsWorkbench({
  className,
  style,
  initialAnalysis = "frequencies",
  analysisExecutor,
  onResult
}: StatsWorkbenchProps) {
  const [datasets, setDatasets] = React.useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null);
  const [analysisType, setAnalysisType] = React.useState<AnalysisKind>(normalizeInitialAnalysis(initialAnalysis));
  const [assignments, setAssignments] = React.useState<Record<RoleKey, string[]>>(EMPTY_ASSIGNMENTS);
  const [selectedAvailable, setSelectedAvailable] = React.useState<string | null>(null);
  const [selectedAssigned, setSelectedAssigned] = React.useState<Partial<Record<RoleKey, string>>>({});
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<unknown>(null);
  const [error, setError] = React.useState("");
  const [showPayload, setShowPayload] = React.useState(false);
  const [analysisQueue, setAnalysisQueue] = React.useState<AnalysisPayload[]>([]);
  const [topPanelHeight, setTopPanelHeight] = React.useState<number | null>(null);
  const [isResizingPanels, setIsResizingPanels] = React.useState(false);
  const [workerConnectionState, setWorkerConnectionState] = React.useState<
    "disconnected" | "connecting" | "ready" | "error" | "external"
  >(analysisExecutor ? "external" : "disconnected");
  const [workerActivityState, setWorkerActivityState] = React.useState<"idle" | "running">("idle");
  const [workerStatusMessage, setWorkerStatusMessage] = React.useState(
    analysisExecutor ? "Using external analysis executor." : "Worker is not initialized yet."
  );
  const [workerProgress, setWorkerProgress] = React.useState<number | null>(null);
  const [options, setOptions] = React.useState<Record<string, unknown>>({
    equalVariance: true,
    addConstant: true,
    alpha: 0.05,
    k: 3,
    method: "ward",
    metric: "euclidean",
    nFactors: 2,
    rotation: "varimax",
    nComponents: 2,
    maxIterations: 300,
    randomState: 42
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const panelsRef = React.useRef<HTMLElement>(null);
  const workerReady = analysisExecutor ? true : workerConnectionState === "ready";
  const blockInitialLoading = !analysisExecutor && workerConnectionState === "connecting" && !workerReady;

  React.useEffect(() => {
    if (analysisExecutor) {
      setWorkerConnectionState("external");
      setWorkerStatusMessage("Using external analysis executor.");
      setWorkerProgress(null);
      return;
    }

    const target = globalThis as unknown as EventTarget;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ stage?: string; progress?: number; message?: string }>).detail ?? {};
      const stage = detail.stage ?? "init";
      const progress = typeof detail.progress === "number" ? detail.progress : null;
      const message = detail.message ?? "Initializing worker.";

      setWorkerConnectionState(stage === "ready" || progress === 100 ? "ready" : "connecting");
      setWorkerStatusMessage(`[${stage}] ${message}`);
      setWorkerProgress(progress);
    };

    target.addEventListener(PROGRESS_EVENT_NAME, listener);
    return () => target.removeEventListener(PROGRESS_EVENT_NAME, listener);
  }, [analysisExecutor]);

  React.useEffect(() => {
    if (analysisExecutor) {
      return;
    }
    let cancelled = false;

    setWorkerConnectionState("connecting");
    setWorkerStatusMessage("Initializing worker.");

    void ensureWorkerInitialized()
      .then(() => {
        if (cancelled) {
          return;
        }
        setWorkerConnectionState("ready");
        setWorkerStatusMessage("Worker is ready.");
        setWorkerProgress(100);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setWorkerConnectionState("error");
        setWorkerStatusMessage(err instanceof Error ? err.message : "Worker initialization failed.");
      });

    return () => {
      cancelled = true;
    };
  }, [analysisExecutor]);

  const refreshDatasets = React.useCallback(async () => {
    const next = await getDatasets();
    setDatasets(next);
    if (!selectedDatasetId && next.length) {
      setSelectedDatasetId(next[0].id);
    }
  }, [selectedDatasetId]);

  React.useEffect(() => {
    void refreshDatasets();
  }, [refreshDatasets]);

  React.useEffect(() => {
    setAssignments(EMPTY_ASSIGNMENTS);
    setSelectedAssigned({});
    setSelectedAvailable(null);
    setError("");
    setResult(null);
  }, [analysisType, selectedDatasetId]);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId) ?? null;
  const assignedNames = new Set<string>(Object.values(assignments).flat());
  const availableVariables = (selectedDataset?.columns ?? []).filter((column) => !assignedNames.has(column.name));
  const analysisDef = ANALYSIS_DEFS[analysisType];
  const payloadInfo = getPayload(analysisType, selectedDataset?.rows ?? [], assignments, options);
  const hasOptions = React.useMemo(
    () =>
      [
        "ttestIndependent",
        "posthocTukey",
        "linearRegression",
        "logisticBinary",
        "logisticMultinomial",
        "kmeans",
        "hierarchicalCluster",
        "efa",
        "pca",
        "mds"
      ].includes(analysisType),
    [analysisType]
  );
  const groupCandidates = (payloadInfo.meta?.groupCandidates as Array<string | number> | undefined) ?? [];
  const autoRunKey = React.useMemo(
    () =>
      JSON.stringify({
        analysisType,
        selectedDatasetId,
        selectedDatasetCreatedAt: selectedDataset?.createdAt ?? null,
        assignments,
        options,
        datasetCount: datasets.length
      }),
    [analysisType, assignments, datasets.length, options, selectedDataset?.createdAt, selectedDatasetId]
  );
  const lastAutoRunKeyRef = React.useRef<string | null>(null);

  const variableByName = React.useMemo(() => {
    const map = new Map<string, VariableMeta>();
    (selectedDataset?.columns ?? []).forEach((column) => map.set(column.name, column));
    return map;
  }, [selectedDataset]);

  const assignVariableToRole = React.useCallback(
    (variableName: string, role: RoleKey) => {
      const variable = variableByName.get(variableName);
      if (!variable) {
        return;
      }
      if (validateForRole(analysisType, role, variable)) {
        return;
      }

      setAssignments((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).map(([key, vars]) => [
            key,
            (vars as string[]).filter((value) => value !== variableName)
          ])
        ) as Record<RoleKey, string[]>;
        const roleDef = analysisDef.roles.find((r) => r.key === role);
        if (!roleDef) {
          return next;
        }
        next[role] = roleDef.multi ? [...next[role], variableName] : [variableName];
        return next;
      });
      setSelectedAvailable(null);
    },
    [analysisDef.roles, analysisType, variableByName]
  );

  const removeFromRole = React.useCallback((role: RoleKey, variableName: string) => {
    setAssignments((prev) => ({ ...prev, [role]: prev[role].filter((v) => v !== variableName) }));
    setSelectedAssigned((prev) => ({ ...prev, [role]: undefined }));
  }, []);

  const executeAnalysisPayload = React.useCallback(
    async (payload: AnalysisPayload) => {
      if (!workerReady) {
        setError(`Worker is still initializing (${workerProgress ?? 0}%).`);
        return;
      }

      setIsRunning(true);
      setWorkerActivityState("running");
      if (!analysisExecutor) {
        setWorkerConnectionState((prev) => (prev === "ready" ? "ready" : "connecting"));
        setWorkerStatusMessage("Preparing worker execution.");
      }
      try {
        const output = analysisExecutor ? await analysisExecutor(payload) : await executeDefaultAnalysis(payload);
        setResult(output);
        onResult?.({ payload, result: output });
        if (!analysisExecutor) {
          setWorkerConnectionState("ready");
          setWorkerStatusMessage("Worker connected and analysis completed.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown execution error.");
        if (!analysisExecutor) {
          setWorkerConnectionState("error");
          setWorkerStatusMessage(err instanceof Error ? err.message : "Worker execution failed.");
        }
      } finally {
        setIsRunning(false);
        setWorkerActivityState("idle");
      }
    },
    [analysisExecutor, onResult, workerProgress, workerReady]
  );

  const enqueueAnalysis = React.useCallback((payload: AnalysisPayload) => {
    setAnalysisQueue((prev) => [...prev, payload]);
  }, []);

  const requestRunAnalysis = React.useCallback(() => {
    if (!workerReady) {
      setError(`Worker is still initializing (${workerProgress ?? 0}%).`);
      return;
    }
    if (!payloadInfo.canRun) {
      setError(payloadInfo.reason ?? "Analysis setup is incomplete.");
      return;
    }

    setError("");
    enqueueAnalysis(payloadInfo.payload);
  }, [enqueueAnalysis, payloadInfo, workerProgress, workerReady]);

  React.useEffect(() => {
    if (lastAutoRunKeyRef.current === null) {
      lastAutoRunKeyRef.current = autoRunKey;
      return;
    }

    if (lastAutoRunKeyRef.current === autoRunKey) {
      return;
    }

    lastAutoRunKeyRef.current = autoRunKey;

    if (!workerReady || !payloadInfo.canRun) {
      return;
    }

    setError("");
    enqueueAnalysis(payloadInfo.payload);
  }, [autoRunKey, enqueueAnalysis, payloadInfo, workerReady]);

  React.useEffect(() => {
    if (isRunning || analysisQueue.length === 0) {
      return;
    }

    const [next, ...rest] = analysisQueue;
    setAnalysisQueue(rest);
    void executeAnalysisPayload(next);
  }, [analysisQueue, executeAnalysisPayload, isRunning]);

  React.useEffect(() => {
    if (!isResizingPanels) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = panelsRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const dividerHeight = 8;
      const minPanelHeight = 220;
      const maxTop = rect.height - minPanelHeight - dividerHeight;
      const nextTop = Math.max(minPanelHeight, Math.min(event.clientY - rect.top, maxTop));
      setTopPanelHeight(nextTop);
    };

    const handlePointerUp = () => {
      setIsResizingPanels(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingPanels]);

  const importDatasetFile = React.useCallback(
    async (file: File) => {
      try {
        const parsed = await parseXlsx(file);
        await putDataset(parsed);
        await refreshDatasets();
        setSelectedDatasetId(parsed.id);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import XLSX file.");
      }
    },
    [refreshDatasets]
  );

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await importDatasetFile(file);
    event.target.value = "";
  };

  const handleDropFile = React.useCallback(
    (file: File) => {
      void importDatasetFile(file);
    },
    [importDatasetFile]
  );

  const handleDeleteDataset = async (id: string) => {
    await removeDataset(id);
    await refreshDatasets();
    if (selectedDatasetId === id) {
      const next = (await getDatasets())[0]?.id ?? null;
      setSelectedDatasetId(next);
    }
  };

  const selectedDatasetName = selectedDataset?.name ?? "선택된 데이터셋 없음";

  return (
    <Tooltip.Provider delayDuration={80}>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden text-slate-900",
          className
        )}
        style={style}
      >
        <section className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3 max-[780px]:gap-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-[780px]:p-2">
            <AnalysisTypePanel analysisType={analysisType} onChange={setAnalysisType} />
            <DatasetPanel
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              selectedDatasetName={selectedDatasetName}
              onSelect={setSelectedDatasetId}
              onDelete={(id) => void handleDeleteDataset(id)}
              onUploadClick={() => fileInputRef.current?.click()}
              onDropFile={handleDropFile}
              fileInputRef={fileInputRef}
              onFileInput={handleFileInput}
            />
            <WorkerSignalIndicator
              isRunning={isRunning}
              connectionState={workerConnectionState}
              activityState={workerActivityState}
              statusMessage={workerStatusMessage}
              progress={workerProgress}
            />
          </div>

          <section
            ref={panelsRef}
            className={cn("grid min-h-0", isResizingPanels ? "cursor-row-resize select-none" : "")}
            style={{
              rowGap: "0.5rem",
              gridTemplateRows: topPanelHeight
                ? `${topPanelHeight}px 8px minmax(220px, 1fr)`
                : "minmax(220px, 1fr) 8px minmax(220px, 1fr)"
            }}
          >
            <VariableAssignmentPanel
              analysisType={analysisType}
              analysisDef={analysisDef}
              availableVariables={availableVariables}
              assignments={assignments}
              variableByName={variableByName}
              selectedAvailable={selectedAvailable}
              onSelectAvailable={setSelectedAvailable}
              selectedAssigned={selectedAssigned}
              onSelectAssigned={(role, name) => setSelectedAssigned((prev) => ({ ...prev, [role]: name }))}
              onAssign={assignVariableToRole}
              onRemove={removeFromRole}
              options={options}
              onOptionsChange={setOptions}
              hasOptions={hasOptions}
              groupCandidates={groupCandidates}
            />

            <div
              role="separator"
              aria-orientation="horizontal"
              onPointerDown={() => setIsResizingPanels(true)}
              className="group relative flex cursor-row-resize items-center justify-center"
            >
              <div className="h-1.5 w-20 rounded-full bg-slate-300 transition group-hover:bg-slate-400" />
            </div>

            <ExecutionPanel
              isRunning={isRunning}
              payloadInfo={payloadInfo}
              onRun={requestRunAnalysis}
              result={result}
              error={error}
              showPayload={showPayload}
              onTogglePayload={() => setShowPayload((prev) => !prev)}
              workerReady={workerReady}
              workerProgress={workerProgress}
            />
          </section>
        </section>

        {blockInitialLoading ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
            <div className="w-[min(420px,92vw)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-2 text-sm font-semibold text-slate-800">Initializing analysis worker</div>
              <p className="mb-3 text-xs text-slate-600">{workerStatusMessage}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.max(8, workerProgress ?? 0)}%` }}
                />
              </div>
              <div className="mt-2 text-right text-xs font-medium text-slate-600">{workerProgress ?? 0}%</div>
            </div>
          </div>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}
