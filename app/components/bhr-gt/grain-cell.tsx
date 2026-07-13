import { scaleLog } from "d3-scale";
import { type GrainSizeRange, SAND_MEDIAN_BREAKS } from "~/components/bhr-gt/grain-size";
import { SAND_MEDIAN_DOMAIN, SAND_MEDIAN_TICKS } from "./grain-size";

const GRAIN_COL = 120;

const GRAIN_PAD = 16;

// Shared log grain-size scale: same domain + pixel range in every cell and the
// header, so dots are comparable down the column (fine → coarse, left → right).
export const xGrain = scaleLog()
  .domain(SAND_MEDIAN_DOMAIN)
  .range([GRAIN_PAD, GRAIN_COL - GRAIN_PAD]);

interface GrainCellProps {
  height: number;
  range: GrainSizeRange | null;
  label: string | undefined;
}

/** One layer's grain-size cell: faint class-break lines + a dot at the median. */
export function GrainCell({ height, range, label }: GrainCellProps) {
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

interface GrainAxisProps {
  height: number;
  label: string;
}

/** Shared grain-size axis, drawn once in the header: the column title on top,
 *  then the µm tick labels (fine → coarse) along the bottom. */
export function GrainAxis({ height, label }: GrainAxisProps) {
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

function tickAnchor(index: number, count: number): "start" | "middle" | "end" {
  if (index === 0) {
    return "start";
  }

  if (index === count - 1) {
    return "end";
  }

  return "middle";
}
