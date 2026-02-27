/**
 * [INPUT]: Depends on incremental log lines from task store and optional loading state.
 * [OUTPUT]: Renders auto-scrolling terminal-like log panel.
 * [POS]: task detail live execution stream viewer.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useEffect, useRef } from "react";

interface LogViewerProps {
  lines: string[];
  emptyText?: string;
}

export function LogViewer({ lines, emptyText = "No log output yet." }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="panel h-64 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300">
      {lines.length === 0 ? (
        <p className="text-slate-500">{emptyText}</p>
      ) : (
        lines.map((line, index) => (
          <p key={`${index}-${line.slice(0, 16)}`} className="whitespace-pre-wrap break-words leading-relaxed">
            {line}
          </p>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
