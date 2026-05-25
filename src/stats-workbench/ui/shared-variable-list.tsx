import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../utils";
import { RoleTag } from "./role-tag";
import type { VariableDragItem, VariableMeta } from "../types";
import { VARIABLE_DRAG_DATA_FORMAT } from "../types";

type VariableType = VariableMeta["type"];

type VariableCardProps = {
  name: string;
  type: VariableType;
  isSelected?: boolean;
  isDragging?: boolean;
  isDerived?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
};

const VariableCard = ({ name, type, isSelected, isDragging, isDerived, onClick, onDoubleClick, onDelete }: VariableCardProps) => (
  <div
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className={cn(
      "flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition",
      isSelected ? "ring-2 ring-sky-500 border-sky-500" : "hover:border-slate-300 hover:shadow-md",
      isDragging && "opacity-50"
    )}
  >
    <RoleTag type={type} />
    <span className="truncate text-sm font-medium text-slate-700">{name}</span>
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
    secondaryLabelByName
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
        "flex min-h-0 select-none flex-col rounded-xl bg-white p-4 shadow-sm max-[640px]:p-2",
        borderless ? "" : "border border-slate-200",
        className
      )}
    >
      {heading ? <div className="mb-2 text-sm font-semibold">{heading}</div> : null}
      <div className={cn("min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200", contentClassName)}>
        {variables.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">{emptyLabel}</div>
        ) : (
          <ul className="space-y-2 p-2">
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
