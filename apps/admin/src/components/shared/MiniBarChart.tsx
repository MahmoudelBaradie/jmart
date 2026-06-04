interface MiniBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export default function MiniBarChart({ data, color = '#16a34a', height = 80 }: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(d.value / max) * (height - 20)}px`,
              backgroundColor: color,
              opacity: 0.7 + (i / data.length) * 0.3,
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
