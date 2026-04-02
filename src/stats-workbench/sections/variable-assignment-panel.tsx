import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
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

const VariableCard = ({
  name,
  type,
  isSelected,
  onClick,
  onDoubleClick,
  isDragging
}: {
  name: string;
  type: VariableType;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  isDragging?: boolean;
}) => (
  <div
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className={cn(
      "flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition",
      isSelected ? "ring-2 ring-sky-500 border-sky-500" : "hover:border-slate-300 hover:shadow-md",
      isDragging && "opacity-50"
    )}
  >
    <RoleTag type={type} />
    <span className="truncate text-sm font-medium text-slate-700">{name}</span>
  </div>
);

type VariableType = VariableMeta["type"];

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

  const handleDoubleClick = (variableName: string) => {
    for (const role of analysisDef.roles) {
      if (assignments[role.key].length === 0) {
        onAssign(variableName, role.key);
        return;
      }
    }
    onAssign(variableName, analysisDef.roles[0].key);
  };

  return (
    <div className="grid min-h-0 grid-cols-1 gap-3 lg:h-[clamp(320px,40vh,560px)] lg:grid-cols-[1fr_2fr] max-[780px]:gap-2">
      <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 text-sm font-semibold">Variables</div>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
          {availableVariables.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No available variables.</div>
          ) : (
            <ul className="space-y-2 p-2">
              {availableVariables.map((variable) => (
                <li
                  key={variable.name}
                  draggable
                  onDragStart={() => setDragVariable(variable.name)}
                  onDragEnd={() => {
                    setDragVariable(null);
                    setInvalidRole(null);
                  }}
                  onClick={() => onSelectAvailable(variable.name)}
                >
                  <VariableCard
                    name={variable.name}
                    type={variable.type}
                    isSelected={selectedAvailable === variable.name}
                    onClick={() => onSelectAvailable(variable.name)}
                    onDoubleClick={() => handleDoubleClick(variable.name)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-[780px]:p-2">
        <div className="mb-2 text-sm font-semibold">Role Assignment</div>
        <div className="grid min-h-0 flex-1 auto-rows-fr gap-2">
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
                    className={cn(
                      "flex h-full min-h-0 flex-col rounded-lg border p-2 transition",
                      activeError ? "border-red-500 bg-red-50" : "border-slate-200"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">{role.label}</span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto rounded border border-dashed border-slate-200 p-1">
                      {assignments[role.key].length === 0 ? (
                        <div className="px-2 py-3 text-xs text-slate-500">Drop variable here</div>
                      ) : (
                        <ul className="space-y-1">
                          {assignments[role.key].map((name) => {
                            const variable = variableByName.get(name);
                            return (
                              <li
                                key={name}
                                onClick={() => onSelectAssigned(role.key, name)}
                                className={cn(
                                  "group flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm",
                                  selectedAssigned[role.key] === name ? "ring-2 ring-sky-500 border-sky-500" : "hover:border-slate-300 hover:shadow-md"
                                )}
                              >
                                {variable ? <RoleTag type={variable.type} /> : null}
                                <span className="truncate text-sm font-medium text-slate-700">{name}</span>
                                {selectedAssigned[role.key] === name && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemove(role.key, name);
                                    }}
                                    className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    aria-label={`Remove ${name}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
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
