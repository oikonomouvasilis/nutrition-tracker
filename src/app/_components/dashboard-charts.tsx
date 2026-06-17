"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const MACRO_NEON = {
  protein: "#29d6f5",
  carbs: "#ffc34d",
  fats: "#ff5c8a",
  calories: "#2dff95",
};

const tooltipStyle = {
  background: "rgba(18,20,29,0.95)",
  border: "1px solid #232838",
  borderRadius: 12,
  fontSize: 12,
  color: "#e8eaf2",
};

export function CaloriesBars({
  daily,
  goal,
}: {
  daily: { label: string; calories: number }[];
  goal: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={daily} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="calBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MACRO_NEON.calories} stopOpacity={0.95} />
            <stop offset="100%" stopColor={MACRO_NEON.calories} stopOpacity={0.25} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          stroke="#8b90a6"
        />
        <YAxis fontSize={11} tickLine={false} axisLine={false} width={42} stroke="#8b90a6" />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          formatter={(value) => [`${value} kcal`, "Θερμίδες"]}
        />
        {goal > 0 && (
          <ReferenceLine
            y={goal}
            stroke="#a98bff"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: `στόχος ${goal}`, position: "insideTopRight", fill: "#8b90a6", fontSize: 10 }}
          />
        )}
        <Bar dataKey="calories" fill="url(#calBar)" radius={[5, 5, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MacroDonut({
  macroKcal,
  totalKcal,
}: {
  macroKcal: { protein: number; carbs: number; fats: number };
  totalKcal: number;
}) {
  const data = [
    { name: "Πρωτεΐνη", value: Math.round(macroKcal.protein), fill: MACRO_NEON.protein },
    { name: "Υδατάνθρακες", value: Math.round(macroKcal.carbs), fill: MACRO_NEON.carbs },
    { name: "Λιπαρά", value: Math.round(macroKcal.fats), fill: MACRO_NEON.fats },
  ];
  const has = data.some((d) => d.value > 0);

  if (!has) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-muted">
        Δεν υπάρχουν δεδομένα στο διάστημα.
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={66}
            outerRadius={100}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} kcal`, ""]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-semibold tabular-nums">{Math.round(totalKcal)}</div>
          <div className="text-xs text-muted">kcal σύνολο</div>
        </div>
      </div>
    </div>
  );
}
