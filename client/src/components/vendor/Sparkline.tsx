import { Area, AreaChart, ResponsiveContainer } from "recharts";

type SparklineProps = {
  data: number[];
  className?: string;
  color?: string;
};

export function Sparkline({
  data,
  className = "h-8 w-20",
  color = "#2f6fed",
}: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color.replace("#", "")})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
