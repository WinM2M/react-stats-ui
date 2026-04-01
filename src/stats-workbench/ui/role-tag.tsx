import type { VariableType } from "../types";
import { cn } from "../utils";

export function RoleTag({ type }: { type: VariableType }) {
  const styles: Record<VariableType, string> = {
    continuous: "bg-emerald-100 text-emerald-700",
    nominal: "bg-amber-100 text-amber-700",
    unknown: "bg-slate-100 text-slate-600"
  };
  return <span className={cn("rounded px-2 py-0.5 text-xs font-medium", styles[type])}>{type}</span>;
}
