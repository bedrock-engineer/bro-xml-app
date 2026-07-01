import type { BHRGTLayer } from "@bedrock-engineer/bro-xml-parser";
import { max, min } from "d3-array";
import { useTranslation } from "react-i18next";
import {
  sandMedianRange
} from "../util/grain-size";
import { makeDepthToPixel } from "../util/plot-config";
import {
  getLayerAttributes,
  LAYER_ATTRIBUTE_KEYS,
  type TranslateFunction,
} from "./bhr-gt-plot-render";
import { GrainAxis, GrainCell } from "./grain-cell";

/** Height of the table's header band. The chart reserves a matching spacer
 *  above its (flush) plot frame so the bodies line up on the same depths. */
export const DETAILS_HEADER_HEIGHT = 30;

/** Minimum row height for the uniform "rows" layout (fits the stacked
 *  upper/lower depth labels plus padding). */
const ROW_MIN_HEIGHT = 28;

/**
 * Body layout:
 * - "scaled": rows positioned + sized on the chart's depth scale so they line
 *   up with the SVG bands (thin layers collapse to a few px).
 * - "rows": uniform-height rows in normal flow, decoupled from the chart, so
 *   thin/intermittent layers stay legible. The depth column then shows the full
 *   upper–lower interval since row height no longer encodes thickness.
 */
export type DetailsTableLayout = "scaled" | "rows";

interface BhrgtDetailsTableProps {
  layers: Array<BHRGTLayer>;
  /** Must match the height passed to buildBhrgtPlot so rows align with the SVG. */
  height: number;
  /** Surface elevation (m NAP); enables the NAP depth labels when napMode is on. */
  surfaceNap?: number | null;
  /** Show depths as m NAP elevation rather than m below surface. */
  napMode?: boolean;
  /** Body layout: depth-scaled (aligned to chart) or uniform rows. */
  layout?: DetailsTableLayout;
}

// Fixed left columns (depth + soil name) followed by one column per present
// property. Widths are explicit px so the header and every depth-positioned
// row share the same template and their columns line up.
const DEPTH_COL = 44;
const SOIL_COL = 96;
const PROP_COL = 84;
// The sand-median column is a grain-size sparkline, so it needs more room.
export const GRAIN_COL = 120;

/** The one property column rendered as a chart rather than text. */
const GRAIN_KEY = "sandMedian";


function columnWidth(key: string): number {
  return key === GRAIN_KEY ? GRAIN_COL : PROP_COL;
}

/**
 * Per-layer secondary attributes as a depth-aligned HTML table beside the SVG
 * bore plot. The body rows are positioned on the chart's y scale (via
 * makeDepthToPixel with a flush, zero top margin) so they line up with the
 * chart's bands; the column headers sit in a fixed band above. Columns are the
 * secondary properties actually present; the sand-median column is a grain-size
 * sparkline (a dot per layer on a shared log µm axis), the rest are truncating
 * text cells.
 */
