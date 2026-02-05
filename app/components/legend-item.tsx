interface LegendItemProps {
  color: string;
  label: string;
  truncate?: boolean;
}

export function LegendItem({ color, label, truncate = false }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-4 h-4 border border-gray-300 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className={`text-gray-600${truncate ? " truncate max-w-32" : ""}`}>
        {label}
      </span>
    </div>
  );
}
