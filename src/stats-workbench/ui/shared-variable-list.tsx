import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ChevronRight, X } from "lucide-react";
import { cn } from "../utils";
import { RoleTag } from "./role-tag";
import type { VariableDragItem, VariableMeta } from "../types";
import { VARIABLE_DRAG_DATA_FORMAT } from "../types";

type VariableType = VariableMeta["type"];

export type WorkbenchDensity = "comfortable" | "compact";

type VariableCardProps = {
  name: string;
  type: VariableType;
  density?: WorkbenchDensity;
  /** 마우스를 올렸을 때 보일 설명. 호스트가 준다(원 문항 등). */
  tooltip?: string;
  isSelected?: boolean;
  isDragging?: boolean;
  isDerived?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
};

const VariableCard = ({
  name,
  type,
  density = "comfortable",
  tooltip,
  isSelected,
  isDragging,
  isDerived,
  onClick,
  onDoubleClick,
  onDelete
}: VariableCardProps) => {
  const card = (
  <div
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    // 브라우저 기본 풍선도 남겨 둔다 -- 아래 Radix 풍선이 뜨지 않는 상황
    // (터치 기기, 포털이 막힌 곳)에서 마지막으로 남는 길이다.
    title={tooltip ?? name}
    className={cn(
      "flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white text-left shadow-sm transition",
      density === "compact" ? "px-2 py-1" : "px-3 py-2",
      isSelected ? "ring-2 ring-sky-500 border-sky-500" : "hover:border-slate-300 hover:shadow-md",
      isDragging && "opacity-50"
    )}
  >
    <RoleTag type={type} />
    <span
      className={cn(
        "truncate font-medium text-slate-700",
        density === "compact" ? "text-xs" : "text-sm"
      )}
    >
      {name}
    </span>
    {isDerived && onDelete ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-100 hover:text-red-500"
        aria-label={`Delete ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    ) : null}
  </div>
  );

  // 올려 보면 **바로** 보여야 한다. 브라우저 기본 풍선은 1~2초를 기다려야 떠서,
  // 있는 줄도 모르고 지나간다. 포털로 띄우므로 스크롤 칸에 잘리지도 않는다.
  if (!tooltip || tooltip === name) return card;
  return (
    // 이 목록은 워크벤치 밖에서도 쓰인다. Radix 는 Provider 없이 Root 를 만나면
    // 던지므로 여기서 하나 두른다 -- 중첩은 허용된다.
    <Tooltip.Provider delayDuration={80}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{card}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-xs rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
        >
          {tooltip}
          <Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export type SharedVariableListProps = {
  variables: VariableMeta[];
  heading?: React.ReactNode;
  emptyLabel?: React.ReactNode;
  selectedName?: string | null;
  selectedNames?: string[];
  onSelectionChange?: (names: string[]) => void;
  onSelect?: (name: string) => void;
  onDoubleClick?: (name: string) => void;
  datasetId?: string | null;
  datasetName?: string | null;
  className?: string;
  contentClassName?: string;
  borderless?: boolean;
  onDragStart?: (payload: VariableDragItem) => void;
  onDragEnd?: () => void;
  derivedNames?: Set<string>;
  onDeleteVariable?: (name: string) => void;
  secondaryLabelByName?: Record<string, string>;
  /** 글자 크기와 여백. `compact` 는 한 화면에 더 많이 담는다. */
  density?: WorkbenchDensity;
  /** 변수마다 마우스를 올렸을 때 보일 설명. 없으면 변수 이름이 그대로 뜬다. */
  tooltipByName?: (name: string) => string | undefined;
  /**
   * 끌기 직전에 고른 변수 목록을 **넓힐 기회**.
   *
   * 다중응답 문항은 보기마다 변수가 하나씩 생긴다. 사람에게는 문항 하나인데
   * 화면에서는 여섯 줄이라, 하나를 집으면 나머지도 따라와야 한다. 어느 변수가
   * 한 문항에서 나왔는지는 설문을 들고 있는 호스트만 안다.
   */
  expandSelection?: (names: string[]) => string[];
  /**
   * 한 줄로 묶어 보일 변수 꾸러미.
   *
   * 다중응답 문항은 보기마다 변수가 하나씩 생겨, 보기 일곱 개짜리 문항 하나가
   * 목록에서 일곱 줄을 차지한다. 설문에 그런 문항이 몇 개만 있어도 목록이
   * 문항이 아니라 보기로 채워진다. 꾸러미는 한 줄로 서고, 펼치면 낱개가 보인다.
   *
   * 멤버는 이 목록에 **있는 이름만** 쓴다. 역할 칸으로 옮겨 간 변수는 목록에서
   * 빠지므로, 남은 것만으로 꾸러미를 다시 세운다.
   */
  variableGroups?: Array<{ id: string; label: string; members: string[] }>;
};

export const SharedVariableList = React.forwardRef<HTMLDivElement, SharedVariableListProps>(function SharedVariableList(
  {
    variables,
    heading,
    emptyLabel = null,
    selectedName = null,
    selectedNames,
    onSelectionChange,
    onSelect,
    onDoubleClick,
    datasetId,
    datasetName,
    className,
    contentClassName,
    borderless = false,
    onDragStart,
    onDragEnd,
    derivedNames,
    onDeleteVariable,
    secondaryLabelByName,
    density = "comfortable",
    tooltipByName,
    expandSelection,
    variableGroups
  },
  ref
) {
  const [draggingName, setDraggingName] = React.useState<string | null>(null);
  const lastTouchTapRef = React.useRef<{ name: string; at: number } | null>(null);
  const anchorIndexRef = React.useRef<number | null>(null);

  const selectedNameSet = React.useMemo(() => {
    if (selectedNames && selectedNames.length > 0) {
      return new Set(selectedNames);
    }
    return selectedName ? new Set([selectedName]) : new Set<string>();
  }, [selectedName, selectedNames]);

  const handleDragStart = (event: React.DragEvent, variable: VariableMeta) => {
    const picked = selectedNameSet.has(variable.name)
      ? variables.map((entry) => entry.name).filter((name) => selectedNameSet.has(name))
      : [variable.name];
    // 넓힌 결과에서 이 목록에 없는 이름은 버린다 -- 호스트가 설문을 보고
    // 답하므로, 이 화면에 올라오지 않은 변수를 집어 줄 수 있다.
    const expanded = expandSelection?.(picked) ?? picked;
    const known = new Set(variables.map((entry) => entry.name));
    const multiNames = expanded.filter((name) => known.has(name));
    if (multiNames.length === 0) multiNames.push(variable.name);
    const payload: VariableDragItem = {
      variableName: variable.name,
      variableNames: multiNames,
      variableType: variable.type,
      datasetId: datasetId ?? null,
      datasetName: datasetName ?? null,
      source: "stats-workbench"
    };

    try {
      event.dataTransfer?.setData(VARIABLE_DRAG_DATA_FORMAT, JSON.stringify(payload));
      event.dataTransfer?.setData("text/plain", variable.name);
    } catch {
      // Ignore dataTransfer errors (e.g., SSR or unsupported environments)
    }

    onDragStart?.(payload);
    setDraggingName(variable.name);
  };

  const handleItemClick = React.useCallback(
    (event: React.MouseEvent, variableName: string, index: number) => {
      const supportsMultiSelection = typeof onSelectionChange === "function";
      if (!supportsMultiSelection) {
        onSelect?.(variableName);
        anchorIndexRef.current = index;
        return;
      }

      const current = selectedNames ?? [];
      const isRangeSelect = event.shiftKey;
      const isToggleSelect = event.metaKey || event.ctrlKey;
      let next: string[] = [];

      if (isRangeSelect && variables.length > 0) {
        const fallbackAnchor = anchorIndexRef.current ?? variables.findIndex((item) => item.name === (current[0] ?? ""));
        const anchor = fallbackAnchor >= 0 ? fallbackAnchor : index;
        const [start, end] = anchor <= index ? [anchor, index] : [index, anchor];
        const range = variables.slice(start, end + 1).map((item) => item.name);
        if (isToggleSelect) {
          next = Array.from(new Set([...current, ...range]));
        } else {
          next = range;
        }
      } else if (isToggleSelect) {
        next = current.includes(variableName)
          ? current.filter((name) => name !== variableName)
          : [...current, variableName];
      } else {
        next = [variableName];
      }

      anchorIndexRef.current = index;
      onSelectionChange(next);
      onSelect?.(variableName);
    },
    [onSelect, onSelectionChange, selectedNames, variables]
  );

  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());

  /**
   * 목록에 실제로 설 줄들.
   *
   * 꾸러미는 **첫 멤버 자리**에 한 줄로 선다. 변수 순서가 곧 설문 문항 순서라,
   * 꾸러미를 맨 아래로 몰면 문항 차례가 흐트러진다.
   */
  const rows = React.useMemo(() => {
    const present = new Set(variables.map((entry) => entry.name));
    const groupOf = new Map<string, { id: string; label: string; members: string[] }>();
    for (const group of variableGroups ?? []) {
      const members = group.members.filter((name) => present.has(name));
      // 하나만 남았으면 꾸러미로 묶을 것이 없다 -- 그냥 그 변수다.
      if (members.length < 2) continue;
      const resolved = { ...group, members };
      for (const name of members) groupOf.set(name, resolved);
    }

    const out: Array<
      | { kind: "variable"; variable: VariableMeta; index: number }
      | { kind: "group"; group: { id: string; label: string; members: string[] } }
    > = [];
    const seen = new Set<string>();
    variables.forEach((variable, index) => {
      const group = groupOf.get(variable.name);
      if (!group) {
        out.push({ kind: "variable", variable, index });
        return;
      }
      if (seen.has(group.id)) return;
      seen.add(group.id);
      out.push({ kind: "group", group });
    });
    return out;
  }, [variableGroups, variables]);

  const variableByName = React.useMemo(
    () => new Map(variables.map((entry) => [entry.name, entry])),
    [variables]
  );

  const handleGroupDragStart = (
    event: React.DragEvent,
    group: { id: string; label: string; members: string[] }
  ) => {
    const first = variableByName.get(group.members[0]);
    const payload: VariableDragItem = {
      variableName: group.members[0],
      variableNames: group.members,
      groupId: group.id,
      variableType: first?.type,
      datasetId: datasetId ?? null,
      datasetName: datasetName ?? null,
      source: "stats-workbench"
    };
    try {
      event.dataTransfer?.setData(VARIABLE_DRAG_DATA_FORMAT, JSON.stringify(payload));
      event.dataTransfer?.setData("text/plain", group.members.join(", "));
    } catch {
      // Ignore dataTransfer errors (e.g., SSR or unsupported environments)
    }
    onDragStart?.(payload);
    setDraggingName(group.members[0]);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
    setDraggingName(null);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 select-none flex-col rounded-xl bg-white shadow-sm max-[640px]:p-2",
        density === "compact" ? "p-2" : "p-4",
        borderless ? "" : "border border-slate-200",
        className
      )}
    >
      {heading ? (
        <div className={cn("mb-2 font-semibold", density === "compact" ? "text-xs" : "text-sm")}>
          {heading}
        </div>
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200", contentClassName)}>
        {variables.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">{emptyLabel}</div>
        ) : (
          <ul className={cn(density === "compact" ? "space-y-1 p-1" : "space-y-2 p-2")}>
            {rows.map((row) =>
              row.kind === "group" ? (
                <li key={`group:${row.group.id}`}>
                  <div
                    draggable
                    onDragStart={(event) => handleGroupDragStart(event, row.group)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectionChange?.(row.group.members)}
                    title={row.group.label}
                    className={cn(
                      "flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white text-left shadow-sm transition",
                      density === "compact" ? "px-2 py-1" : "px-3 py-2",
                      row.group.members.every((name) => selectedNameSet.has(name))
                        ? "ring-2 ring-sky-500 border-sky-500"
                        : "hover:border-slate-300 hover:shadow-md"
                    )}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.group.id)) next.delete(row.group.id);
                          else next.add(row.group.id);
                          return next;
                        });
                      }}
                      aria-expanded={expandedGroups.has(row.group.id)}
                      aria-label={row.group.label}
                      className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          expandedGroups.has(row.group.id) && "rotate-90"
                        )}
                      />
                    </button>
                    <span
                      className={cn(
                        "truncate font-medium text-slate-700",
                        density === "compact" ? "text-xs" : "text-sm"
                      )}
                    >
                      {row.group.label}
                    </span>
                    {/* 보기가 몇 개인지. 한 줄로 접힌 만큼 수는 보여야 한다. */}
                    <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
                      {row.group.members.length}
                    </span>
                  </div>
                  {expandedGroups.has(row.group.id) ? (
                    <ul className={cn("mt-1 border-l border-slate-200 pl-2", density === "compact" ? "space-y-1" : "space-y-2")}>
                      {row.group.members.map((name) => {
                        const member = variableByName.get(name);
                        if (!member) return null;
                        const memberIndex = variables.findIndex((entry) => entry.name === name);
                        return (
                          <li
                            key={name}
                            draggable
                            onDragStart={(event) => handleDragStart(event, member)}
                            onDragEnd={handleDragEnd}
                            onClick={(event) => handleItemClick(event, name, memberIndex)}
                            onDoubleClick={() => onDoubleClick?.(name)}
                          >
                            <VariableCard
                              name={name}
                              type={member.type}
                              density={density}
                              tooltip={tooltipByName?.(name)}
                              isSelected={selectedNameSet.has(name)}
                              isDragging={draggingName === name}
                              isDerived={derivedNames?.has(name)}
                              onDoubleClick={() => onDoubleClick?.(name)}
                              onDelete={onDeleteVariable ? () => onDeleteVariable(name) : undefined}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              ) : (
              <li
                key={row.variable.name}
                draggable
                onDragStart={(event) => handleDragStart(event, row.variable)}
                onDragEnd={handleDragEnd}
                onClick={(event) => handleItemClick(event, row.variable.name, row.index)}
                onDoubleClick={() => onDoubleClick?.(row.variable.name)}
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch" && event.pointerType !== "pen") {
                    return;
                  }
                  const now = Date.now();
                  const lastTap = lastTouchTapRef.current;
                  if (lastTap && lastTap.name === row.variable.name && now - lastTap.at < 320) {
                    onDoubleClick?.(row.variable.name);
                    lastTouchTapRef.current = null;
                    return;
                  }
                  lastTouchTapRef.current = { name: row.variable.name, at: now };
                }}
              >
                  <VariableCard
                    name={row.variable.name}
                    type={row.variable.type}
                    density={density}
                    tooltip={tooltipByName?.(row.variable.name)}
                    isSelected={selectedNameSet.has(row.variable.name)}
                    isDragging={draggingName === row.variable.name}
                    isDerived={derivedNames?.has(row.variable.name)}
                    onClick={undefined}
                    onDoubleClick={() => onDoubleClick?.(row.variable.name)}
                    onDelete={onDeleteVariable ? () => onDeleteVariable(row.variable.name) : undefined}
                  />
                  {secondaryLabelByName?.[row.variable.name] ? (
                    <div className="mt-1 px-2 text-[11px] text-slate-500" title={secondaryLabelByName[row.variable.name]}>
                      <span className="block truncate">{secondaryLabelByName[row.variable.name]}</span>
                    </div>
                  ) : null}
                </li>
              )
              )}
          </ul>
        )}
      </div>
    </div>
  );
});
