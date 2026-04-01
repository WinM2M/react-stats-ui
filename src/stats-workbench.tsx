import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";
import { executeDefaultAnalysis, getPayload, validateForRole } from "./stats-workbench/analysis";
import { ANALYSIS_DEFS, EMPTY_ASSIGNMENTS } from "./stats-workbench/constants";
import { getDatasets, parseXlsx, putDataset, removeDataset } from "./stats-workbench/data-store";
import { AnalysisTypePanel } from "./stats-workbench/sections/analysis-type-panel";
import { DatasetPanel } from "./stats-workbench/sections/dataset-panel";
import { ExecutionPanel } from "./stats-workbench/sections/execution-panel";
import { VariableAssignmentPanel } from "./stats-workbench/sections/variable-assignment-panel";
import type {
  AnalysisKind,
  Dataset,
  RoleKey,
  StatsWorkbenchProps,
  VariableMeta
} from "./stats-workbench/types";
import { cn } from "./stats-workbench/utils";

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
  initialAnalysis = "independent_t_test",
  analysisExecutor,
  onResult
}: StatsWorkbenchProps) {
  const [datasets, setDatasets] = React.useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null);
  const [analysisType, setAnalysisType] = React.useState<AnalysisKind>(initialAnalysis);
  const [assignments, setAssignments] = React.useState<Record<RoleKey, string[]>>(EMPTY_ASSIGNMENTS);
  const [selectedAvailable, setSelectedAvailable] = React.useState<string | null>(null);
  const [selectedAssigned, setSelectedAssigned] = React.useState<Partial<Record<RoleKey, string>>>({});
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<unknown>(null);
  const [error, setError] = React.useState("");
  const [showPayload, setShowPayload] = React.useState(false);
  const [options, setOptions] = React.useState<Record<string, unknown>>({
    equalVariance: true,
    includeIntercept: true,
    factorCount: 2
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        const next: Record<RoleKey, string[]> = {
          groupVar: prev.groupVar.filter((v) => v !== variableName),
          dependentVar: prev.dependentVar.filter((v) => v !== variableName),
          independentVars: prev.independentVars.filter((v) => v !== variableName),
          analysisVars: prev.analysisVars.filter((v) => v !== variableName)
        };
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
    try {
      const payload = payloadInfo.payload;
      const output = analysisExecutor ? await analysisExecutor(payload) : await executeDefaultAnalysis(payload);
      setResult(output);
      onResult?.({ payload, result: output });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown execution error.");
    } finally {
      setIsRunning(false);
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
