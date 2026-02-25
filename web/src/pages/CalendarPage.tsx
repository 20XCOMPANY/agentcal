import { useEffect } from "react";
import { useStore } from "@/store";
import {
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { statusEmoji, statusBadgeClass, statusLabel } from "@/lib/status";
import type { Task, CalendarView } from "@/types";
import clsx from "clsx";

const views: CalendarView[] = ["day", "week", "month"];

export function CalendarPage() {
  const calendarView = useStore((s) => s.calendarView);
  const setCalendarView = useStore((s) => s.setCalendarView);
  const calendarDate = useStore((s) => s.calendarDate);
  const setCalendarDate = useStore((s) => s.setCalendarDate);
  const calendarTasks = useStore((s) => s.calendarTasks);
  const loadCalendarTasks = useStore((s) => s.loadCalendarTasks);
  const setSelectedTask = useStore((s) => s.setSelectedTask);
  const setCreateModalOpen = useStore((s) => s.setCreateModalOpen);
  const loadAgents = useStore((s) => s.loadAgents);

  useEffect(() => {
    loadCalendarTasks();
    loadAgents();
  }, [calendarView, calendarDate]);

  function navigate(dir: -1 | 1) {
    if (calendarView === "week")
      setCalendarDate(dir === 1 ? addWeeks(calendarDate, 1) : subWeeks(calendarDate, 1));
    else if (calendarView === "month")
      setCalendarDate(dir === 1 ? addMonths(calendarDate, 1) : subMonths(calendarDate, 1));
    else
      setCalendarDate(dir === 1 ? addDays(calendarDate, 1) : subDays(calendarDate, 1));
  }

  function headerLabel() {
    if (calendarView === "month") return format(calendarDate, "MMMM yyyy");
    if (calendarView === "day") return format(calendarDate, "EEEE, MMM d, yyyy");
    const start = startOfWeek(calendarDate, { weekStartsOn: 1 });
    const end = endOfWeek(calendarDate, { weekStartsOn: 1 });
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="ml-2 inline-flex items-center gap-1 rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Plus size={14} /> New
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded border border-neutral-200 dark:border-neutral-700">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  calendarView === v
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Nav */}
          <button
            onClick={() => navigate(-1)}
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCalendarDate(new Date())}
            className="rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronRight size={18} />
          </button>
          <span className="ml-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {headerLabel()}
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      {calendarView === "week" && (
        <WeekView
          date={calendarDate}
          tasks={calendarTasks}
          onTaskClick={setSelectedTask}
        />
      )}
      {calendarView === "month" && (
        <MonthView
          date={calendarDate}
          tasks={calendarTasks}
          onTaskClick={setSelectedTask}
        />
      )}
      {calendarView === "day" && (
        <DayView
          date={calendarDate}
          tasks={calendarTasks}
          onTaskClick={setSelectedTask}
        />
      )}
    </div>
  );
}

function tasksForDay(tasks: Task[], day: Date) {
  return tasks.filter((t) => {
    const d = t.scheduled_at || t.created_at;
    return d && isSameDay(new Date(d), day);
  });
}

function TaskBlock({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full rounded px-2 py-1 text-left text-xs transition-colors hover:ring-2 hover:ring-blue-400/50",
        "bg-neutral-50 dark:bg-neutral-800/60"
      )}
    >
      <span className="mr-1">{statusEmoji[task.status]}</span>
      <span className="truncate font-medium">{task.title}</span>
    </button>
  );
}

function WeekView({
  date,
  tasks,
  onTaskClick,
}: {
  date: Date;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-700">
      {days.map((day) => {
        const dayTasks = tasksForDay(tasks, day);
        return (
          <div
            key={day.toISOString()}
            className={clsx(
              "min-h-[160px] bg-white p-2 dark:bg-surface-dark",
              isToday(day) && "bg-blue-50/50 dark:bg-blue-950/20"
            )}
          >
            <div
              className={clsx(
                "mb-2 text-xs font-medium",
                isToday(day)
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-neutral-500"
              )}
            >
              <span className="block">{format(day, "EEE")}</span>
              <span
                className={clsx(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                  isToday(day) &&
                    "bg-blue-600 text-white dark:bg-blue-500"
                )}
              >
                {format(day, "d")}
              </span>
            </div>
            <div className="space-y-1">
              {dayTasks.slice(0, 5).map((t) => (
                <TaskBlock
                  key={t.id}
                  task={t}
                  onClick={() => onTaskClick(t)}
                />
              ))}
              {dayTasks.length > 5 && (
                <span className="text-xs text-neutral-400">
                  +{dayTasks.length - 5} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  date,
  tasks,
  onTaskClick,
}: {
  date: Date;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-neutral-500"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        return (
          <div
            key={weekStart.toISOString()}
            className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-700"
          >
            {days.map((day) => {
              const dayTasks = tasksForDay(tasks, day);
              const inMonth =
                day.getMonth() === date.getMonth();
              return (
                <div
                  key={day.toISOString()}
                  className={clsx(
                    "min-h-[100px] bg-white p-1.5 dark:bg-surface-dark",
                    !inMonth && "opacity-40",
                    isToday(day) && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  <span
                    className={clsx(
                      "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      isToday(day)
                        ? "bg-blue-600 text-white"
                        : "text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <TaskBlock
                        key={t.id}
                        task={t}
                        onClick={() => onTaskClick(t)}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-neutral-400">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  date,
  tasks,
  onTaskClick,
}: {
  date: Date;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const dayTasks = tasksForDay(tasks, date);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-surface-dark">
      {dayTasks.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          No tasks scheduled for this day.
        </p>
      ) : (
        <div className="space-y-2">
          {dayTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onTaskClick(t)}
              className="flex w-full items-center gap-3 rounded-lg border border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
            >
              <span className="text-lg">{statusEmoji[t.status]}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-neutral-500">
                  {t.agent_type} · {t.priority}
                </p>
              </div>
              <span className={statusBadgeClass(t.status)}>
                {statusLabel[t.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