export function BhrgtDetailsTable({
  layers,
  height,
  surfaceNap,
  napMode,
  layout = "scaled",
}: BhrgtDetailsTableProps) {
  const { t } = useTranslation();
  const translate = t as TranslateFunction;

  if (layers.length === 0) {
    return null;
  }

  const minDepth = min(layers, (l) => l.upperBoundary) ?? 0;
  const maxDepth = max(layers, (l) => l.lowerBoundary) ?? 0;
  const toPixel = makeDepthToPixel(height, minDepth, maxDepth, 0);

  const useNap = napMode === true && surfaceNap != null;
  const formatDepth = (depth: number): string =>
    useNap ? (surfaceNap - depth).toFixed(2) : depth.toFixed(2);

  // Pivot: value-by-key per layer, plus the set of columns actually present.
  const rows = layers.map((layer) => {
    const byKey = new Map<string, string>();
    for (const { key, value } of getLayerAttributes(layer, translate)) {
      byKey.set(key, value);
    }
    return { layer, byKey };
  });
  
  const present = new Set(rows.flatMap(({ byKey }) => [...byKey.keys()]));
  const columns = LAYER_ATTRIBUTE_KEYS.filter((key) => present.has(key));

  const gridTemplateColumns = `${DEPTH_COL}px ${SOIL_COL}px ${columns
    .map((key) => `${columnWidth(key)}px`)
    .join(" ")}`;

  const width =
    DEPTH_COL +
    SOIL_COL +
    columns.reduce((sum, key) => sum + columnWidth(key), 0);

  return (
    <div
      className="shrink-0"
      style={{ width }}
      role="table"
      aria-label={translate("layerDetails")}
    >
      {/* Column headers — a fixed band above the (flush) body. */}
      <div
        className="grid items-end divide-x divide-gray-200 border-b border-gray-300 pb-0.5 text-[10px] font-semibold text-gray-500"
        style={{ height: DETAILS_HEADER_HEIGHT, gridTemplateColumns }}
        role="row"
      >
        <span className="px-1" role="columnheader">
          {useNap ? "m NAP" : "m -mv"}
        </span>

        <span
          className="truncate px-1"
          title={translate("soilTypes")}
          role="columnheader"
        >
          {translate("soilTypes")}
        </span>

        {columns.map((key) =>
          key === GRAIN_KEY ? (
            <div key={key} role="columnheader">
              <GrainAxis
                height={DETAILS_HEADER_HEIGHT}
                label={`${translate("sandMedian")} (µm)`}
              />
            </div>
          ) : (
            <span
              key={key}
              className="px-1 leading-tight"
              title={translate(key)}
              role="columnheader"
            >
              {translate(key)}
            </span>
          ),
        )}
      </div>

      {layout === "rows" ? (
        /* Uniform-row body: normal flow, decoupled from the chart. Each row
           shows its full upper–lower interval so thin layers stay legible. */
        <div role="rowgroup">
          {rows.map(({ layer, byKey }) => (
            <div
              key={`${layer.upperBoundary}-${layer.lowerBoundary}`}
              className="grid items-stretch divide-x divide-gray-200 border-t border-gray-200 text-[11px] leading-tight"
              style={{ gridTemplateColumns, minHeight: ROW_MIN_HEIGHT }}
              role="row"
            >
              <span
                className="flex flex-col justify-center px-1 font-mono text-[10px] text-gray-400"
                role="cell"
              >
                <span>{formatDepth(layer.upperBoundary)}</span>
                <span className="text-gray-300">
                  {formatDepth(layer.lowerBoundary)}
                </span>
              </span>

              <span
                className="flex items-center truncate px-1 font-medium text-gray-700"
                title={layer.geotechnicalSoilName}
                role="cell"
              >
                {layer.geotechnicalSoilName}
              </span>

              {columns.map((key) => {
                const value = byKey.get(key);

                return key === GRAIN_KEY ? (
                  <div key={key} className="flex items-center" role="cell">
                    <GrainCell
                      height={ROW_MIN_HEIGHT}
                      range={sandMedianRange(value)}
                      label={value}
                    />
                  </div>
                ) : (
                  <span
                    key={key}
                    className="flex items-center truncate px-1 text-gray-600"
                    title={value}
                    role="cell"
                  >
                    {value ?? ""}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* Depth-aligned body: rows positioned + sized on the chart's y scale. */
        <div className="relative" style={{ height }} role="rowgroup">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid divide-x divide-gray-200"
            style={{ gridTemplateColumns }}
          >
            <div />

            <div />
            {columns.map((key) => (
              <div key={key} />
            ))}
          </div>

          {rows.map(({ layer, byKey }) => {
            const top = toPixel(layer.upperBoundary);
            const rowHeight = toPixel(layer.lowerBoundary) - top;
            return (
              <div
                key={`${layer.upperBoundary}-${layer.lowerBoundary}`}
                className="absolute inset-x-0 grid items-center overflow-hidden border-t border-gray-200 text-[11px] leading-tight"
                style={{ top, height: rowHeight, gridTemplateColumns }}
                role="row"
              >
                <span
                  className="px-1 font-mono text-[10px] text-gray-400"
                  role="cell"
                >
                  {formatDepth(layer.upperBoundary)}
                </span>

                <span
                  className="truncate px-1 font-medium text-gray-700"
                  title={layer.geotechnicalSoilName}
                  role="cell"
                >
                  {layer.geotechnicalSoilName}
                </span>

                {columns.map((key) => {
                  const value = byKey.get(key);

                  return key === GRAIN_KEY ? (
                    <div key={key} role="cell">
                      <GrainCell
                        height={rowHeight}
                        range={sandMedianRange(value)}
                        label={value}
                      />
                    </div>
                  ) : (
                    <span
                      key={key}
                      className="truncate px-1 text-gray-600"
                      title={value}
                      role="cell"
                    >
                      {value ?? ""}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
