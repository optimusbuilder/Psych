import { severityTimeline } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";

export function ClinicalPulse() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-cura-sm h-full">
      <h2 className="text-lg font-medium text-foreground mb-1">Clinical Pulse</h2>
      <p className="text-xs text-muted-foreground mb-4">Severity trend · Ava Chen (CASE-003)</p>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={severityTimeline}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <ReferenceLine
              y={70}
              stroke="hsl(0 84% 60%)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(221 83% 53%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(221 83% 53%)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary rounded" />
          <span>Severity Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-urgent rounded opacity-50 border-dashed" />
          <span>Clinical Threshold</span>
        </div>
      </div>
    </div>
  );
}
