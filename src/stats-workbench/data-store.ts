import * as XLSX from "xlsx";
import type { Dataset, VariableMeta, VariableType } from "./types";

const DB_NAME = "react-stats-ui-db";
const DB_VERSION = 1;
const STORE_NAME = "datasets";

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

export async function getDatasets(): Promise<Dataset[]> {
  const result = await withStore<Dataset[]>("readonly", (store) => store.getAll());
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putDataset(dataset: Dataset): Promise<void> {
  await withStore("readwrite", (store) => store.put(dataset));
}

export async function removeDataset(id: string): Promise<void> {
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

export async function parseXlsx(file: File): Promise<Dataset> {
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
