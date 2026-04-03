import * as Tooltip from "@radix-ui/react-tooltip";
import { PanelBottom, PanelBottomOpen } from "lucide-react";
import * as React from "react";
import { PROGRESS_EVENT_NAME } from "@winm2m/inferential-stats-js";
import { useTranslation } from "react-i18next";
import {
  ensureWorkerInitialized,
  executeExternalAnalysis,
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
import { workbenchI18n, type SupportedLanguage } from "./stats-workbench/i18n";
import { buildTableData, copyApaTablesToClipboard } from "./stats-workbench/result-utils";
import type {
  AnalysisKind,
  AnalysisPayload,
  Dataset,
  ExternalDataInput,
  RoleKey,
  StatsWorkbenchControl,
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

function inferVariableType(values: unknown[]): "continuous" | "nominal" | "unknown" {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "").slice(0, 50);
  if (nonEmpty.length === 0) {
    return "unknown";
  }

  const isContinuous = nonEmpty.every((v) => {
    if (typeof v === "number") {
      return Number.isFinite(v);
    }
    if (typeof v === "string") {
      const parsed = Number(v);
      return Number.isFinite(parsed) && v.trim() !== "";
    }
    return false;
  });

  return isContinuous ? "continuous" : "nominal";
}

function buildColumns(rows: Record<string, unknown>[]): VariableMeta[] {
  const keySet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((key) => keySet.add(key));
  }

  return Array.from(keySet)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      type: inferVariableType(rows.map((row) => row[name]))
    }));
}

export type {
  AnalysisDef,
  AnalysisKind,
  AnalysisPayload,
  AnalysisResult,
  Dataset,
  ExternalDataInput,
  PayloadInfo,
  RoleKey,
  StatsWorkbenchControl,
  StatsWorkbenchProps,
  VariableMeta,
  VariableType
} from "./stats-workbench/types";

export type { SupportedLanguage } from "./stats-workbench/i18n";

