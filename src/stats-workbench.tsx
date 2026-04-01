import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Play,
  Trash2,
  Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import * as inferentialStats from "@winm2m/inferential-stats-js";

const DB_NAME = "react-stats-ui-db";
const DB_VERSION = 1;
const STORE_NAME = "datasets";

type VariableType = "continuous" | "nominal" | "unknown";
type RoleKey = "groupVar" | "dependentVar" | "independentVars" | "analysisVars";

export type AnalysisKind = "independent_t_test" | "multiple_regression" | "factor_analysis";

export type AnalysisPayload = {
  analysisType: AnalysisKind;
  data: Record<string, unknown>[];
  groupVar?: string;
  dependentVar?: string;
  testVar?: string;
  independentVars?: string[];
  analysisVars?: string[];
  options: Record<string, unknown>;
};

export type AnalysisResult = {
  payload: AnalysisPayload;
  result: unknown;
};

export type StatsWorkbenchProps = {
  className?: string;
  style?: React.CSSProperties;
  initialAnalysis?: AnalysisKind;
  analysisExecutor?: (payload: AnalysisPayload) => Promise<unknown>;
  onResult?: (result: AnalysisResult) => void;
};

type Dataset = {
  id: string;
  name: string;
  createdAt: number;
  rows: Record<string, unknown>[];
  columns: VariableMeta[];
};

type VariableMeta = {
  name: string;
  type: VariableType;
};

type AnalysisDef = {
  label: string;
  roles: {
    key: RoleKey;
    label: string;
    multi: boolean;
    required: boolean;
  }[];
};

const ANALYSIS_DEFS: Record<AnalysisKind, AnalysisDef> = {
  independent_t_test: {
    label: "Independent Samples T-Test",
    roles: [
      { key: "groupVar", label: "Group Variable", multi: false, required: true },
      { key: "dependentVar", label: "Test Variable", multi: false, required: true }
    ]
  },
  multiple_regression: {
    label: "Multiple Regression",
    roles: [
      { key: "dependentVar", label: "Dependent Variable", multi: false, required: true },
      { key: "independentVars", label: "Independent Variables", multi: true, required: true }
    ]
  },
  factor_analysis: {
    label: "Factor Analysis",
    roles: [{ key: "analysisVars", label: "Analysis Variables", multi: true, required: true }]
  }
};

const EMPTY_ASSIGNMENTS: Record<RoleKey, string[]> = {
  groupVar: [],
  dependentVar: [],
  independentVars: [],
  analysisVars: []
};

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDatasets(): Promise<Dataset[]> {
  const result = await withStore<Dataset[]>("readonly", (store) => store.getAll());
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

async function putDataset(dataset: Dataset): Promise<void> {
  await withStore("readwrite", (store) => store.put(dataset));
}

async function removeDataset(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

function inferVariableType(values: unknown[]): VariableType {
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

async function parseXlsx(file: File): Promise<Dataset> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: null,
    raw: true
  });

  return {
    id: crypto.randomUUID(),
    name: file.name,
    createdAt: Date.now(),
    rows,
    columns: buildColumns(rows)
  };
}

function validateForRole(kind: AnalysisKind, role: RoleKey, variable: VariableMeta): string | null {
  const type = variable.type;
  if (kind === "independent_t_test" && role === "dependentVar" && type !== "continuous") {
    return "Only continuous variables are allowed.";
  }
  if (kind === "multiple_regression" && (role === "dependentVar" || role === "independentVars") && type !== "continuous") {
    return "Only continuous variables are allowed.";
  }
  if (kind === "factor_analysis" && role === "analysisVars" && type !== "continuous") {
    return "Only continuous variables are allowed.";
  }
  return null;
}

