import * as inferentialStats from "@winm2m/inferential-stats-js";
import type { AnalysisKind, AnalysisPayload, PayloadInfo, RoleKey, VariableMeta } from "./types";

export function validateForRole(kind: AnalysisKind, role: RoleKey, variable: VariableMeta): string | null {
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

export function getPayload(
  analysisType: AnalysisKind,
  rows: Record<string, unknown>[],
  assignments: Record<RoleKey, string[]>,
  options: Record<string, unknown>
): PayloadInfo {
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

export async function executeDefaultAnalysis(payload: AnalysisPayload): Promise<unknown> {
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
