import { useTranslation } from "react-i18next";
import { max, min } from "d3-array";
import { scaleLog } from "d3-scale";
import type { BHRGTLayer } from "@bedrock-engineer/bro-xml-parser";
import { makeDepthToPixel } from "../util/plot-config";
import {
  SAND_MEDIAN_BREAKS,
  SAND_MEDIAN_DOMAIN,
  SAND_MEDIAN_TICKS,
  sandMedianRange,
  type GrainSizeRange,
} from "../util/grain-size";
import {
  getLayerAttributes,
  LAYER_ATTRIBUTE_KEYS,
  type TranslateFunction,
} from "./bhr-gt-plot-render";

/** Height of the table's header band. The chart reserves a matching spacer
 *  above its (flush) plot frame so the bodies line up on the same depths. */
export const DETAILS_HEADER_HEIGHT = 30;

interface BhrgtDetailsTableProps {
  layers: Array<BHRGTLayer>;
  /** Must match the height passed to buildBhrgtPlot so rows align with the SVG. */
  height: number;
  /** Surface elevation (m NAP); enables the NAP depth labels when napMode is on. */
  surfaceNap?: number | null;
  /** Show depths as m NAP elevation rather than m below surface. */
  napMode?: boolean;
}

// Fixed left columns (depth + soil name) followed by one column per present
// property. Widths are explicit px so the header and every depth-positioned
// row share the same template and their columns line up.
const DEPTH_COL = 44;
const SOIL_COL = 96;
const PROP_COL = 84;
// The sand-median column is a grain-size sparkline, so it needs more room.
const GRAIN_COL = 120;
const GRAIN_PAD = 16;

/** The one property column rendered as a chart rather than text. */
const GRAIN_KEY = "sandMedian";

// Shared log grain-size scale: same domain + pixel range in every cell and the
// header, so dots are comparable down the column (fine → coarse, left → right).
const xGrain = scaleLog()
  .domain(SAND_MEDIAN_DOMAIN)
  .range([GRAIN_PAD, GRAIN_COL - GRAIN_PAD]);

function columnWidth(key: string): number {
  return key === GRAIN_KEY ? GRAIN_COL : PROP_COL;
}

function tickAnchor(index: number, count: number): "start" | "middle" | "end" {
  if (index === 0) {
    return "start";
  }
  if (index === count - 1) {
    return "end";
  }
  return "middle";
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
    <div className="shrink-0" style={{ width }}>
      {/* Column headers — a fixed band above the (flush) body. */}
      <div
        className="grid items-end divide-x divide-gray-200 border-b border-gray-300 pb-0.5 text-[10px] font-semibold text-gray-500"
        style={{ height: DETAILS_HEADER_HEIGHT, gridTemplateColumns }}
      >
        <span className="px-1">{useNap ? "m NAP" : "m -mv"}</span>
        <span className="truncate px-1" title={translate("soilTypes")}>
          {translate("soilTypes")}
        </span>
        {columns.map((key) =>
          key === GRAIN_KEY ? (
            <GrainAxis
              key={key}
              height={DETAILS_HEADER_HEIGHT}
              label={`${translate("sandMedian")} (µm)`}
            />
          ) : (
            <span key={key} className="px-1 leading-tight" title={translate(key)}>
              {translate(key)}
            </span>
          ),
        )}
      </div>

      {/* Depth-aligned body. */}
      <div className="relative" style={{ height }}>
        {/* Continuous full-height column borders, behind the cells. Drawn as a
            separate overlay because the row cells are content-height (items-
            center), so per-cell borders wouldn't fill tall layers. */}
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
            >
              <span className="px-1 font-mono text-[10px] text-gray-400">
                {formatDepth(layer.upperBoundary)}
              </span>
              <span
                className="truncate px-1 font-medium text-gray-700"
                title={layer.geotechnicalSoilName}
              >
                {layer.geotechnicalSoilName}
              </span>
              {columns.map((key) => {
                const value = byKey.get(key);
                return key === GRAIN_KEY ? (
                  <GrainCell
                    key={key}
                    height={rowHeight}
                    range={sandMedianRange(value)}
                    label={value}
                  />
                ) : (
                  <span
                    key={key}
                    className="truncate px-1 text-gray-600"
                    title={value}
                  >
                    {value ?? ""}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Shared grain-size axis, drawn once in the header: the column title on top,
 *  then the µm tick labels (fine → coarse) along the bottom. */
function GrainAxis({ height, label }: { height: number; label: string }) {
  return (
    <svg width={GRAIN_COL} height={height} className="block">
      <title>{label}</title>
      <text x={4} y={9} fontSize={9} fontWeight={600} fill="#6b7280">
        {label}
      </text>
      {SAND_MEDIAN_TICKS.map((tick, index) => (
        <text
          key={tick}
          x={xGrain(tick)}
          y={height - 3}
          fontSize={8}
          fill="#9ca3af"
          textAnchor={tickAnchor(index, SAND_MEDIAN_TICKS.length)}
        >
          {tick >= 1000 ? `${tick / 1000}k` : tick}
        </text>
      ))}
    </svg>
  );
}

/** One layer's grain-size cell: faint class-break lines + a dot at the median. */
function GrainCell({
  height,
  range,
  label,
}: {
  height: number;
  range: GrainSizeRange | null;
  label: string | undefined;
}) {
  return (
    <svg width={GRAIN_COL} height={height} className="block">
      {SAND_MEDIAN_BREAKS.map((break_) => (
        <line
          key={break_}
          x1={xGrain(break_)}
          x2={xGrain(break_)}
          y1={0}
          y2={height}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      ))}
      {range && (
        <circle cx={xGrain(range.mid)} cy={height / 2} r={2.5} fill="#b45309">
          <title>
            {label
              ? `${label} · ${range.min}–${range.max} µm`
              : `${range.min}–${range.max} µm`}
          </title>
        </circle>
      )}
    </svg>
  );
}
