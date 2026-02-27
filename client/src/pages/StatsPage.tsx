/**
 * [INPUT]: Depends on system stats API and Recharts visualization primitives.
 * [OUTPUT]: Renders daily/weekly throughput, success ratio, and agent utilization charts.
 * [POS]: analytics page summarizing execution quality and capacity trends.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchSystemStats } from "@/api/client";
import type { SystemStats } from "@/types";

const PIE_COLORS = ["#10b981", "#ef4444", "#94a3b8"];

function weekKey(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;

  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function StatsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchSystemStats();
        setStats(response);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to load stats");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const weeklyTrend = useMemo(() => {
    if (!stats) return [];
    const totals = new Map<string, number>();
    for (const point of stats.completion_trend_30d) {
      const key = weekKey(point.date);
      totals.set(key, (totals.get(key) ?? 0) + point.count);
    }

    return Array.from(totals.entries())
      .sort(([left], [right]) => (left > right ? 1 : -1))
      .map(([weekStart, count]) => ({ weekStart, count }));
  }, [stats]);

  if (loading) {
    return <p className="py-10 text-sm text-slate-500 dark:text-slate-400">Loading stats...</p>;
  }

  if (error || !stats) {
    return <p className="py-10 text-sm text-red-500">{error ?? "No stats available"}</p>;
  }

  const successRatePercent = (stats.totals.success_rate * 100).toFixed(1);
  const pieData = [
    { name: "Completed", value: stats.totals.completed_tasks },
    { name: "Failed", value: stats.totals.failed_tasks },
    {
      name: "Other",
      value: Math.max(stats.totals.total_tasks - stats.totals.completed_tasks - stats.totals.failed_tasks, 0),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Stats</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tasks per day/week, success ratio, and agent utilization.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Tasks" value={stats.totals.total_tasks} />
        <MetricCard label="Completed" value={stats.totals.completed_tasks} accent="text-emerald-600" />
        <MetricCard label="Failed" value={stats.totals.failed_tasks} accent="text-red-500" />
        <MetricCard label="Success Rate" value={`${successRatePercent}%`} accent="text-sky-600" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tasks Per Day">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.completion_trend_30d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.45} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasks Per Week">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.45} />
              <XAxis dataKey="weekStart" tick={{ fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Success Ratio">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {pieData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Agent Utilization">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.agent_utilization} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.45} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="running_tasks" fill="#f59e0b" name="Running" radius={[0, 6, 6, 0]} />
              <Bar dataKey="total_tasks" fill="#0ea5e9" name="Total" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <article className="panel rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 ${accent ?? ""}`}>{value}</p>
    </article>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="panel rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {children}
    </article>
  );
}
