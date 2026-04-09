import { InferentialStats } from "@winm2m/inferential-stats-js";
import { ANALYSIS_DEFS, EMPTY_ASSIGNMENTS } from "./constants";
import i18next from "i18next";
import type { AnalysisKind, AnalysisPayload, PayloadInfo, RoleKey, VariableMeta } from "./types";

const continuousRoles: Partial<Record<AnalysisKind, RoleKey[]>> = {
  descriptives: ["variables"],
  ttestIndependent: ["variable"],
  ttestPaired: ["variable1", "variable2"],
  anovaOneway: ["variable"],
  posthocTukey: ["variable"],
  linearRegression: ["dependentVariable", "independentVariables"],
  logisticBinary: ["independentVariables"],
  logisticMultinomial: ["independentVariables"],
  kmeans: ["variables"],
  hierarchicalCluster: ["variables"],
  efa: ["variables"],
  pca: ["variables"],
  mds: ["variables"],
  cronbachAlpha: ["items"]
};

let sdkInstance: InferentialStats | null = null;
let sdkInitPromise: Promise<InferentialStats> | null = null;

export function resolveWorkerUrl(): string {
  const fromGlobal = (globalThis as { __WINM2M_INFERENTIAL_WORKER_URL__?: string }).__WINM2M_INFERENTIAL_WORKER_URL__;
  if (typeof fromGlobal === "string" && fromGlobal.length > 0) {
    return fromGlobal;
  }
  return "https://cdn.jsdelivr.net/npm/@winm2m/inferential-stats-js/dist/stats-worker.js";
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function getInputForAnalysis(
  analysisType: AnalysisKind,
  data: Record<string, unknown>[],
  assignments: Record<RoleKey, string[]>,
  options: Record<string, unknown>
): { input: Record<string, unknown>; reason?: string; meta?: Record<string, unknown> } {
  if (analysisType === "frequencies") {
    return { input: { data, variable: assignments.variable[0] } };
  }
  if (analysisType === "descriptives") {
    return { input: { data, variables: assignments.variables } };
  }
  if (analysisType === "crosstabs") {
    return { input: { data, rowVariable: assignments.rowVariable[0], colVariable: assignments.colVariable[0] } };
  }
  if (analysisType === "ttestIndependent") {
    const groupVariable = assignments.groupVariable[0];
    const values = Array.from(new Set(data.map((row) => row[groupVariable]).filter((v) => v !== null && v !== undefined)));
    if (values.length < 2) {
      return {
        input: { data },
        reason: i18next.t("groupNeedsTwoValues"),
        meta: { groupCandidates: values }
      };
    }
    const group1Value = options.group1Value ?? values[0];
    const group2Value = options.group2Value ?? values[1];
    return {
      input: {
        data,
        variable: assignments.variable[0],
        groupVariable,
        group1Value,
        group2Value,
        equalVariance: toBoolean(options.equalVariance, true)
      },
      meta: { groupCandidates: values }
    };
  }
  if (analysisType === "ttestPaired") {
    return { input: { data, variable1: assignments.variable1[0], variable2: assignments.variable2[0] } };
  }
  if (analysisType === "anovaOneway") {
    return { input: { data, variable: assignments.variable[0], groupVariable: assignments.groupVariable[0] } };
  }
  if (analysisType === "posthocTukey") {
    return {
      input: {
        data,
        variable: assignments.variable[0],
        groupVariable: assignments.groupVariable[0],
        alpha: toNumber(options.alpha, 0.05)
      }
    };
  }
  if (analysisType === "linearRegression") {
    return {
      input: {
        data,
        dependentVariable: assignments.dependentVariable[0],
        independentVariables: assignments.independentVariables,
        addConstant: toBoolean(options.addConstant, true)
      }
    };
  }
  if (analysisType === "logisticBinary") {
    return {
      input: {
        data,
        dependentVariable: assignments.dependentVariable[0],
        independentVariables: assignments.independentVariables,
        addConstant: toBoolean(options.addConstant, true)
      }
    };
  }
  if (analysisType === "logisticMultinomial") {
    return {
      input: {
        data,
        dependentVariable: assignments.dependentVariable[0],
        independentVariables: assignments.independentVariables,
        referenceCategory: options.referenceCategory || undefined
      }
    };
  }
  if (analysisType === "kmeans") {
    return {
      input: {
        data,
        variables: assignments.variables,
        k: toNumber(options.k, 3),
        maxIterations: toNumber(options.maxIterations, 300),
        randomState: toNumber(options.randomState, 42)
      }
    };
  }
  if (analysisType === "hierarchicalCluster") {
    return {
      input: {
        data,
        variables: assignments.variables,
        method: options.method ?? "ward",
        metric: options.metric ?? "euclidean",
        nClusters: toNumber(options.nClusters, 3)
      }
    };
  }
  if (analysisType === "efa") {
    return {
      input: {
        data,
        variables: assignments.variables,
        nFactors: toNumber(options.nFactors, 2),
        rotation: options.rotation ?? "varimax",
        method: options.factorMethod ?? "minres"
      }
    };
  }
  if (analysisType === "pca") {
    return {
      input: {
        data,
        variables: assignments.variables,
        nComponents: toNumber(options.nComponents, 2),
        standardize: toBoolean(options.standardize, true)
      }
    };
  }
  if (analysisType === "mds") {
    return {
      input: {
        data,
        variables: assignments.variables,
        nComponents: toNumber(options.nComponents, 2),
        metric: toBoolean(options.metric, true),
        maxIterations: toNumber(options.maxIterations, 300),
        randomState: toNumber(options.randomState, 42)
      }
    };
  }

  return {
    input: {
      data,
      items: assignments.items
    }
  };
}

export function validateForRole(kind: AnalysisKind, role: RoleKey, variable: VariableMeta): string | null {
  const requiresContinuous = continuousRoles[kind]?.includes(role) ?? false;
  if (requiresContinuous && variable.type !== "continuous") {
    return i18next.t("onlyContinuousAllowed");
  }
  return null;
}

export function getPayload(
  analysisType: AnalysisKind,
  rows: Record<string, unknown>[],
  assignments: Record<RoleKey, string[]>,
  options: Record<string, unknown>
): PayloadInfo {
  const analysisDef = ANALYSIS_DEFS[analysisType];
  for (const role of analysisDef.roles) {
    const selected = assignments[role.key] ?? [];
    if (role.required && selected.length === 0) {
      return {
        payload: { analysisType, method: analysisType, input: { data: [] }, options, assignments },
        canRun: false,
        reason: i18next.t("setRoleReason", { role: i18next.t(`roles.${role.key}`, { defaultValue: role.label }) })
      };
    }
    if (role.minItems && selected.length < role.minItems) {
      return {
        payload: { analysisType, method: analysisType, input: { data: [] }, options, assignments },
        canRun: false,
        reason: i18next.t("setMinItemsReason", { count: role.minItems, role: i18next.t(`roles.${role.key}`, { defaultValue: role.label }) })
      };
    }
  }

  if (!rows.length) {
    return {
      payload: { analysisType, method: analysisType, input: { data: [] }, options, assignments },
      canRun: false,
      reason: i18next.t("noRowsReason")
    };
  }

  const usedVariables = new Set<string>();
  Object.values(assignments).forEach((vars) => vars.forEach((name) => usedVariables.add(name)));
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    usedVariables.forEach((name) => {
      out[name] = row[name];
    });
    return out;
  });

  const { input, reason, meta } = getInputForAnalysis(analysisType, data, assignments, options);
  const payload: AnalysisPayload = {
    analysisType,
    method: analysisType,
    input,
    options,
    assignments
  };

  if (reason) {
    return { payload, canRun: false, reason, meta };
  }
  return { payload, canRun: true, meta };
}

