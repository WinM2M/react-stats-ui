import * as React from "react";

type WorkerSignalIndicatorProps = {
  connectionState: "disconnected" | "connecting" | "ready" | "error" | "external";
  activityState: "idle" | "running";
  statusMessage: string;
  progress: number | null;
};

function getSignal(connectionState: WorkerSignalIndicatorProps["connectionState"], activityState: WorkerSignalIndicatorProps["activityState"]) {
  if (connectionState === "error") {
    return { color: "bg-red-500", ring: "ring-red-200", label: "Error" };
  }
  if (connectionState === "connecting" || activityState === "running") {
    return { color: "bg-amber-500", ring: "ring-amber-200", label: "Loading" };
  }
  if (connectionState === "ready" || connectionState === "external") {
    return { color: "bg-emerald-500", ring: "ring-emerald-200", label: "Ready" };
  }
  return { color: "bg-slate-400", ring: "ring-slate-200", label: "Standby" };
}

export function WorkerSignalIndicator({ connectionState, activityState, statusMessage, progress }: WorkerSignalIndicatorProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const signal = getSignal(connectionState, activityState);
  const isLoading = connectionState === "connecting" || activityState === "running";

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", onPointerDown);
    }
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50"
        aria-label="Worker status"
        title={`Worker status: ${signal.label}`}
      >
        <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${signal.color}`}>
          {isLoading ? <span className={`absolute inset-0 rounded-full animate-ping ${signal.color} opacity-40`} /> : null}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(340px,92vw)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${signal.color}`} />
            {signal.label}
          </div>
          <p className="text-xs text-slate-600">{statusMessage}</p>
          {progress !== null ? <p className="mt-2 text-xs text-slate-600">Initialization progress: {progress}%</p> : null}
          {isLoading ? (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full w-1/2 rounded-full ${signal.color} animate-pulse`} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
