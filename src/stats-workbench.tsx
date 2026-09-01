import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";
import { PROGRESS_EVENT_NAME } from "@winm2m/inferential-stats-js";
import { I18nextProvider } from "react-i18next";
import {
  ensureWorkerInitialized,
  executeDefaultAnalysis,
  getPayload,
  validateForRole
} from "./stats-workbench/analysis";
import { ANALYSIS_DEFS, EMPTY_ASSIGNMENTS } from "./stats-workbench/constants";
import { classifyAnalysisFailure } from "./stats-workbench/failure";
import type { AnalysisTrigger } from "./stats-workbench/types";
import { getDatasets, parseXlsx, putDataset, removeDataset } from "./stats-workbench/data-store";
import { AnalysisTypePanel } from "./stats-workbench/sections/analysis-type-panel";
import { DatasetPanel } from "./stats-workbench/sections/dataset-panel";
import { ExecutionPanel } from "./stats-workbench/sections/execution-panel";
import { VariableAssignmentPanel } from "./stats-workbench/sections/variable-assignment-panel";
import { WorkerSignalIndicator } from "./stats-workbench/sections/worker-signal-indicator";
import { workbenchI18n, type SupportedLanguage } from "./stats-workbench/i18n";
import {
  buildApaClipboardHtml,
  buildTableData,
  copyApaTablesToClipboard
} from "./stats-workbench/result-utils";
import type {
  AnalysisKind,
  AnalysisPayload,
  Dataset,
  ExternalDataInput,
  RoleKey,
  StatsWorkbenchControl,
  StatsWorkbenchProps,
  VariableMeta,
  VariableDragItem
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
    return "pca";
  }
  return kind as AnalysisKind;
}

/**
 * Keeps the selection inside `allowedAnalyses`. An initial analysis outside the list is
 * the embedder contradicting itself, so the list wins rather than the page silently
 * opening on a test it meant to withhold.
 */
function clampToAllowed(kind: AnalysisKind, allowed: AnalysisKind[] | undefined): AnalysisKind {
  if (!allowed || allowed.length === 0 || allowed.includes(kind)) {
    return kind;
  }
  return allowed[0];
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
  RunState,
  StatsWorkbenchControl,
  StatsWorkbenchProps,
  VariableMeta,
  VariableType,
  VariableDragItem
} from "./stats-workbench/types";

export type { SupportedLanguage } from "./stats-workbench/i18n";

