/**
 * [INPUT]: Depends on current calendar view/date, task list, and task card renderer.
 * [OUTPUT]: Renders self-built day/week/month calendar grids with colored time blocks.
 * [POS]: core scheduling visualization surface for CalendarPage.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import type { Task, CalendarView } from "@/types";
import { TaskCard } from "@/components/TaskCard";
import { getMonthGrid, getWeekDays } from "@/hooks/useCalendar";

interface CalendarGridProps {
  view: CalendarView;
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINIMUM_BLOCK_HEIGHT_PERCENT = 3;

function getTaskStart(task: Task): Date {
  const source = task.scheduled_at ?? task.started_at ?? task.created_at;
  return new Date(source);
}

function getTaskDurationMinutes(task: Task): number {
  return Math.max(task.actual_duration_min ?? task.estimated_duration_min ?? 30, 15);
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function minutesFromStartOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function groupByDay(tasks: Task[], day: Date): Task[] {
  return tasks
    .filter((task) => isSameDay(getTaskStart(task), day))
    .sort((a, b) => getTaskStart(a).getTime() - getTaskStart(b).getTime());
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function DayColumn({ day, tasks, onTaskClick }: { day: Date; tasks: Task[]; onTaskClick: (task: Task) => void }) {
  return (
    <div className="relative min-h-[640px] border-l border-slate-200 dark:border-slate-800">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-2 py-2 text-xs font-medium text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
        {dayLabel(day)}
      </div>
      <div className="relative h-[640px]">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-dashed border-slate-200 dark:border-slate-800"
            style={{ top: `${(hour / 24) * 100}%` }}
          />
        ))}
        {tasks.map((task, index) => {
          const start = getTaskStart(task);
          const startPercent = (minutesFromStartOfDay(start) / 1440) * 100;
          const blockHeightPercent = Math.max((getTaskDurationMinutes(task) / 1440) * 100, MINIMUM_BLOCK_HEIGHT_PERCENT);
          const leftOffset = (index % 2) * 4;
          const width = index % 2 === 0 ? 96 : 92;

          return (
            <div
              key={task.id}
              className="absolute px-1"
              style={{
                top: `${startPercent}%`,
                height: `${blockHeightPercent}%`,
                left: `${leftOffset}%`,
                width: `${width}%`,
              }}
            >
              <TaskCard task={task} onClick={onTaskClick} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const days = getWeekDays(currentDate);
  return (
    <div className="panel overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-8">
        <div className="border-r border-slate-200 dark:border-slate-800">
          <div className="h-10 border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Time
          </div>
          <div className="relative h-[640px]">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-dashed border-slate-200 px-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500"
                style={{ top: `${(hour / 24) * 100}%` }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>
        {days.map((day) => (
          <DayColumn key={day.toISOString()} day={day} tasks={groupByDay(tasks, day)} onTaskClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}

function DayView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const dayTasks = groupByDay(tasks, currentDate);
  return (
    <div className="panel overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-[80px_1fr]">
        <div className="relative h-[640px] border-r border-slate-200 dark:border-slate-800">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-dashed border-slate-200 px-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500"
              style={{ top: `${(hour / 24) * 100}%` }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <DayColumn day={currentDate} tasks={dayTasks} onTaskClick={onTaskClick} />
      </div>
    </div>
  );
}

function MonthView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const days = getMonthGrid(currentDate);
  const now = new Date();

  return (
    <div className="panel overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
          <div key={weekday} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
        {days.map((day) => {
          const dayTasks = groupByDay(tasks, day);
          const inMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(now, day);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[132px] bg-white p-2 dark:bg-slate-950 ${inMonth ? "opacity-100" : "opacity-45"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {day.getDate()}
                </span>
                <span className="text-[10px] text-slate-400">{dayTasks.length}</span>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <TaskCard key={task.id} task={task} compact onClick={onTaskClick} />
                ))}
                {dayTasks.length > 3 ? <p className="text-[10px] text-slate-400">+{dayTasks.length - 3} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarGrid({ view, currentDate, tasks, onTaskClick }: CalendarGridProps) {
  if (view === "day") {
    return <DayView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />;
  }

  if (view === "month") {
    return <MonthView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />;
  }

  return <WeekView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />;
}
