import * as Tooltip from "@radix-ui/react-tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { validateForRole } from "../analysis";
import type { AnalysisDef, AnalysisKind, RoleKey, VariableMeta } from "../types";
import { cn } from "../utils";
import { RoleTag } from "../ui/role-tag";

type VariableAssignmentPanelProps = {
  analysisType: AnalysisKind;
  analysisDef: AnalysisDef;
  availableVariables: VariableMeta[];
  assignments: Record<RoleKey, string[]>;
  variableByName: Map<string, VariableMeta>;
  selectedAvailable: string | null;
  onSelectAvailable: (name: string | null) => void;
  selectedAssigned: Partial<Record<RoleKey, string>>;
  onSelectAssigned: (role: RoleKey, name: string) => void;
  onAssign: (variableName: string, role: RoleKey) => void;
  onRemove: (role: RoleKey, variableName: string) => void;
};

export function VariableAssignmentPanel({
  analysisType,
  analysisDef,
  availableVariables,
  assignments,
  variableByName,
  selectedAvailable,
  onSelectAvailable,
  selectedAssigned,
  onSelectAssigned,
  onAssign,
  onRemove
}: VariableAssignmentPanelProps) {
  const [dragVariable, setDragVariable] = React.useState<string | null>(null);
  const [invalidRole, setInvalidRole] = React.useState<RoleKey | null>(null);
  const [invalidMessage, setInvalidMessage] = React.useState("");

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr] max-[780px]:gap-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 text-sm font-semibold">Variables</div>
        <div className="h-52 overflow-auto rounded-lg border border-slate-200 max-[780px]:h-40">
          {availableVariables.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No available variables.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {availableVariables.map((variable) => (
                <li
                  key={variable.name}
                  draggable
                  onDragStart={() => setDragVariable(variable.name)}
                  onDragEnd={() => {
                    setDragVariable(null);
                    setInvalidRole(null);
                  }}
                  className={cn(
                    "flex cursor-grab items-center justify-between px-3 py-2",
                    selectedAvailable === variable.name ? "bg-sky-50" : "hover:bg-slate-50"
                  )}
                  onClick={() => onSelectAvailable(variable.name)}
                >
                  <span className="truncate pr-2 text-sm">{variable.name}</span>
                  <RoleTag type={variable.type} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 text-sm font-semibold">Role Assignment</div>
        <div className="grid gap-2">
          {analysisDef.roles.map((role) => {
            const activeError = invalidRole === role.key ? invalidMessage : "";
            return (
              <Tooltip.Root key={role.key} open={Boolean(activeError)}>
                <Tooltip.Trigger asChild>
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!dragVariable) {
                        return;
                      }
                      const variable = variableByName.get(dragVariable);
                      if (!variable) {
                        return;
                      }
                      const msg = validateForRole(analysisType, role.key, variable);
                      if (msg) {
                        setInvalidRole(role.key);
                        setInvalidMessage(msg);
                      } else {
                        setInvalidRole(null);
                        setInvalidMessage("");
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!dragVariable) {
                        return;
                      }
                      onAssign(dragVariable, role.key);
                    }}
                    className={cn("rounded-lg border p-2 transition", activeError ? "border-red-500 bg-red-50" : "border-slate-200")}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">{role.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedAssigned[role.key]) {
                              return;
                            }
                            onRemove(role.key, selectedAssigned[role.key] as string);
                          }}
                          className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={!selectedAssigned[role.key]}
                          aria-label={`Remove from ${role.label}`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedAvailable) {
                              return;
                            }
                            onAssign(selectedAvailable, role.key);
                          }}
                          className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={!selectedAvailable}
                          aria-label={`Assign to ${role.label}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="min-h-16 rounded border border-dashed border-slate-200 p-1">
                      {assignments[role.key].length === 0 ? (
                        <div className="px-2 py-2 text-xs text-slate-500">Drop variable here</div>
                      ) : (
                        <ul className="space-y-1">
                          {assignments[role.key].map((name) => {
                            const variable = variableByName.get(name);
                            return (
                              <li
                                key={name}
                                onClick={() => onSelectAssigned(role.key, name)}
                                className={cn(
                                  "flex items-center justify-between rounded px-2 py-1 text-sm",
                                  selectedAssigned[role.key] === name ? "bg-sky-100" : "bg-slate-50"
                                )}
                              >
                                <span className="truncate pr-2">{name}</span>
                                {variable ? <RoleTag type={variable.type} /> : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top" className="rounded bg-red-600 px-2 py-1 text-xs text-white shadow">
                    {activeError}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </div>
      </div>
    </div>
  );
}
