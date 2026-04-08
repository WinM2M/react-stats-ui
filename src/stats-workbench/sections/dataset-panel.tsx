import { useTranslation } from "react-i18next";
import type { Dataset } from "../types";
import { SharedDatasetPopover } from "../ui/shared-dataset-popover";

type DatasetPanelProps = {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  selectedDatasetName: string;
  borderlessButton?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
  onDropFile: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function DatasetPanel(props: DatasetPanelProps) {
  const { t } = useTranslation();
  return (
    <SharedDatasetPopover
      datasets={props.datasets}
      selectedDatasetId={props.selectedDatasetId}
      selectedDatasetName={props.selectedDatasetName}
      borderlessButton={props.borderlessButton}
      onSelect={props.onSelect}
      onDelete={props.onDelete}
      onUploadClick={props.onUploadClick}
      onDropFile={props.onDropFile}
      fileInputRef={props.fileInputRef}
      onFileInput={props.onFileInput}
      autoOpenWhenEmpty
      labels={{
        title: t("datasets"),
        importButton: t("importXlsx"),
        dropHint: t("dropDatasetFile"),
        deleteAria: (name) => t("deleteDatasetAria", { name })
      }}
    />
  );
}
