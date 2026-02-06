import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  FileDropItem,
  Selection,
  SortDescriptor,
} from "react-aria-components";
import {
  Button,
  Cell,
  Column,
  DropZone,
  Row,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import type { BROData, BROFileType } from "~/types/bro-data";
import { getFinalDepth } from "~/types/bro-data";

interface SortIndicatorProps {
  column: string;
  sortDescriptor: SortDescriptor;
}

function SortIndicator({ column, sortDescriptor }: SortIndicatorProps) {
  const isActive = sortDescriptor.column === column;

  const Icon =
    sortDescriptor.direction === "ascending" ? ChevronUpIcon : ChevronDownIcon;

  return (
    <Icon size={14} className={`inline ml-1 ${isActive ? "" : "opacity-0"}`} />
  );
}

type QualityRegime = 'IMBRO' | 'IMBRO/A';

interface FileRow {
  id: string;
  filename: string;
  reportDate: string | null;
  type: BROFileType;
  finalDepth: number | null;
  qualityRegime: QualityRegime;
}

interface FileTableProps {
  broData: Record<string, BROData>;
  selectedFileName: string;
  onSelectionChange: (filename: string) => void;
  onFileDrop: (files: Array<File>) => void;
  onFileRemove: (filename: string) => void;
}

export function FileTable({
  broData,
  selectedFileName,
  onSelectionChange,
  onFileDrop,
  onFileRemove,
}: FileTableProps) {
  const { t } = useTranslation();
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "filename",
    direction: "ascending",
  });

  const rows: Array<FileRow> = useMemo(() => {
    return Object.entries(broData).map(([filename, data]) => {
      const reportDate = data.research_report_date;
      const finalDepth = getFinalDepth(data);
      const qualityRegime = data.quality_regime ?? "IMBRO/A";

      return {
        id: filename,
        filename,
        reportDate: reportDate?.toISOString().split("T")[0] ?? null,
        type: data.meta.dataType,
        qualityRegime,
        finalDepth,
      };
    });
  }, [broData]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].toSorted((a, b) => {
      const column = sortDescriptor.column as keyof FileRow;
      const aValue = a[column];
      const bValue = b[column];

      // Handle null values
      if (aValue === null && bValue === null) {
        return 0;
      }
      if (aValue === null) {
        return 1;
      }
      if (bValue === null) {
        return -1;
      }

      const compare =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue));

      return sortDescriptor.direction === "descending" ? -compare : compare;
    });
    return sorted;
  }, [rows, sortDescriptor]);

  const selectedKeys: Selection = useMemo(() => {
    return selectedFileName ? new Set([selectedFileName]) : new Set();
  }, [selectedFileName]);

  const handleSelectionChange = (keys: Selection) => {
    if (keys === "all") {
      return;
    }
    const selected = [...keys][0];
    if (typeof selected === "string") {
      onSelectionChange(selected);
    }
  };

  const handleDrop = async (event: { items: ReadonlyArray<{ kind: string }> }) => {
    const fileItems = event.items.filter(
      (item): item is FileDropItem => item.kind === "file",
    );
    const files = await Promise.all(fileItems.map((item) => item.getFile()));
    onFileDrop(files);
  };

  return (
    <DropZone
      onDrop={(event) => {
        handleDrop(event).catch((error: unknown) => {
          console.error(error);
        });
      }}
      className="file-table-dropzone"
    >
      <Table
        aria-label="Files"
        selectionMode="single"
        selectionBehavior="toggle"
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        className="max-h-[800px] w-full"
      >
        <TableHeader className="file-table-header">
          <Column
            id="filename"
            isRowHeader
            allowsSorting
            className="file-table-column"
          >
            {t("filename")}
            <SortIndicator column="filename" sortDescriptor={sortDescriptor} />
          </Column>

          <Column id="reportDate" allowsSorting className="file-table-column">
            {t("reportDate")}
            <SortIndicator
              column="reportDate"
              sortDescriptor={sortDescriptor}
            />
          </Column>

          <Column id="type" allowsSorting className="file-table-column">
            Type
            <SortIndicator column="type" sortDescriptor={sortDescriptor} />
          </Column>

          <Column id="finalDepth" allowsSorting className="file-table-column">
            {t("depthM_table")}
            <SortIndicator
              column="finalDepth"
              sortDescriptor={sortDescriptor}
            />
          </Column>

          <Column
            id="qualityRegime"
            allowsSorting
            className="file-table-column"
          >
            {t("qualityRegime")}
            <SortIndicator
              column="qualityRegime"
              sortDescriptor={sortDescriptor}
            />
          </Column>

          <Column id="remove" className="file-table-column w-10">
            {/* Empty header for remove column */}
          </Column>
        </TableHeader>

        <TableBody
          items={sortedRows}
          renderEmptyState={() => (
            <div className="py-8 text-center text-gray-500">
              {t("dropFilesHere")}
            </div>
          )}
        >
          {(row) => (
            <Row id={row.id} className="file-table-row">
              <Cell className="file-table-cell">{row.filename}</Cell>

              <Cell className="file-table-cell">{row.reportDate ?? "-"}</Cell>

              <Cell className="file-table-cell">
                <TypeBadge type={row.type} />
              </Cell>

              <Cell
                className="file-table-cell"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {row.finalDepth?.toFixed(2) ?? "-"}
              </Cell>

              <Cell className="file-table-cell">{row.qualityRegime}</Cell>

              <Cell className="file-table-cell">
                <Button
                  onPress={() => {
                    onFileRemove(row.filename);
                  }}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                  aria-label={t("removeFile")}
                >
                  <XIcon size={14} />
                </Button>
              </Cell>
            </Row>
          )}
        </TableBody>
      </Table>
    </DropZone>
  );
}

const badgeClassNames: Record<BROFileType, string> = {
  "BHR-GT": "bg-orange-300 text-orange-800",
  "BHR-G": "bg-green-300 text-green-800",
  CPT: "bg-blue-300 text-blue-800",
};

const TypeBadge = ({ type }: { type: BROFileType }) => (
  <div className={`p-0.5 rounded-sm w-fit text-xs ${badgeClassNames[type]}`}>
    {type}
  </div>
);
