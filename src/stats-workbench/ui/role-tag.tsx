import type { VariableType } from "../types";
import { cn } from "../utils";

const VARIABLE_LABELS: Record<VariableType, string> = {
  continuous: "C",
  nominal: "N",
  unknown: "?"
};

const VARIABLE_COLORS: Record<VariableType, string> = {
  continuous: "bg-emerald-500 text-white",
  nominal: "bg-amber-500 text-white",
  unknown: "bg-slate-400 text-white"
};

export function RoleTag({ type }: { type: VariableType }) {
  return (
    <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold", VARIABLE_COLORS[type])}>
      {VARIABLE_LABELS[type]}
    </span>
  );
}
