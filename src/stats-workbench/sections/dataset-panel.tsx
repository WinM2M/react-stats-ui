import { Database, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import type * as React from "react";
import type { Dataset } from "../types";
import { cn } from "../utils";

type DatasetPanelProps = {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function DatasetPanel({
  datasets,
  selectedDatasetId,
  onSelect,
  onDelete,
  onUploadClick,
  fileInputRef,
  onFileInput
}: DatasetPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4" />
          IndexedDB Datasets
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Import XLSX
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onFileInput} />
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
                    onClick={() => onSelect(dataset.id)}
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
                    onClick={() => onDelete(dataset.id)}
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
  );
}
