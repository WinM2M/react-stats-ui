import * as React from "react";
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
  onClick?: () => void;
  onDoubleClick?: () => void;
};

const VariableCard = ({ name, type, isSelected, isDragging, onClick, onDoubleClick }: VariableCardProps) => (
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
  </div>
);

export type SharedVariableListProps = {
  variables: VariableMeta[];
  heading?: React.ReactNode;
  emptyLabel?: React.ReactNode;
  selectedName?: string | null;
  onSelect?: (name: string) => void;
  onDoubleClick?: (name: string) => void;
  datasetId?: string | null;
  datasetName?: string | null;
  className?: string;
  contentClassName?: string;
  borderless?: boolean;
  onDragStart?: (payload: VariableDragItem) => void;
  onDragEnd?: () => void;
};

export const SharedVariableList = React.forwardRef<HTMLDivElement, SharedVariableListProps>(function SharedVariableList(
  {
    variables,
    heading,
    emptyLabel = null,
    selectedName = null,
    onSelect,
    onDoubleClick,
    datasetId,
    datasetName,
    className,
    contentClassName,
    borderless = false,
    onDragStart,
    onDragEnd
  },
  ref
) {
  const [draggingName, setDraggingName] = React.useState<string | null>(null);
  const lastTouchTapRef = React.useRef<{ name: string; at: number } | null>(null);

  const handleDragStart = (event: React.DragEvent, variable: VariableMeta) => {
    const payload: VariableDragItem = {
      variableName: variable.name,
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
            {variables.map((variable) => (
              <li
                key={variable.name}
                draggable
                onDragStart={(event) => handleDragStart(event, variable)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelect?.(variable.name)}
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
                  isSelected={selectedName === variable.name}
                  isDragging={draggingName === variable.name}
                  onClick={() => onSelect?.(variable.name)}
                  onDoubleClick={() => onDoubleClick?.(variable.name)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
