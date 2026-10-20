import * as Tooltip from "@radix-ui/react-tooltip";
import { Play, RotateCcw, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { validateForRole } from "../analysis";
import type { AnalysisDef, AnalysisKind, RoleKey, VariableMeta, VariableDragItem } from "../types";
import { VARIABLE_DRAG_DATA_FORMAT } from "../types";
import { AnalysisOptionsPanel } from "./analysis-options-panel";
import { cn } from "../utils";
import { RoleTag } from "../ui/role-tag";
import { SharedVariableList, type WorkbenchDensity } from "../ui/shared-variable-list";

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
  options: Record<string, unknown>;
  onOptionsChange: (next: Record<string, unknown>) => void;
  hasOptions: boolean;
  groupCandidates: Array<string | number>;
  borderlessSections?: boolean;
  showManualRunAction?: boolean;
  onManualRunAction?: () => void;
  onResetAssignments?: () => void;
  variableListDatasetId?: string | null;
  variableListDatasetName?: string | null;
  showVariableList?: boolean;
  /** Which side the variable list sits on. Defaults to the left. */
  variableListPosition?: "start" | "end";
  density?: WorkbenchDensity;
  variableTooltip?: (name: string) => string | undefined;
  onAvailableVariableActivate?: (variableName: string) => void;
};

