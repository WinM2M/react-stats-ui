import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
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
    tooltipByName
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
    const multiNames = selectedNameSet.has(variable.name)
      ? variables.map((entry) => entry.name).filter((name) => selectedNameSet.has(name))
      : [variable.name];
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
            {variables.map((variable, index) => (
              <li
                key={variable.name}
                draggable
                onDragStart={(event) => handleDragStart(event, variable)}
                onDragEnd={handleDragEnd}
                onClick={(event) => handleItemClick(event, variable.name, index)}
                onDoubleClick={() => onDoubleClick?.(variable.name)}
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch" && event.pointerType !== "pen") {
                    return;
                  }
                  const now = Date.now();
                  const lastTap = lastTouchTapRef.current;
                  if (lastTap && lastTap.name === variable.name && now - lastTap.at < 320) {
                    onDoubleClick?.(variable.name);
                    lastTouchTapRef.current = null;
                    return;
                  }
                  lastTouchTapRef.current = { name: variable.name, at: now };
                }}
              >
                  <VariableCard
                    name={variable.name}
                    type={variable.type}
                    density={density}
                    tooltip={tooltipByName?.(variable.name)}
                    isSelected={selectedNameSet.has(variable.name)}
                    isDragging={draggingName === variable.name}
                    isDerived={derivedNames?.has(variable.name)}
                    onClick={undefined}
                    onDoubleClick={() => onDoubleClick?.(variable.name)}
                    onDelete={onDeleteVariable ? () => onDeleteVariable(variable.name) : undefined}
                  />
                  {secondaryLabelByName?.[variable.name] ? (
                    <div className="mt-1 px-2 text-[11px] text-slate-500" title={secondaryLabelByName[variable.name]}>
                      <span className="block truncate">{secondaryLabelByName[variable.name]}</span>
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
});
