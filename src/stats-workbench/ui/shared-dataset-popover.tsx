import { ChevronDown, Database, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import * as React from "react";
import type { Dataset } from "../types";
import { cn } from "../utils";

export type SharedDatasetPopoverProps = {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  selectedDatasetName?: string;
  borderlessButton?: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onUploadClick?: () => void;
  onDropFile?: (file: File) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onFileInput?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoOpenWhenEmpty?: boolean;
  className?: string;
  labels?: {
    title?: React.ReactNode;
    importButton?: React.ReactNode;
    dropHint?: React.ReactNode;
    emptyList?: React.ReactNode;
    deleteAria?: (name: string) => string;
  };
};

export function SharedDatasetPopover({
  datasets,
  selectedDatasetId,
  selectedDatasetName,
  borderlessButton = false,
  onSelect,
  onDelete,
  onUploadClick,
  onDropFile,
  fileInputRef,
  onFileInput,
  autoOpenWhenEmpty = false,
  className,
  labels
}: SharedDatasetPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const resolvedName =
    selectedDatasetName ?? datasets.find((dataset) => dataset.id === selectedDatasetId)?.name ?? datasets[0]?.name ?? "";

  React.useEffect(() => {
    if (autoOpenWhenEmpty && datasets.length === 0) {
      setOpen(true);
    }
  }, [autoOpenWhenEmpty, datasets.length]);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (!onDropFile) {
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onDropFile(file);
    }
  };

  const deleteAria = labels?.deleteAria ?? ((name: string) => `Delete dataset ${name}`);

  return (
    <section className={cn("relative ml-auto", className)} ref={popoverRef}>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
            borderlessButton ? "" : "border border-slate-300"
          )}
        >
          <Database className="h-4 w-4" />
          <span className="max-w-[260px] truncate" title={resolvedName}>
            {resolvedName || "Select dataset"}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
        {fileInputRef ? <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onFileInput} /> : null}
      </div>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(420px,92vw)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">{labels?.title ?? "Datasets"}</div>
            {onUploadClick ? (
              <button
                type="button"
                onClick={onUploadClick}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {labels?.importButton ?? "Import .xlsx"}
              </button>
            ) : null}
          </div>

          {datasets.length > 0 ? (
            <div className="mb-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
              <ul className="divide-y divide-slate-100">
                {datasets.map((dataset) => {
                  const active = selectedDatasetId === dataset.id;
                  return (
                    <li key={dataset.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(dataset.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm",
                          active ? "bg-sky-100 text-sky-700" : "hover:bg-slate-50"
                        )}
                      >
                        <FileSpreadsheet className="h-4 w-4 shrink-0" />
                        <span className="truncate">{dataset.name}</span>
                      </button>
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(dataset.id)}
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={deleteAria(dataset.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : labels?.emptyList ? (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{labels.emptyList}</div>
          ) : null}

          {onDropFile ? (
            <div
              className={cn(
                "rounded-lg border border-dashed px-3 py-4 text-center text-xs text-slate-500 transition",
                dragActive ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-300"
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
            >
              {labels?.dropHint ?? "Drop a dataset (.xlsx)"}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