const parseDragPayload = (event: React.DragEvent): VariableDragItem | null => {
  const raw = event.dataTransfer?.getData(VARIABLE_DRAG_DATA_FORMAT);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as VariableDragItem;
  } catch {
    return null;
  }
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
  onRemove,
  options,
  onOptionsChange,
  hasOptions,
  groupCandidates,
  borderlessSections = false,
  showManualRunAction = false,
  onManualRunAction,
  onResetAssignments,
  variableListDatasetId,
  variableListDatasetName,
  showVariableList = true,
  variableListPosition = "start",
  density = "comfortable",
  variableTooltip,
  onAvailableVariableActivate
}: VariableAssignmentPanelProps) {
  const { t } = useTranslation();
  const [dragPayload, setDragPayload] = React.useState<VariableDragItem | null>(null);
  const [invalidRole, setInvalidRole] = React.useState<RoleKey | null>(null);
  const [invalidMessage, setInvalidMessage] = React.useState("");

  const resolveDragPayload = React.useCallback(
    (event: React.DragEvent): VariableDragItem | null => parseDragPayload(event) ?? dragPayload,
    [dragPayload]
  );

  const handleAvailableActivate = React.useCallback(
    (variableName: string) => {
      if (onAvailableVariableActivate) {
        onAvailableVariableActivate(variableName);
        return;
      }

      const roles = analysisDef.roles;
      if (roles.length === 0) {
        return;
      }

      const singleRoles = roles.filter((role) => !role.multi);
      const multiRoles = roles.filter((role) => role.multi);

      for (const role of singleRoles) {
        if ((assignments[role.key] ?? []).length === 0) {
          onAssign(variableName, role.key);
          return;
        }
      }

      if (multiRoles.length > 0) {
        onAssign(variableName, multiRoles[0].key);
        return;
      }

      if (singleRoles.length > 0) {
        onAssign(variableName, singleRoles[singleRoles.length - 1].key);
      }
    },
    [analysisDef.roles, assignments, onAssign, onAvailableVariableActivate]
  );

  /**
   * 변수 목록의 **여러 개 선택**.
   *
   * 목록 컴포넌트에는 범위 선택(Shift)과 여러 개 끌어놓기가 이미 들어 있었는데,
   * 이 패널이 `onSelectionChange` 를 안 넘겨서 **꺼진 채로** 있었다. 그 prop 이
   * 없으면 목록은 「한 번에 하나」로 동작한다.
   *
   * 문항이 서른 개인 척도를 배정하려면 서른 번을 눌러야 했다.
   */
  const [selectedAvailableNames, setSelectedAvailableNames] = React.useState<string[]>([]);

  // 배정이 바뀌면 고른 것을 비운다. 이미 옮겨 간 변수가 선택된 채로 남으면,
  // 다음 끌어놓기가 목록에 없는 이름을 함께 들고 간다.
  React.useEffect(() => {
    setSelectedAvailableNames((prev) => {
      const stillHere = prev.filter((name) =>
        availableVariables.some((variable) => variable.name === name),
      );
      return stillHere.length === prev.length ? prev : stillHere;
    });
  }, [availableVariables]);

  const listAtEnd = variableListPosition === "end";

  const variableList = showVariableList ? (
    /*
      감싼 칸은 그리드가 늘려 주지만, 그 안의 목록은 블록 자식이라 **높이를
      물려받지 않는다.** 그래서 변수가 많으면 목록이 칸을 뚫고 자라고, 목록이
      들고 있던 `overflow-auto` 는 한 번도 걸리지 않는다 — 결과 판이 화면 밖으로
      밀리고 페이지 전체가 스크롤된다.

      칸을 flex 열로 만들고 목록에 `flex-1 min-h-0` 을 줘야 목록이 남은 높이를
      받아 **자기 안에서** 스크롤한다.
    */
    <div className={cn("flex min-h-0 flex-col", listAtEnd ? "sm:order-2" : "sm:order-1")}>
        <SharedVariableList
          className="min-h-0 flex-1"
          density={density}
          tooltipByName={variableTooltip}
          variables={availableVariables}
          heading={t("variables")}
          emptyLabel={t("noAvailableVariables")}
          selectedName={selectedAvailable}
          selectedNames={selectedAvailableNames}
          onSelectionChange={setSelectedAvailableNames}
          onSelect={(name) => onSelectAvailable(name)}
          onDoubleClick={handleAvailableActivate}
          datasetId={variableListDatasetId}
          datasetName={variableListDatasetName}
          borderless={borderlessSections}
          onDragStart={(payload) => {
            setDragPayload(payload);
            setInvalidRole(null);
            setInvalidMessage("");
          }}
          onDragEnd={() => {
            setDragPayload(null);
            setInvalidRole(null);
            setInvalidMessage("");
          }}
        />
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "grid h-full min-h-0 min-w-0 grid-cols-1 gap-3 max-[640px]:gap-2",
        showVariableList ? (listAtEnd ? "sm:grid-cols-[2fr_1fr]" : "sm:grid-cols-[1fr_2fr]") : "sm:grid-cols-1"
      )}
    >
      {/* Stacked on a narrow screen the list belongs on top either way, so the ordering
          only applies from `sm` up — where there are two columns to choose between. */}
      {listAtEnd ? null : variableList}

      <div
        className={cn(
          "flex h-full min-h-0 flex-col gap-3 sm:grid sm:transition-all sm:duration-300",
          listAtEnd ? "sm:order-1" : "sm:order-2"
        )}
        style={{
          gridTemplateColumns: hasOptions ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr) 0px",
          columnGap: hasOptions ? "0.75rem" : "0"
        }}
      >
        <div
          className={cn(
            "flex min-h-0 select-none flex-col rounded-xl bg-white p-4 shadow-sm max-[640px]:p-2",
            borderlessSections ? "" : "border border-slate-200"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t("roleAssignment")}</span>
            <div className="flex items-center gap-1">
              {onResetAssignments ? (() => {
                const hasAssignments = analysisDef.roles.some(
                  (role) => (assignments[role.key] ?? []).length > 0
                );
                return (
                  <button
                    type="button"
                    onClick={onResetAssignments}
                    disabled={!hasAssignments}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    aria-label={t("resetAssignments", { defaultValue: "Reset variable assignments" })}
                    title={t("resetAssignments", { defaultValue: "Reset variable assignments" })}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                );
              })() : null}
              {showManualRunAction ? (
                <button
                  type="button"
                  onClick={onManualRunAction}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                  aria-label={t("runAnalysis")}
                  title={t("runAnalysis")}
                >
                  <Play className="h-3.5 w-3.5 animate-pulse" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-fr gap-2 max-[768px]:flex-none max-[768px]:auto-rows-auto">
            {analysisDef.roles.map((role) => {
              const activeError = invalidRole === role.key ? invalidMessage : "";
              return (
                <Tooltip.Root key={role.key} open={Boolean(activeError)}>
                  <Tooltip.Trigger asChild>
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        const payload = resolveDragPayload(event);
                        if (!payload) {
                          setInvalidRole(null);
                          setInvalidMessage("");
                          return;
                        }
                        const variable = payload.variableName ? variableByName.get(payload.variableName) : null;
                        if (!variable) {
                          setInvalidRole(null);
                          setInvalidMessage("");
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
                        const payload = resolveDragPayload(event);
                        if (!payload || !payload.variableName) {
                          return;
                        }
                        // 한 개만 받는 역할에 여러 개를 떨어뜨리면 뒤의 것이 앞의 것을
                        // 밀어내 「마지막 변수」만 남는다. 그 칸에는 사용자가 실제로 집은
                        // 변수를 넣는다.
                        const names =
                          role.multi && payload.variableNames && payload.variableNames.length > 0
                            ? payload.variableNames
                            : [payload.variableName];
                        names.forEach((name) => {
                          if (!variableByName.has(name)) {
                            return;
                          }
                          onAssign(name, role.key);
                        });
                        setDragPayload(null);
                        setInvalidRole(null);
                        setInvalidMessage("");
                      }}
                      onClick={() => {
                        if (selectedAvailable) {
                          onAssign(selectedAvailable, role.key);
                        }
                      }}
                      className={cn(
                        "flex h-full min-h-0 flex-col rounded-lg border p-2 transition max-[768px]:h-auto",
                        activeError ? "border-red-500 bg-red-50" : "border-slate-200"
                      )}
                    >
                      <div className="min-h-0 flex-1 overflow-auto rounded border border-dashed border-slate-200 p-1 max-[768px]:min-h-[2.25rem] max-[768px]:flex-none max-[768px]:overflow-visible">
                        {assignments[role.key].length === 0 ? (
                          <div className="px-2 py-3 text-xs text-slate-500">{t(`roles.${role.key}`, { defaultValue: role.label })}</div>
                        ) : (
                          <ul className="space-y-1">
                            {assignments[role.key].map((name) => {
                              const variable = variableByName.get(name);
                              return (
                                <li
                                  key={name}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectAssigned(role.key, name);
                                  }}
                                  className={cn(
                                    "group flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm",
                                    selectedAssigned[role.key] === name ? "ring-2 ring-sky-500 border-sky-500" : "hover:border-slate-300 hover:shadow-md"
                                  )}
                                >
                                  {variable ? <RoleTag type={variable.type} /> : null}
                                  <span className="truncate text-sm font-medium text-slate-700">{name}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemove(role.key, name);
                                    }}
                                    className="ml-auto rounded p-1 text-slate-400 opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                                    aria-label={t("removeVariableAria", { name })}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
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

        <div
          className={cn(
            "min-h-0 overflow-hidden transition-all duration-300",
            hasOptions ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
          )}
        >
          {hasOptions ? (
            <AnalysisOptionsPanel
              analysisType={analysisType}
              options={options}
              onOptionsChange={onOptionsChange}
              groupCandidates={groupCandidates}
              borderless={borderlessSections}
            />
          ) : null}
        </div>
      </div>

      {listAtEnd ? variableList : null}
    </div>
  );
}
