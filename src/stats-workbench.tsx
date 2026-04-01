import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";
import { PROGRESS_EVENT_NAME } from "@winm2m/inferential-stats-js";
import { executeDefaultAnalysis, getPayload, resolveWorkerUrl, validateForRole } from "./stats-workbench/analysis";
import { ANALYSIS_DEFS, EMPTY_ASSIGNMENTS } from "./stats-workbench/constants";
import { getDatasets, parseXlsx, putDataset, removeDataset } from "./stats-workbench/data-store";
import { AnalysisTypePanel } from "./stats-workbench/sections/analysis-type-panel";
import { DatasetPanel } from "./stats-workbench/sections/dataset-panel";
import { ExecutionPanel } from "./stats-workbench/sections/execution-panel";
import { VariableAssignmentPanel } from "./stats-workbench/sections/variable-assignment-panel";
import { WorkerStatusPanel } from "./stats-workbench/sections/worker-status-panel";
import type {
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
  initialAnalysis = "ttestIndependent",
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
  const workerUrl = React.useMemo(() => resolveWorkerUrl(), []);

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

  const runAnalysis = React.useCallback(async () => {
    if (!payloadInfo.canRun) {
      setError(payloadInfo.reason ?? "Analysis setup is incomplete.");
      return;
    }
    setError("");
    setIsRunning(true);
    setWorkerActivityState("running");
    if (!analysisExecutor) {
      setWorkerConnectionState((prev) => (prev === "ready" ? "ready" : "connecting"));
      setWorkerStatusMessage("Preparing worker execution.");
    }
    try {
      const payload = payloadInfo.payload;
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
  }, [analysisExecutor, onResult, payloadInfo]);

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const parsed = await parseXlsx(file);
      await putDataset(parsed);
      await refreshDatasets();
      setSelectedDatasetId(parsed.id);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import XLSX file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteDataset = async (id: string) => {
    await removeDataset(id);
    await refreshDatasets();
    if (selectedDatasetId === id) {
      const next = (await getDatasets())[0]?.id ?? null;
      setSelectedDatasetId(next);
    }
  };

  return (
    <Tooltip.Provider delayDuration={80}>
      <div
        className={cn(
          "h-full w-full overflow-hidden bg-gradient-to-b from-slate-100 to-white p-4 text-slate-900 max-[780px]:p-2",
          className
        )}
        style={style}
      >
        <div className="grid h-full grid-cols-1 gap-3 xl:grid-cols-[320px_1fr] max-[780px]:gap-2">
          <DatasetPanel
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelect={setSelectedDatasetId}
            onDelete={(id) => void handleDeleteDataset(id)}
            onUploadClick={() => fileInputRef.current?.click()}
            fileInputRef={fileInputRef}
            onFileInput={handleFileInput}
          />

          <section className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-3 max-[780px]:gap-2">
            <WorkerStatusPanel
              connectionState={workerConnectionState}
              activityState={workerActivityState}
              statusMessage={workerStatusMessage}
              progress={workerProgress}
              workerUrl={workerUrl}
            />

            <AnalysisTypePanel analysisType={analysisType} onChange={setAnalysisType} />

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
            />

            <ExecutionPanel
              analysisType={analysisType}
              options={options}
              onOptionsChange={setOptions}
              isRunning={isRunning}
              payloadInfo={payloadInfo}
              onRun={() => void runAnalysis()}
              result={result}
              error={error}
              showPayload={showPayload}
              onTogglePayload={() => setShowPayload((prev) => !prev)}
            />
          </section>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
