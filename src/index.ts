export {
  StatsWorkbench,
  type AnalysisKind,
  type AnalysisPayload,
  type AnalysisResult,
  type ExternalDataInput,
  type RunState,
  type StatsWorkbenchControl,
  type StatsWorkbenchProps,
  type SupportedLanguage,
  type VariableDragItem
} from "./stats-workbench";

export { SharedVariableList, type SharedVariableListProps } from "./stats-workbench/ui/shared-variable-list";
export { SharedDatasetPopover, type SharedDatasetPopoverProps } from "./stats-workbench/ui/shared-dataset-popover";

export { VARIABLE_DRAG_DATA_FORMAT } from "./stats-workbench/types";

/**
 * Turn an analysis result into APA-styled HTML tables.
 *
 * The workbench uses this for "copy as APA table". A host that keeps a report
 * of its own needs the same HTML -- otherwise it has to re-derive the table
 * shapes from the raw payload and the two drift apart.
 */
export { buildApaClipboardHtml, buildTableData, type TableData } from "./stats-workbench/result-utils";
