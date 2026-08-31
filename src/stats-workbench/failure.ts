import type { AnalysisFailure } from "./types";

/**
 * Signatures thrown by the environment rather than by the analysis.
 *
 * These all come from `@winm2m/inferential-stats-js` before any statistics run —
 * worker creation, script fetch, SDK readiness. Matching on the message is not
 * elegant, but the engine throws plain `Error`s and these strings are ours, not a
 * third party's, so they change only when we change them.
 */
const SYSTEM_SIGNATURES: { test: RegExp; code: string }[] = [
  { test: /workerUrl is required/i, code: "worker_url_missing" },
  { test: /Failed to fetch worker script/i, code: "worker_fetch_failed" },
  { test: /SDK not initialized/i, code: "sdk_not_initialized" },
  { test: /Worker error:/i, code: "worker_error" },
  { test: /worker (?:is )?(?:still )?initializ/i, code: "worker_not_ready" },
  { test: /terminated|network error|CORS/i, code: "worker_unreachable" }
];

/**
 * Turn a thrown value into something an embedder can log and aggregate.
 *
 * Everything that is not a recognised environment failure is reported as `STATS`.
 * That is the honest default: the run reached the engine and the engine said no.
 * We do not guess at finer causes from prose.
 */
export function classifyAnalysisFailure(err: unknown): AnalysisFailure {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const hit = SYSTEM_SIGNATURES.find((entry) => entry.test.test(message));
  if (hit) {
    return { message, kind: "SYSTEM", code: hit.code };
  }
  return { message, kind: "STATS", code: "analysis_failed" };
}