export const StatsWorkbench = React.forwardRef<StatsWorkbenchControl, StatsWorkbenchProps>(function StatsWorkbench({
  className,
  style,
  initialAnalysis = "frequencies",
  layoutMode = "full",
  language = "en",
  analysisExecutor,
  onResult
}: StatsWorkbenchProps, ref) {
  const { t } = useTranslation();
  const PANEL_HEIGHT_STORAGE_KEY = "stats-workbench.topPanelHeight";
  const MINIMAL_AUTO_SHOW_STORAGE_KEY = "stats-workbench.minimalAutoShowResult";
  const [datasets, setDatasets] = React.useState<Dataset[]>([]);
  const [injectedDataset, setInjectedDataset] = React.useState<Dataset | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null);
  const [analysisType, setAnalysisType] = React.useState<AnalysisKind>(normalizeInitialAnalysis(initialAnalysis));
  const [assignments, setAssignments] = React.useState<Record<RoleKey, string[]>>(EMPTY_ASSIGNMENTS);
  const [selectedAvailable, setSelectedAvailable] = React.useState<string | null>(null);
  const [selectedAssigned, setSelectedAssigned] = React.useState<Partial<Record<RoleKey, string>>>({});
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<unknown>(null);
  const [error, setError] = React.useState("");
  const [showPayload, setShowPayload] = React.useState(false);
  const [showMinimalResult, setShowMinimalResult] = React.useState(false);
  const [minimalAutoShowResult, setMinimalAutoShowResult] = React.useState(true);
  const [showManualRunAction, setShowManualRunAction] = React.useState(false);
  const [showResultAfterManualRun, setShowResultAfterManualRun] = React.useState(false);
  const [analysisQueue, setAnalysisQueue] = React.useState<AnalysisPayload[]>([]);
  const [topPanelHeight, setTopPanelHeight] = React.useState<number | null>(null);
  const [isResizingPanels, setIsResizingPanels] = React.useState(false);
  const [workerConnectionState, setWorkerConnectionState] = React.useState<
    "disconnected" | "connecting" | "ready" | "error" | "external"
  >(analysisExecutor ? "external" : "disconnected");
  const [workerActivityState, setWorkerActivityState] = React.useState<"idle" | "running">("idle");
  const [workerStatusMessage, setWorkerStatusMessage] = React.useState(
    analysisExecutor ? t("usingExternalExecutor") : t("workerNotInitialized")
  );
  const [workerProgress, setWorkerProgress] = React.useState<number | null>(null);
  const [activeLanguage, setActiveLanguage] = React.useState<SupportedLanguage>(language);
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
    setActiveLanguage(language);
  }, [language]);

  React.useEffect(() => {
    void workbenchI18n.changeLanguage(activeLanguage);
  }, [activeLanguage]);

  React.useEffect(() => {
    if (analysisExecutor) {
      setWorkerConnectionState("external");
      setWorkerStatusMessage(t("usingExternalExecutor"));
      setWorkerProgress(null);
      return;
    }

    const target = globalThis as unknown as EventTarget;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ stage?: string; progress?: number; message?: string }>).detail ?? {};
      const stage = detail.stage ?? "init";
      const progress = typeof detail.progress === "number" ? detail.progress : null;
      const message = detail.message ?? t("initializingWorkerSimple");

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
    setWorkerStatusMessage(t("initializingWorkerSimple"));

    void ensureWorkerInitialized()
      .then(() => {
        if (cancelled) {
          return;
        }
        setWorkerConnectionState("ready");
        setWorkerStatusMessage(t("workerReadyMsg"));
        setWorkerProgress(100);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setWorkerConnectionState("error");
        setWorkerStatusMessage(err instanceof Error ? err.message : t("workerInitFailed"));
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
  }, [analysisType, injectedDataset?.id, selectedDatasetId]);

  const selectedDataset = injectedDataset ?? datasets.find((d) => d.id === selectedDatasetId) ?? null;
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
  const previousRunningRef = React.useRef(false);
  const previousAssignmentsRef = React.useRef(assignments);
  const previousOptionsRef = React.useRef(options);
  const previousAnalysisTypeRef = React.useRef(analysisType);
  const previousDatasetIdRef = React.useRef<string | null>(selectedDatasetId);

  const injectData = React.useCallback((data: ExternalDataInput) => {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const columns = data.columns ?? buildColumns(rows);
    setInjectedDataset({
      id: data.id ?? `external-${Date.now()}`,
      name: data.name ?? "Injected dataset",
      createdAt: Date.now(),
      rows,
      columns
    });
    setError("");
  }, []);

  const clearInjectedData = React.useCallback(() => {
    setInjectedDataset(null);
  }, []);

  const executeExternalMethod = React.useCallback(
    async (method: AnalysisKind, input: Record<string, unknown> = {}) => {
      const currentData = injectedDataset?.rows ?? [];
      if (currentData.length === 0) {
        throw new Error("No injected dataset found. Call injectData first.");
      }

      const payload: AnalysisPayload = {
        analysisType: method,
        method,
        input: { ...input, data: currentData },
        options: {},
        assignments: EMPTY_ASSIGNMENTS
      };
      const output = await executeExternalAnalysis(method, currentData, input);
      setResult(output);
      onResult?.({ payload, result: output });
      setError("");
      if (layoutMode === "minimal") {
        setShowMinimalResult(true);
      }
      return output;
    },
    [injectedDataset?.rows, layoutMode, onResult]
  );

  const copyApaTable = React.useCallback(async () => {
    const tables = buildTableData(result);
    return await copyApaTablesToClipboard(tables);
  }, [result]);

  React.useImperativeHandle(
    ref,
    (): StatsWorkbenchControl => ({
      injectData,
      clearInjectedData,
      executeAnalysis: (method, input = {}) => executeExternalMethod(method, input),
      runFrequencies: (input = {}) => executeExternalMethod("frequencies", input),
      runDescriptives: (input = {}) => executeExternalMethod("descriptives", input),
      runCrosstabs: (input = {}) => executeExternalMethod("crosstabs", input),
      runTtestIndependent: (input = {}) => executeExternalMethod("ttestIndependent", input),
      runTtestPaired: (input = {}) => executeExternalMethod("ttestPaired", input),
      runAnovaOneway: (input = {}) => executeExternalMethod("anovaOneway", input),
      runPosthocTukey: (input = {}) => executeExternalMethod("posthocTukey", input),
      runLinearRegression: (input = {}) => executeExternalMethod("linearRegression", input),
      runLogisticBinary: (input = {}) => executeExternalMethod("logisticBinary", input),
      runLogisticMultinomial: (input = {}) => executeExternalMethod("logisticMultinomial", input),
      runKmeans: (input = {}) => executeExternalMethod("kmeans", input),
      runHierarchicalCluster: (input = {}) => executeExternalMethod("hierarchicalCluster", input),
      runEfa: (input = {}) => executeExternalMethod("efa", input),
      runPca: (input = {}) => executeExternalMethod("pca", input),
      runMds: (input = {}) => executeExternalMethod("mds", input),
      runCronbachAlpha: (input = {}) => executeExternalMethod("cronbachAlpha", input),
      setResultVisible: (next: boolean) => {
        if (layoutMode === "minimal") {
          setShowMinimalResult(next);
        }
      },
      toggleResultVisible: () => {
        if (layoutMode !== "minimal") {
          return true;
        }
        const next = !showMinimalResult;
        setShowMinimalResult(next);
        return next;
      },
      copyApaTable
    }),
    [clearInjectedData, copyApaTable, executeExternalMethod, injectData, layoutMode, showMinimalResult]
  );

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
        setError(t("workerStillInitializing", { progress: workerProgress ?? 0 }));
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
        setError(err instanceof Error ? err.message : t("unknownExecutionError"));
        if (!analysisExecutor) {
          setWorkerConnectionState("error");
          setWorkerStatusMessage(err instanceof Error ? err.message : t("workerFailed"));
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
      setError(t("workerStillInitializing", { progress: workerProgress ?? 0 }));
      return;
    }
    if (!payloadInfo.canRun) {
      setError(payloadInfo.reason ?? t("setupIncomplete"));
      return;
    }

    setError("");
    setShowManualRunAction(false);
    enqueueAnalysis(payloadInfo.payload);
  }, [enqueueAnalysis, payloadInfo, workerProgress, workerReady]);

  const requestRunAnalysisFromManual = React.useCallback(() => {
    setShowManualRunAction(false);
    setShowResultAfterManualRun(true);
    requestRunAnalysis();
  }, [requestRunAnalysis]);

  React.useEffect(() => {
    if (lastAutoRunKeyRef.current === null) {
      lastAutoRunKeyRef.current = autoRunKey;
      return;
    }

    if (lastAutoRunKeyRef.current === autoRunKey) {
      return;
    }

    lastAutoRunKeyRef.current = autoRunKey;

    const analysisChanged = previousAnalysisTypeRef.current !== analysisType;
    const datasetChanged = previousDatasetIdRef.current !== selectedDatasetId;
    const optionsChanged = JSON.stringify(previousOptionsRef.current) !== JSON.stringify(options);
    const changedRoleKeys = analysisDef.roles
      .filter((role) => {
        const prev = previousAssignmentsRef.current[role.key] ?? [];
        const next = assignments[role.key] ?? [];
        return JSON.stringify(prev) !== JSON.stringify(next);
      })
      .map((role) => role.key);
    const multiRoleChanged = changedRoleKeys.some((roleKey) => analysisDef.roles.find((role) => role.key === roleKey)?.multi);

    previousAssignmentsRef.current = assignments;
    previousOptionsRef.current = options;
    previousAnalysisTypeRef.current = analysisType;
    previousDatasetIdRef.current = selectedDatasetId;

    if (!workerReady || !payloadInfo.canRun) {
      setShowManualRunAction(false);
      return;
    }

    if (layoutMode === "minimal" && !analysisChanged && !datasetChanged && !optionsChanged && multiRoleChanged) {
      setShowManualRunAction(true);
      return;
    }

    if (layoutMode === "minimal" && !minimalAutoShowResult) {
      setShowManualRunAction(true);
      return;
    }

    setError("");
    setShowManualRunAction(false);
    enqueueAnalysis(payloadInfo.payload);
  }, [
    analysisDef.roles,
    analysisType,
    assignments,
    autoRunKey,
    enqueueAnalysis,
    layoutMode,
    minimalAutoShowResult,
    options,
    payloadInfo,
    selectedDatasetId,
    workerReady
  ]);

  React.useEffect(() => {
    if (isRunning || analysisQueue.length === 0) {
      return;
    }

    const [next, ...rest] = analysisQueue;
    setAnalysisQueue(rest);
    void executeAnalysisPayload(next);
  }, [analysisQueue, executeAnalysisPayload, isRunning]);

  React.useEffect(() => {
    if (!previousRunningRef.current || isRunning) {
      previousRunningRef.current = isRunning;
      return;
    }

    if (layoutMode === "minimal" && (minimalAutoShowResult || showResultAfterManualRun)) {
      setShowMinimalResult(true);
      setShowResultAfterManualRun(false);
    }

    previousRunningRef.current = isRunning;
  }, [isRunning, layoutMode, minimalAutoShowResult, showResultAfterManualRun]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(MINIMAL_AUTO_SHOW_STORAGE_KEY);
    if (saved === null) {
      return;
    }
    setMinimalAutoShowResult(saved !== "false");
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(MINIMAL_AUTO_SHOW_STORAGE_KEY, String(minimalAutoShowResult));
  }, [minimalAutoShowResult]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(PANEL_HEIGHT_STORAGE_KEY);
    if (!saved) {
      return;
    }

    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed > 0) {
      setTopPanelHeight(parsed);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || topPanelHeight === null) {
      return;
    }

    window.localStorage.setItem(PANEL_HEIGHT_STORAGE_KEY, String(topPanelHeight));
  }, [topPanelHeight]);

  React.useEffect(() => {
    if (layoutMode === "minimal" && !minimalAutoShowResult && workerReady && payloadInfo.canRun) {
      setShowManualRunAction(true);
      return;
    }
    if (layoutMode !== "minimal" || minimalAutoShowResult || !payloadInfo.canRun) {
      setShowManualRunAction(false);
    }
  }, [layoutMode, minimalAutoShowResult, payloadInfo.canRun, workerReady]);

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
        setError(err instanceof Error ? err.message : t("importFailed"));
      }
    },
    [refreshDatasets, t]
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

  const selectedDatasetName = selectedDataset?.name ?? t("noDatasetSelected");

  return (
    <Tooltip.Provider delayDuration={80}>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden text-slate-900",
          className
        )}
        style={style}
      >
        <section
          className={cn(
            "grid h-full min-h-0 grid-rows-[auto_1fr] max-[640px]:gap-2",
            layoutMode === "minimal" ? "gap-1.5" : "gap-3"
          )}
        >
          {layoutMode === "minimal" ? (
            <section className="flex min-h-0 flex-col rounded-xl bg-white shadow-sm">
              <div className="flex select-none items-start justify-between gap-3 p-3 max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:p-2">
                <AnalysisTypePanel analysisType={analysisType} onChange={setAnalysisType} showPrefix={false} subtleUnderline />
                <div className="flex items-center gap-3 self-end max-[640px]:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowMinimalResult((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    aria-label={showMinimalResult ? t("hideResult") : t("showResult")}
                    title={showMinimalResult ? t("hideResult") : t("showResult")}
                  >
                    {showMinimalResult ? <PanelBottom className="h-3.5 w-3.5" /> : <PanelBottomOpen className="h-3.5 w-3.5" />}
                    {showMinimalResult ? t("hideResult") : t("showResult")}
                  </button>
                  <DatasetPanel
                    datasets={datasets}
                    selectedDatasetId={selectedDatasetId}
                    selectedDatasetName={selectedDatasetName}
                    borderlessButton
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
              </div>

              <section className="flex min-h-0 flex-1 flex-col p-2">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <div className="h-full">
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
                      borderlessSections
                      showManualRunAction={showManualRunAction}
                      onManualRunAction={requestRunAnalysisFromManual}
                    />
                  </div>

                  <div
                    className={cn(
                      "absolute inset-0 z-20 h-full transition-transform duration-300 ease-out",
                      showMinimalResult ? "translate-y-0" : "translate-y-full"
                    )}
                  >
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
                      minimalChrome
                      onCloseResult={() => setShowMinimalResult(false)}
                      autoShowResult={minimalAutoShowResult}
                      onAutoShowResultChange={setMinimalAutoShowResult}
                    />
                  </div>
                </div>
              </section>
            </section>
          ) : (
            <>
              <div className="flex select-none flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-[640px]:p-2">
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
            </>
          )}
        </section>

        {blockInitialLoading ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
            <div className="w-[min(420px,92vw)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-2 text-sm font-semibold text-slate-800">{t("loadingWorker")}</div>
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
});

StatsWorkbench.displayName = "StatsWorkbench";