async function getSdkInstance(): Promise<InferentialStats> {
  if (sdkInstance?.isInitialized()) {
    return sdkInstance;
  }
  if (!sdkInitPromise) {
    sdkInitPromise = (async () => {
      const sdk = new InferentialStats({ workerUrl: resolveWorkerUrl() });
      await sdk.init();
      sdkInstance = sdk;
      return sdk;
    })().catch((error) => {
      sdkInitPromise = null;
      throw error;
    });
  }
  return await sdkInitPromise;
}

export async function ensureWorkerInitialized(): Promise<void> {
  await getSdkInstance();
}

export async function executeDefaultAnalysis(payload: AnalysisPayload): Promise<unknown> {
  const sdk = await getSdkInstance();
  const method = (sdk as unknown as Record<string, unknown>)[payload.method];
  if (typeof method !== "function") {
    throw new Error(i18next.t("methodUnavailable", { method: payload.method }));
  }
  return await (method as (this: InferentialStats, input: Record<string, unknown>) => Promise<unknown>).call(
    sdk,
    payload.input
  );
}

export async function executeExternalAnalysis(
  methodName: AnalysisKind,
  data: Record<string, unknown>[],
  input: Record<string, unknown> = {}
): Promise<unknown> {
  const payload: AnalysisPayload = {
    analysisType: methodName,
    method: methodName,
    input: { ...input, data },
    options: {},
    assignments: EMPTY_ASSIGNMENTS
  };

  return await executeDefaultAnalysis(payload);
}
