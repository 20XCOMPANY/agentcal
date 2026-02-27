/**
 * [INPUT]: Depends on calendar/task stores, calendar hook helpers, prompt-to-task api, and router navigation.
 * [OUTPUT]: Renders day/week/month calendar workspace with prompt parsing preview and task creation flow.
 * [POS]: primary planning page where users schedule work and open task details.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/components/CalendarGrid";
import { useTaskStore } from "@/stores/taskStore";
import { useCalendar } from "@/hooks/useCalendar";
import { createTaskFromPrompt, parseTaskFromPrompt } from "@/api/client";
import type { CalendarView, PromptParserMeta, PromptTaskDraft } from "@/types";

const calendarViews: CalendarView[] = ["day", "week", "month"];

export function CalendarPage() {
  const navigate = useNavigate();
  const calendarTasks = useTaskStore((state) => state.calendarTasks);
  const loadCalendarTasks = useTaskStore((state) => state.loadCalendarTasks);
  const upsertTask = useTaskStore((state) => state.upsertTask);
  const setSelectedTaskId = useTaskStore((state) => state.setSelectedTaskId);

  const { view, setView, currentDate, goPrevious, goNext, goToday, label, queryDate } = useCalendar("week");

  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<PromptTaskDraft | null>(null);
  const [parserMeta, setParserMeta] = useState<PromptParserMeta | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCalendarTasks(view, queryDate);
  }, [loadCalendarTasks, queryDate, view]);

  const taskCount = useMemo(() => calendarTasks.length, [calendarTasks]);

  async function handleParsePrompt(): Promise<void> {
    if (!prompt.trim()) return;

    setParseLoading(true);
    setError(null);
    try {
      const response = await parseTaskFromPrompt(prompt.trim());
      setDraft(response.parsed);
      setParserMeta(response.parser);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to parse prompt");
      setDraft(null);
      setParserMeta(null);
    } finally {
      setParseLoading(false);
    }
  }

  async function handleCreateFromPrompt(): Promise<void> {
    if (!prompt.trim()) return;

    setCreateLoading(true);
    setError(null);
    try {
      const response = await createTaskFromPrompt(prompt.trim());
      if (response.task) {
        upsertTask(response.task);
      }
      setPrompt("");
      setDraft(null);
      setParserMeta(null);
      await loadCalendarTasks(view, queryDate);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create task");
    } finally {
      setCreateLoading(false);
    }
  }

  function handleTaskClick(taskId: string): void {
    setSelectedTaskId(taskId);
    navigate(`/tasks/${taskId}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="panel rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Calendar</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label} · {taskCount} tasks</p>
          </div>
          <div className="flex items-center gap-2">
            {calendarViews.map((candidateView) => (
              <button
                key={candidateView}
                type="button"
                onClick={() => setView(candidateView)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  candidateView === view
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {candidateView}
              </button>
            ))}
            <button
              type="button"
              onClick={goPrevious}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Next
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Prompt to Task</p>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Tell me what you want to build..."
            rows={6}
            className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-base leading-7 text-slate-900 outline-none ring-slate-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleParsePrompt()}
              disabled={parseLoading || !prompt.trim()}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {parseLoading ? "Parsing..." : "Parse Preview"}
            </button>
            <button
              type="button"
              onClick={() => void handleCreateFromPrompt()}
              disabled={createLoading || !prompt.trim() || !draft}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {createLoading ? "Creating..." : "Confirm Create"}
            </button>
            {parserMeta ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                parser: {parserMeta.provider}
                {parserMeta.model ? ` (${parserMeta.model})` : ""}
                {parserMeta.fallback ? " fallback" : ""}
              </p>
            ) : null}
          </div>

          {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}

          {draft ? (
            <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Title</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{draft.title}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Priority</p>
                <p className="capitalize text-slate-900 dark:text-slate-100">{draft.priority}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Agent</p>
                <p className="uppercase text-slate-900 dark:text-slate-100">{draft.agent_type}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Scheduled</p>
                <p className="text-slate-900 dark:text-slate-100">{draft.scheduled_at ?? "Not scheduled"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Description</p>
                <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">{draft.description}</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <CalendarGrid
        view={view}
        currentDate={currentDate}
        tasks={calendarTasks}
        onTaskClick={(task) => handleTaskClick(task.id)}
      />
    </div>
  );
}
