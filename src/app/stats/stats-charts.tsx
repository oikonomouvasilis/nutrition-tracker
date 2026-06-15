"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  daily: { label: string; calories: number }[];
  macroKcal: { protein: number; carbs: number; fats: number };
}

const MACRO_COLORS = {
  protein: "#2563eb",
  carbs: "#f59e0b",
  fats: "#ef4444",
};

const card =
  "rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

export default function StatsCharts({ daily, macroKcal }: Props) {
  const pieData = [
    { name: "Πρωτεΐνη", value: Math.round(macroKcal.protein), fill: MACRO_COLORS.protein },
    { name: "Υδατάνθρακες", value: Math.round(macroKcal.carbs), fill: MACRO_COLORS.carbs },
    { name: "Λιπαρά", value: Math.round(macroKcal.fats), fill: MACRO_COLORS.fats },
  ];
  const hasMacros = pieData.some((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Κατανομή μακρο (σε kcal)
        </h3>
        {hasMacros ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} kcal`, ""]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-20 text-center text-sm text-zinc-400">
            Δεν υπάρχουν δεδομένα στο διάστημα.
          </p>
        )}
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Θερμίδες ανά ημέρα
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#88888833" />
            <XAxis dataKey="label" fontSize={11} tickLine={false} />
            <YAxis fontSize={11} tickLine={false} width={44} />
            <Tooltip
              formatter={(value) => [`${value} kcal`, "Θερμίδες"]}
              cursor={{ fill: "#88888811" }}
            />
            <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
