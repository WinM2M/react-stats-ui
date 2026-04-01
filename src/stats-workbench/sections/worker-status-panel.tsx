type WorkerStatusPanelProps = {
  connectionState: "disconnected" | "connecting" | "ready" | "error" | "external";
  activityState: "idle" | "running";
  statusMessage: string;
  progress: number | null;
  workerUrl: string;
};

function stateClass(state: WorkerStatusPanelProps["connectionState"]): string {
  if (state === "ready") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (state === "connecting") {
    return "bg-amber-100 text-amber-700";
  }
  if (state === "error") {
    return "bg-red-100 text-red-700";
  }
  if (state === "external") {
    return "bg-indigo-100 text-indigo-700";
  }
  return "bg-slate-100 text-slate-700";
}

function activityClass(state: WorkerStatusPanelProps["activityState"]): string {
  return state === "running" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700";
}

export function WorkerStatusPanel({
  connectionState,
  activityState,
  statusMessage,
  progress,
  workerUrl
}: WorkerStatusPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Worker Status</div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`rounded px-2 py-1 font-medium ${stateClass(connectionState)}`}>{connectionState}</span>
          <span className={`rounded px-2 py-1 font-medium ${activityClass(activityState)}`}>{activityState}</span>
        </div>
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        <p className="truncate">Worker URL: {workerUrl}</p>
        <p>{statusMessage}</p>
        {progress !== null ? <p>Initialization progress: {progress}%</p> : null}
      </div>
    </div>
  );
}
