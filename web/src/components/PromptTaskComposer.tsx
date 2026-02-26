/**
 * [INPUT]: 依赖 API client 的 from-prompt 接口、store 的 project/task 上下文与 date-fns 格式化能力。
 * [OUTPUT]: 对外提供 PromptTaskComposer 组件，实现 Notion-like prompt 输入 + 实时解析预览 + 确认创建。
 * [POS]: Calendar 主界面的 Agentic-Native 入口，将自然语言直接映射为任务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import * as api from "@/api/client";
import { useStore } from "@/store";
import type { PromptParserMeta, PromptTaskDraft } from "@/types";

function parseApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

function formatScheduledAt(value: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "MMM d, yyyy h:mm a");
}

export function PromptTaskComposer() {
  const currentProject = useStore((s) => s.currentProject);
  const upsertTask = useStore((s) => s.upsertTask);
  const loadCalendarTasks = useStore((s) => s.loadCalendarTasks);

  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<PromptTaskDraft | null>(null);
  const [parserMeta, setParserMeta] = useState<PromptParserMeta | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const nextPrompt = prompt.trim();
    if (!currentProject || !nextPrompt) {
      setPreview(null);
      setParserMeta(null);
      setPreviewLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setError(null);

      try {
        const result = await api.parseTaskFromPrompt({
          prompt: nextPrompt,
          project_id: currentProject.id,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setPreview(result.parsed);
        setParserMeta(result.parser);
      } catch (requestError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setPreview(null);
        setParserMeta(null);
        setError(parseApiError(requestError));
      } finally {
        if (requestIdRef.current === requestId) {
          setPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [prompt, currentProject]);

  async function handleCreate() {
    const trimmedPrompt = prompt.trim();
    if (!currentProject || !trimmedPrompt) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await api.createTaskFromPrompt({
        prompt: trimmedPrompt,
        project_id: currentProject.id,
      });

      if (!result.task) {
        throw new Error("Task creation response missing task payload");
      }

      upsertTask(result.task);
      await loadCalendarTasks();
      setPrompt("");
      setPreview(null);
      setParserMeta(null);
    } catch (requestError) {
      setError(parseApiError(requestError));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-surface-dark">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        <Sparkles size={14} className="text-neutral-400" />
        Prompt-to-Task
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
            e.preventDefault();
            if (!creating) {
              void handleCreate();
            }
          }
        }}
        rows={5}
        className="min-h-[140px] w-full resize-y border-0 bg-transparent text-lg leading-7 text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        placeholder="Tell me what you want to build..."
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {previewLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Parsing prompt...
            </>
          ) : parserMeta ? (
            <>
              <span>Parser: {parserMeta.provider}</span>
              {parserMeta.model ? <span>({parserMeta.model})</span> : null}
              {parserMeta.fallback ? <span className="text-amber-600">fallback</span> : null}
            </>
          ) : (
            <span>Start typing to preview parsed fields</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || previewLoading || !prompt.trim() || !preview}
          className="inline-flex items-center gap-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : null}
          {creating ? "Creating..." : "Create Task"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-3 grid gap-2 rounded border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40 sm:grid-cols-2">
          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-500">Title</span>
            <p className="mt-1 font-medium text-neutral-800 dark:text-neutral-100">{preview.title}</p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-500">Priority</span>
            <p className="mt-1 capitalize text-neutral-700 dark:text-neutral-200">{preview.priority}</p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-500">Agent</span>
            <p className="mt-1 uppercase text-neutral-700 dark:text-neutral-200">{preview.agent_type}</p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-500">Scheduled</span>
            <p className="mt-1 text-neutral-700 dark:text-neutral-200">{formatScheduledAt(preview.scheduled_at)}</p>
          </div>

          <div className="sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Depends On</span>
            <p className="mt-1 text-neutral-700 dark:text-neutral-200">
              {preview.depends_on.length > 0 ? preview.depends_on.join(", ") : "None"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Description</span>
            <p className="mt-1 whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">{preview.description}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