function getPayload(
  analysisType: AnalysisKind,
  rows: Record<string, unknown>[],
  assignments: Record<RoleKey, string[]>,
  options: Record<string, unknown>
): { payload: AnalysisPayload; canRun: boolean; reason?: string } {
  const usedVariables = new Set<string>();
  Object.values(assignments).forEach((vars) => vars.forEach((v) => usedVariables.add(v)));

  const projectedData = rows.map((row) => {
    const out: Record<string, unknown> = {};
    usedVariables.forEach((name) => {
      out[name] = row[name];
    });
    return out;
  });

  const payload: AnalysisPayload = {
    analysisType,
    data: projectedData,
    options
  };

  if (analysisType === "independent_t_test") {
    payload.groupVar = assignments.groupVar[0];
    payload.testVar = assignments.dependentVar[0];
    if (!payload.groupVar || !payload.testVar) {
      return { payload, canRun: false, reason: "Set both Group Variable and Test Variable." };
    }
  }

  if (analysisType === "multiple_regression") {
    payload.dependentVar = assignments.dependentVar[0];
    payload.independentVars = assignments.independentVars;
    if (!payload.dependentVar || !payload.independentVars.length) {
      return { payload, canRun: false, reason: "Set one Dependent Variable and at least one Independent Variable." };
    }
  }

  if (analysisType === "factor_analysis") {
    payload.analysisVars = assignments.analysisVars;
    if (payload.analysisVars.length < 2) {
      return { payload, canRun: false, reason: "Select at least two Analysis Variables." };
    }
  }

  if (!rows.length) {
    return { payload, canRun: false, reason: "Dataset does not contain rows." };
  }

  return { payload, canRun: true };
}

async function executeDefaultAnalysis(payload: AnalysisPayload): Promise<unknown> {
  const candidates: Record<AnalysisKind, string[]> = {
    independent_t_test: ["independentTTest", "runIndependentTTest", "independent_t_test", "ttest"],
    multiple_regression: ["multipleRegression", "runMultipleRegression", "multiple_regression", "regression"],
    factor_analysis: ["factorAnalysis", "runFactorAnalysis", "factor_analysis"]
  };
  const modules: unknown[] = [inferentialStats, (inferentialStats as { default?: unknown }).default];

  for (const mod of modules) {
    if (!mod || typeof mod !== "object") {
      continue;
    }
    const target = mod as Record<string, unknown>;

    const runAnalysis = target.runAnalysis;
    if (typeof runAnalysis === "function") {
      return await (runAnalysis as (analysisType: AnalysisKind, payload: AnalysisPayload) => Promise<unknown>)(
        payload.analysisType,
        payload
      );
    }

    for (const fnName of candidates[payload.analysisType]) {
      const fn = target[fnName];
      if (typeof fn === "function") {
        return await (fn as (arg: AnalysisPayload) => Promise<unknown>)(payload);
      }
    }
  }

  throw new Error("No compatible analysis function found in @winm2m/inferential-stats-js.");
}

function RoleTag({ type }: { type: VariableType }) {
  const styles: Record<VariableType, string> = {
    continuous: "bg-emerald-100 text-emerald-700",
    nominal: "bg-amber-100 text-amber-700",
    unknown: "bg-slate-100 text-slate-600"
  };
  return <span className={cn("rounded px-2 py-0.5 text-xs font-medium", styles[type])}>{type}</span>;
}

