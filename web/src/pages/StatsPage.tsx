import { useEffect, useState } from "react";
import * as api from "@/api/client";
import type { SystemStats } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#f97316", "#10b981", "#ef4444"];

export function StatsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchSystemStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-neutral-400">Loading stats...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-neutral-400">
          Could not load statistics.
        </span>
      </div>
    );
  }

  const successRate = stats.success_rate ?? (
    stats.total_tasks > 0
      ? ((stats.completed_tasks / stats.total_tasks) * 100)
      : 0
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Statistics</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total_tasks} />
        <StatCard
          label="Completed"
          value={stats.completed_tasks}
          color="text-emerald-600"
        />
        <StatCard
          label="Failed"
          value={stats.failed_tasks}
          color="text-red-500"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          color="text-blue-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks by day */}
        {stats.tasks_by_day && stats.tasks_by_day.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="mb-4 text-sm font-semibold">
              Task Completion Over Time
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.tasks_by_day}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(150,150,150,0.15)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 12,
                    border: "1px solid #e5e5e5",
                  }}
                />
                <Bar
                  dataKey="completed"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Completed"
                />
                <Bar
                  dataKey="failed"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Failed"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tasks by agent type */}
        {stats.tasks_by_agent_type && stats.tasks_by_agent_type.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="mb-4 text-sm font-semibold">
              Tasks by Agent Type
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.tasks_by_agent_type}
                  dataKey="count"
                  nameKey="agent_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ agent_type, count }: { agent_type: string; count: number }) =>
                    `${agent_type}: ${count}`
                  }
                >
                  {stats.tasks_by_agent_type.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