export const StatsWorkbench = React.forwardRef<StatsWorkbenchControl, StatsWorkbenchProps>(function StatsWorkbench({
  className,
  style,
  initialAnalysis = "frequencies",
  layoutMode = "full",
  language = "en",
  showDatasetPopover = true,
  showAnalysisHelpButton = true,
  minimalAutoShowResultEnabled = true,
  analysisExecutor,
  onResult,
  onHelpOpen,
  hideInternalVariableList = false,
  allowedAnalyses,
  onBeforeCopyApaTable,
  apaCopyLabel,
  apaCopyEmphasis,
  onRunStateChange,
  variableListPosition
}: StatsWorkbenchProps, ref) {
  // `useTranslation` here would resolve against the host application's i18n instance,
  // because the provider below only wraps the returned JSX — not this body. Strings
  // raised from here (worker status, run blockers) came out as raw keys inside an
  // embedder that had never heard of them. Bind to our own bundle instead.
  const t = React.useCallback(
    (key: string, options?: Record<string, unknown>) => workbenchI18n.t(key, options) as string,
    []
  );
  const PANEL_HEIGHT_STORAGE_KEY = "stats-workbench.topPanelHeight";
  const MINIMAL_AUTO_SHOW_STORAGE_KEY = "stats-workbench.minimalAutoShowResult";
  const [datasets, setDatasets] = React.useState<Dataset[]>([]);
  const [injectedDataset, setInjectedDataset] = React.useState<Dataset | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null);
  const [analysisType, setAnalysisTypeRaw] = React.useState<AnalysisKind>(
    clampToAllowed(normalizeInitialAnalysis(initialAnalysis), allowedAnalyses)
  );
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
  const [analysisQueue, setAnalysisQueue] = React.useState<Array<{ payload: AnalysisPayload; trigger: AnalysisTrigger }>>([]);
  const [topPanelHeight, setTopPanelHeight] = React.useState<number | null>(null);
  const [isResizingPanels, setIsResizingPanels] = React.useState(false);
  const [isCompactViewport, setIsCompactViewport] = React.useState(false);
  const [workerConnectionState, setWorkerConnectionState] = React.useState<
    "disconnected" | "connecting" | "ready" | "error" | "external"
  >(analysisExecutor ? "external" : "disconnected");
  const [workerActivityState, setWorkerActivityState] = React.useState<"idle" | "running">("idle");
  const [workerStatusMessage, setWorkerStatusMessage] = React.useState(
    analysisExecutor ? t("usingExternalExecutor") : t("workerNotInitialized")
  );
  const [workerProgress, setWorkerProgress] = React.useState<number | null>(null);
  const [activeLanguage, setActiveLanguage] = React.useState<SupportedLanguage>(language);
  const effectiveMinimalAutoShowResult = minimalAutoShowResultEnabled ? minimalAutoShowResult : false;
  const [options, setOptions] = React.useState<Record<string, unknown>>({
    equalVariance: true,
    addConstant: true,
    alpha: 0.05,
    k: 3,
    method: "ward",
    metric: "euclidean",
    rotation: "varimax",
    sortBySize: true,
    regressionMethod: "stepwise",
    maxIterations: 300,
    randomState: 42
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const panelsRef = React.useRef<HTMLElement>(null);
  /** The imperative handle is built above the run callbacks, so it reaches them here. */
  const runFromHandleRef = React.useRef<() => void>(() => {});
  const workerReady = analysisExecutor ? true : workerConnectionState === "ready";
  const blockInitialLoading = !analysisExecutor && workerConnectionState === "connecting" && !workerReady;

  const setAnalysisType = React.useCallback(
    (next: AnalysisKind) => setAnalysisTypeRaw(clampToAllowed(next, allowedAnalyses)),
    [allowedAnalyses]
  );

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
    if (layoutMode === "minimal") {
      setShowMinimalResult(false);
      setShowResultAfterManualRun(false);
    }
  }, [analysisType, injectedDataset?.id, layoutMode, selectedDatasetId]);

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

      // Otherwise the run would succeed and leave the picker showing a test the
      // embedder listed as unavailable.
      if (allowedAnalyses && !allowedAnalyses.includes(method)) {
        throw new Error(`Analysis "${method}" is not in allowedAnalyses.`);
      }

      // An external caller names its variables in `input` under the same keys the roles
      // use, so mirror them into the assignment state. Without this the role panel stays
      // empty and warns "Set Row Variable." directly above a result it just computed.
      const externalAssignments = { ...EMPTY_ASSIGNMENTS };
      ANALYSIS_DEFS[method].roles.forEach((roleDef) => {
        const value = input[roleDef.key];
        if (typeof value === "string" && value !== "") {
          externalAssignments[roleDef.key] = [value];
        } else if (Array.isArray(value)) {
          externalAssignments[roleDef.key] = value.filter((item): item is string => typeof item === "string");
        }
      });

      /*
       * The roles are not the SDK's arguments, and for one analysis that difference is
       * fatal. `ttestIndependent` needs `group1Value`/`group2Value` — which are derived
       * from the data, not named by the caller — and without them the SDK returns a shape
       * the table renderer cannot draw ("Table rendering is not available for this result
       * shape"). Every other analysis happened to need nothing beyond its roles, which is
       * why this went unnoticed.
       *
       * `getPayload` is what the panel's own Run uses, so routing through it makes the two
       * paths produce identical input for all fifteen analyses rather than fifteen chances
       * to drift. Anything the caller passed that is not a role — options like
       * `equalVariance` — is handed to it as options, and kept in the payload so an
       * `analysisExecutor` still sees what it was given.
       */
      const roleKeys = new Set(ANALYSIS_DEFS[method].roles.map((roleDef) => roleDef.key as string));
      const externalOptions: Record<string, unknown> = {};
      Object.entries(input).forEach(([key, value]) => {
        if (!roleKeys.has(key)) externalOptions[key] = value;
      });

      const built = getPayload(method, currentData, externalAssignments, externalOptions);
      const payload: AnalysisPayload = built.payload;
      if (!built.canRun) {
        const err = new Error(built.reason ?? "Analysis cannot run with the given variables.");
        onResult?.({ payload, trigger: "manual", result: undefined, error: classifyAnalysisFailure(err) });
        throw err;
      }
      let output: unknown;
      // 이 경로도 실행 중임을 알려야 한다. 0.22.0 은 패널 자체 실행만 덮었는데, 자기
      // 버튼과 자기 역할 배정을 쓰는 임베더는 전부 이쪽으로 들어온다 — 그 쪽 화면에서만
      // 스피너가 안 돌았다.
      setIsRunning(true);
      try {
        output = analysisExecutor ? await analysisExecutor(payload) : await executeDefaultAnalysis(payload);
      } catch (err) {
        // 외부 실행 경로도 같은 콜백으로 알린 뒤 다시 던진다. 호출한 쪽의 예외 처리를
        // 뺏지 않으면서, 기록하는 쪽은 실패를 놓치지 않는다.
        onResult?.({ payload, trigger: "manual", result: undefined, error: classifyAnalysisFailure(err) });
        throw err;
      } finally {
        setIsRunning(false);
      }
      setAnalysisTypeRaw(method);
      setAssignments(externalAssignments);
      setResult(output);
      onResult?.({ payload, trigger: "manual", result: output });
      setError("");
      if (layoutMode === "minimal") {
        setShowMinimalResult(true);
      }
      return output;
    },
    [analysisExecutor, injectedDataset?.rows, layoutMode, onResult]
  );

  const copyApaTable = React.useCallback(async () => {
    const tables = buildTableData(result);
    return await copyApaTablesToClipboard(tables);
  }, [result]);

  const getApaTableHtml = React.useCallback(() => {
    const tables = buildTableData(result);
    return tables.length > 0 ? buildApaClipboardHtml(tables) : null;
  }, [result]);

  const variableByName = React.useMemo(() => {
    const map = new Map<string, VariableMeta>();
    (selectedDataset?.columns ?? []).forEach((column) => map.set(column.name, column));
    return map;
  }, [selectedDataset]);

  const assignVariableToRole = React.useCallback(
    (variableName: string, role: RoleKey) => {
      const variable = variableByName.get(variableName);
      if (!variable) {
        return false;
      }
      if (validateForRole(analysisType, role, variable)) {
        return false;
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
      return true;
    },
    [analysisDef.roles, analysisType, variableByName]
  );

  const assignVariableToBestRole = React.useCallback(
    (variableName: string) => {
      const roles = analysisDef.roles;
      if (roles.length === 0) {
        return false;
      }

      const singleRoles = roles.filter((role) => !role.multi);
      for (const role of singleRoles) {
        if ((assignments[role.key] ?? []).length === 0) {
          return assignVariableToRole(variableName, role.key);
        }
      }

      const multiRoles = roles.filter((role) => role.multi);
      if (multiRoles.length > 0) {
        return assignVariableToRole(variableName, multiRoles[0].key);
      }

      const fallback = singleRoles[singleRoles.length - 1];
      if (fallback) {
        return assignVariableToRole(variableName, fallback.key);
      }

      return false;
    },
    [analysisDef.roles, assignments, assignVariableToRole]
  );

  const handleExternalVariableDrop = React.useCallback(
    (item: VariableDragItem, role?: RoleKey) => {
      if (!item || !item.variableName) {
        return false;
      }
      const names = item.variableNames && item.variableNames.length > 0
        ? item.variableNames
        : [item.variableName];
      let applied = false;
      if (role) {
        names.forEach((name) => {
          if (assignVariableToRole(name, role)) {
            applied = true;
          }
        });
        return applied;
      }
      names.forEach((name) => {
        if (assignVariableToBestRole(name)) {
          applied = true;
        }
      });
      return applied;
    },
    [assignVariableToBestRole, assignVariableToRole]
  );

  React.useImperativeHandle(
    ref,
    (): StatsWorkbenchControl => ({
      injectData,
      clearInjectedData,
      run: () => runFromHandleRef.current(),
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
      setAutoShowResult: (next: boolean) => {
        if (!minimalAutoShowResultEnabled) {
          return;
        }
        setMinimalAutoShowResult(next);
      },
      toggleAutoShowResult: () => {
        if (!minimalAutoShowResultEnabled) {
          return false;
        }
        const next = !minimalAutoShowResult;
        setMinimalAutoShowResult(next);
        return next;
      },
      getAutoShowResult: () => effectiveMinimalAutoShowResult,
      copyApaTable,
      getApaTableHtml,
      assignVariableToRole,
      assignVariableToBestRole,
      handleExternalVariableDrop
    }),
    [
      clearInjectedData,
      copyApaTable,
      getApaTableHtml,
      effectiveMinimalAutoShowResult,
      executeExternalMethod,
      assignVariableToBestRole,
      assignVariableToRole,
      handleExternalVariableDrop,
      injectData,
      layoutMode,
      minimalAutoShowResult,
      minimalAutoShowResultEnabled,
      showMinimalResult
    ]
  );


  const removeFromRole = React.useCallback((role: RoleKey, variableName: string) => {
    setAssignments((prev) => ({ ...prev, [role]: prev[role].filter((v) => v !== variableName) }));
    setSelectedAssigned((prev) => ({ ...prev, [role]: undefined }));
  }, []);

  const resetAssignments = React.useCallback(() => {
    setAssignments(EMPTY_ASSIGNMENTS);
    setSelectedAssigned({});
    setError("");
    setResult(null);
    setShowPayload(false);
    if (layoutMode === "minimal") {
      setShowMinimalResult(false);
      setShowResultAfterManualRun(false);
    }
  }, [layoutMode]);

  const executeAnalysisPayload = React.useCallback(
    async (payload: AnalysisPayload, trigger: AnalysisTrigger = "manual") => {
      if (!workerReady) {
        setError(t("workerStillInitializing", { progress: workerProgress ?? 0 }));
        // 조기 반환도 실패다. 알리지 않으면 기록하는 쪽에서는 "시도 없음" 과 구별되지 않는다.
        onResult?.({
          payload,
          trigger,
          result: undefined,
          error: { message: "Worker is still initializing.", kind: "SYSTEM", code: "worker_not_ready" }
        });
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
        onResult?.({ payload, trigger, result: output });
        if (!analysisExecutor) {
          setWorkerConnectionState("ready");
          setWorkerStatusMessage("Worker connected and analysis completed.");
        }
      } catch (err) {
        const failure = classifyAnalysisFailure(err);
        setError(err instanceof Error ? err.message : t("unknownExecutionError"));
        // 성공과 같은 콜백으로 실패도 알린다 — 기록하는 쪽에서 "시도 후 실패" 를
        // "시도 없음" 과 구별할 수 있어야 한다.
        onResult?.({ payload, trigger, result: undefined, error: failure });
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

  const enqueueAnalysis = React.useCallback((payload: AnalysisPayload, trigger: AnalysisTrigger) => {
    setAnalysisQueue((prev) => [...prev, { payload, trigger }]);
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
    enqueueAnalysis(payloadInfo.payload, "manual");
  }, [enqueueAnalysis, payloadInfo, workerProgress, workerReady]);

  const requestRunAnalysisFromManual = React.useCallback(() => {
    setShowManualRunAction(false);
    setShowResultAfterManualRun(true);
    requestRunAnalysis();
  }, [requestRunAnalysis]);

  runFromHandleRef.current = requestRunAnalysisFromManual;

  // Reported rather than queried, because a ref method cannot re-render an embedder's
  // own run button when the answer changes underneath it.
  React.useEffect(() => {
    onRunStateChange?.({
      canRun: Boolean(workerReady && payloadInfo.canRun),
      reason: workerReady ? (payloadInfo.canRun ? null : payloadInfo.reason ?? t("setupIncomplete")) : t("workerStillInitializing", { progress: workerProgress ?? 0 }),
      workerReady,
      isRunning
    });
  }, [isRunning, onRunStateChange, payloadInfo.canRun, payloadInfo.reason, t, workerProgress, workerReady]);

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

    if (layoutMode === "minimal" && !effectiveMinimalAutoShowResult) {
      setShowManualRunAction(true);
      return;
    }

    setError("");
    setShowManualRunAction(false);
    enqueueAnalysis(payloadInfo.payload, "auto");
  }, [
    analysisDef.roles,
    analysisType,
    assignments,
    autoRunKey,
    enqueueAnalysis,
    layoutMode,
    effectiveMinimalAutoShowResult,
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
    void executeAnalysisPayload(next.payload, next.trigger);
  }, [analysisQueue, executeAnalysisPayload, isRunning]);

  React.useEffect(() => {
    if (!previousRunningRef.current || isRunning) {
      previousRunningRef.current = isRunning;
      return;
    }

    if (layoutMode === "minimal" && (effectiveMinimalAutoShowResult || showResultAfterManualRun)) {
      setShowMinimalResult(true);
      setShowResultAfterManualRun(false);
    }

    previousRunningRef.current = isRunning;
  }, [effectiveMinimalAutoShowResult, isRunning, layoutMode, showResultAfterManualRun]);

  React.useEffect(() => {
    if (!minimalAutoShowResultEnabled) {
      setMinimalAutoShowResult(false);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(MINIMAL_AUTO_SHOW_STORAGE_KEY);
    if (saved === null) {
      return;
    }
    setMinimalAutoShowResult(saved !== "false");
  }, [minimalAutoShowResultEnabled]);

  React.useEffect(() => {
    if (!minimalAutoShowResultEnabled) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(MINIMAL_AUTO_SHOW_STORAGE_KEY, String(minimalAutoShowResult));
  }, [minimalAutoShowResult, minimalAutoShowResultEnabled]);

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
    if (layoutMode === "minimal" && !effectiveMinimalAutoShowResult && workerReady && payloadInfo.canRun) {
      setShowManualRunAction(true);
      return;
    }
    if (layoutMode !== "minimal" || effectiveMinimalAutoShowResult || !payloadInfo.canRun) {
      setShowManualRunAction(false);
    }
  }, [effectiveMinimalAutoShowResult, layoutMode, payloadInfo.canRun, workerReady]);

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
      const minPanelHeight = isCompactViewport ? 120 : 220;
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
  }, [isCompactViewport, isResizingPanels]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      setIsCompactViewport(window.innerWidth <= 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  React.useEffect(() => {
    const container = panelsRef.current;
    if (!container || topPanelHeight === null) {
      return;
    }
    const dividerHeight = 8;
    const minPanelHeight = isCompactViewport ? 120 : 220;
    const maxTop = Math.max(minPanelHeight, container.getBoundingClientRect().height - minPanelHeight - dividerHeight);
    const clamped = Math.max(minPanelHeight, Math.min(topPanelHeight, maxTop));
    if (clamped !== topPanelHeight) {
      setTopPanelHeight(clamped);
    }
  }, [isCompactViewport, topPanelHeight]);

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
  const minPanelHeight = isCompactViewport ? 120 : 220;

  return (
    <I18nextProvider i18n={workbenchI18n}>
    <Tooltip.Provider delayDuration={80}>
      <div
        data-stats-workbench-root="true"
        className={cn(
          "relative h-full w-full overflow-hidden text-slate-900",
          className
        )}
        style={style}
      >
        <section
          className={cn(
            "grid h-full min-h-0 max-[640px]:gap-2",
            // Minimal renders a single child. Leaving it in an `auto` row meant the
            // panel sized to its content and ignored the height its host gave it, so a
            // taller container just grew empty space underneath.
            layoutMode === "minimal" ? "grid-rows-[1fr] gap-1.5" : "grid-rows-[auto_1fr] gap-3"
          )}
        >
          {layoutMode === "minimal" ? (
            <section className="flex min-h-0 flex-col rounded-xl bg-white shadow-sm">
              <div className="flex select-none items-start justify-between gap-3 p-3 max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:p-2">
                <AnalysisTypePanel
                  analysisType={analysisType}
                  onChange={setAnalysisType}
                  showPrefix={false}
                  subtleUnderline
                  showHelpButton={showAnalysisHelpButton}
                  onHelpOpen={onHelpOpen}
                  allowedAnalyses={allowedAnalyses}
                />
                <div className="flex items-center gap-3 self-end max-[640px]:self-auto">
                  {showDatasetPopover ? (
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
                  ) : null}
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
                      onResetAssignments={resetAssignments}
                      showVariableList={!hideInternalVariableList}
                      variableListPosition={variableListPosition}
                      variableListDatasetId={selectedDataset?.id ?? null}
                      variableListDatasetName={selectedDataset?.name ?? null}
                      onAvailableVariableActivate={assignVariableToBestRole}
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
                      autoShowResult={effectiveMinimalAutoShowResult}
                      onAutoShowResultChange={minimalAutoShowResultEnabled ? setMinimalAutoShowResult : undefined}
                      onBeforeCopy={onBeforeCopyApaTable}
                      copyLabel={apaCopyLabel}
                      copyEmphasis={apaCopyEmphasis}
                    />
                  </div>
                </div>
              </section>
            </section>
          ) : (
            <>
              <div className="flex select-none flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-[640px]:p-2">
                <AnalysisTypePanel
                  analysisType={analysisType}
                  onChange={setAnalysisType}
                  showHelpButton={showAnalysisHelpButton}
                  onHelpOpen={onHelpOpen}
                  allowedAnalyses={allowedAnalyses}
                />
                {showDatasetPopover ? (
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
                ) : null}
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
                className={cn("grid min-h-0 min-w-0", isResizingPanels ? "cursor-row-resize select-none" : "")}
                style={{
                  rowGap: "0.5rem",
                  gridTemplateRows: topPanelHeight
                    ? `${topPanelHeight}px 8px minmax(${minPanelHeight}px, 1fr)`
                    : `minmax(${minPanelHeight}px, 1fr) 8px minmax(${minPanelHeight}px, 1fr)`
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
                  onResetAssignments={resetAssignments}
                  showVariableList={!hideInternalVariableList}
                  variableListPosition={variableListPosition}
                  variableListDatasetId={selectedDataset?.id ?? null}
                  variableListDatasetName={selectedDataset?.name ?? null}
                  onAvailableVariableActivate={assignVariableToBestRole}
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
                  onBeforeCopy={onBeforeCopyApaTable}
                  copyLabel={apaCopyLabel}
                  copyEmphasis={apaCopyEmphasis}
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
    </I18nextProvider>
  );
});

StatsWorkbench.displayName = "StatsWorkbench";