function SelectBox({
  value,
  onChange,
  items
}: {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-sky-500">
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <Select.Viewport className="p-1">
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="relative flex cursor-pointer select-none items-center rounded px-8 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-sky-50"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

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
  const [dragVariable, setDragVariable] = React.useState<string | null>(null);
  const [invalidRole, setInvalidRole] = React.useState<RoleKey | null>(null);
  const [invalidMessage, setInvalidMessage] = React.useState("");
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<unknown>(null);
  const [error, setError] = React.useState<string>("");
  const [showPayload, setShowPayload] = React.useState(false);
  const [options, setOptions] = React.useState<Record<string, unknown>>({
    equalVariance: true,
    includeIntercept: true,
    factorCount: 2
  });
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
  const availableVariables = (selectedDataset?.columns ?? []).filter((c) => !assignedNames.has(c.name));

  const analysisDef = ANALYSIS_DEFS[analysisType];
  const payloadInfo = getPayload(analysisType, selectedDataset?.rows ?? [], assignments, options);

  const variableByName = React.useMemo(() => {
    const map = new Map<string, VariableMeta>();
    (selectedDataset?.columns ?? []).forEach((col) => map.set(col.name, col));
    return map;
  }, [selectedDataset]);

  const assignVariableToRole = React.useCallback(
    (variableName: string, role: RoleKey) => {
      const variable = variableByName.get(variableName);
      if (!variable) {
        return;
      }
      const validationError = validateForRole(analysisType, role, variable);
      if (validationError) {
        setInvalidRole(role);
        setInvalidMessage(validationError);
        return;
      }

      setInvalidRole(null);
      setInvalidMessage("");
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
        if (roleDef.multi) {
          next[role] = [...next[role], variableName];
        } else {
          next[role] = [variableName];
        }
        return next;
      });
      setSelectedAvailable(null);
    },
    [analysisType, analysisDef.roles, variableByName]
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
      const message = err instanceof Error ? err.message : "Unknown execution error.";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }, [analysisExecutor, onResult, payloadInfo]);

  const handleUploadClick = () => fileInputRef.current?.click();

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
          <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4" />
                IndexedDB Datasets
              </div>
              <button
                type="button"
                onClick={handleUploadClick}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Import XLSX
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileInput} />
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
              {datasets.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">No dataset saved yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {datasets.map((dataset) => {
                    const active = selectedDatasetId === dataset.id;
                    return (
                      <li key={dataset.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDatasetId(dataset.id)}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm",
                            active ? "bg-sky-100 text-sky-700" : "hover:bg-slate-50"
                          )}
                        >
                          <FileSpreadsheet className="h-4 w-4 shrink-0" />
                          <span className="truncate">{dataset.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDataset(dataset.id)}
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${dataset.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-3 max-[780px]:gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis Type</label>
              <SelectBox
                value={analysisType}
                onChange={(value) => setAnalysisType(value as AnalysisKind)}
                items={Object.entries(ANALYSIS_DEFS).map(([value, def]) => ({ value, label: def.label }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr] max-[780px]:gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
                <div className="mb-2 text-sm font-semibold">Variables</div>
                <div className="h-52 overflow-auto rounded-lg border border-slate-200 max-[780px]:h-40">
                  {availableVariables.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No available variables.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {availableVariables.map((variable) => (
                        <li
                          key={variable.name}
                          draggable
                          onDragStart={() => setDragVariable(variable.name)}
                          onDragEnd={() => {
                            setDragVariable(null);
                            setInvalidRole(null);
                          }}
                          className={cn(
                            "flex cursor-grab items-center justify-between px-3 py-2",
                            selectedAvailable === variable.name ? "bg-sky-50" : "hover:bg-slate-50"
                          )}
                          onClick={() => setSelectedAvailable(variable.name)}
                        >
                          <span className="truncate pr-2 text-sm">{variable.name}</span>
                          <RoleTag type={variable.type} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
                <div className="mb-2 text-sm font-semibold">Role Assignment</div>
                <div className="grid gap-2">
                  {analysisDef.roles.map((role) => {
                    const activeError = invalidRole === role.key ? invalidMessage : "";
                    return (
                      <Tooltip.Root key={role.key} open={Boolean(activeError)}>
                        <Tooltip.Trigger asChild>
                          <div
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (!dragVariable) {
                                return;
                              }
                              const variable = variableByName.get(dragVariable);
                              if (!variable) {
                                return;
                              }
                              const msg = validateForRole(analysisType, role.key, variable);
                              if (msg) {
                                setInvalidRole(role.key);
                                setInvalidMessage(msg);
                              } else {
                                setInvalidRole(null);
                                setInvalidMessage("");
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (!dragVariable) {
                                return;
                              }
                              assignVariableToRole(dragVariable, role.key);
                            }}
                            className={cn(
                              "rounded-lg border p-2 transition",
                              activeError ? "border-red-500 bg-red-50" : "border-slate-200"
                            )}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-700">{role.label}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedAssigned[role.key]) {
                                      return;
                                    }
                                    removeFromRole(role.key, selectedAssigned[role.key] as string);
                                  }}
                                  className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                  disabled={!selectedAssigned[role.key]}
                                  aria-label={`Remove from ${role.label}`}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedAvailable) {
                                      return;
                                    }
                                    assignVariableToRole(selectedAvailable, role.key);
                                  }}
                                  className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                  disabled={!selectedAvailable}
                                  aria-label={`Assign to ${role.label}`}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="min-h-16 rounded border border-dashed border-slate-200 p-1">
                              {assignments[role.key].length === 0 ? (
                                <div className="px-2 py-2 text-xs text-slate-500">Drop variable here</div>
                              ) : (
                                <ul className="space-y-1">
                                  {assignments[role.key].map((name) => {
                                    const variable = variableByName.get(name);
                                    return (
                                      <li
                                        key={name}
                                        onClick={() => setSelectedAssigned((prev) => ({ ...prev, [role.key]: name }))}
                                        className={cn(
                                          "flex items-center justify-between rounded px-2 py-1 text-sm",
                                          selectedAssigned[role.key] === name ? "bg-sky-100" : "bg-slate-50"
                                        )}
                                      >
                                        <span className="truncate pr-2">{name}</span>
                                        {variable ? <RoleTag type={variable.type} /> : null}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white shadow"
                          >
                            {activeError}
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[340px_1fr] max-[780px]:gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
                <div className="mb-2 text-sm font-semibold">Options</div>

                {analysisType === "independent_t_test" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Equal Variance Assumption</label>
                    <SelectBox
                      value={String(Boolean(options.equalVariance))}
                      onChange={(value) => setOptions((prev) => ({ ...prev, equalVariance: value === "true" }))}
                      items={[
                        { value: "true", label: "Enabled" },
                        { value: "false", label: "Disabled" }
                      ]}
                    />
                  </div>
                )}

                {analysisType === "multiple_regression" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Include Intercept</label>
                    <SelectBox
                      value={String(Boolean(options.includeIntercept))}
                      onChange={(value) => setOptions((prev) => ({ ...prev, includeIntercept: value === "true" }))}
                      items={[
                        { value: "true", label: "Yes" },
                        { value: "false", label: "No" }
                      ]}
                    />
                  </div>
                )}

                {analysisType === "factor_analysis" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Number of Factors</label>
                    <SelectBox
                      value={String(options.factorCount ?? 2)}
                      onChange={(value) => setOptions((prev) => ({ ...prev, factorCount: Number(value) }))}
                      items={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
                    />
                  </div>
                )}

                <Separator.Root className="my-3 h-px bg-slate-200" />

                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  disabled={isRunning || !payloadInfo.canRun}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Play className="h-4 w-4" />
                  {isRunning ? "Running" : "Run Analysis"}
                </button>
                {!payloadInfo.canRun ? <p className="mt-2 text-xs text-amber-700">{payloadInfo.reason}</p> : null}
              </div>

              <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Analysis Result</div>
                  <button
                    type="button"
                    onClick={() => setShowPayload((prev) => !prev)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {showPayload ? "Hide API Payload" : "Show API Payload"}
                  </button>
                </div>

                {error ? <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</div> : null}

                <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2">
                  {result ? (
                    <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(result, null, 2)}</pre>
                  ) : (
                    <div className="text-sm text-slate-500">Run an analysis to view results.</div>
                  )}
                </div>

                {showPayload ? (
                  <div className="mt-2 min-h-0 overflow-auto rounded border border-slate-200 bg-white p-2">
                    <pre className="text-xs leading-relaxed text-slate-700">{JSON.stringify(payloadInfo.payload, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
