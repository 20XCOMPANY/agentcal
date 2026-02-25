import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Bot, BarChart3, Settings, FolderKanban, Key, Webhook, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface Command {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen);
  const setOpen = useStore((s) => s.setCommandPaletteOpen);
  const setCreateModalOpen = useStore((s) => s.setCreateModalOpen);
  const setActivityPanelOpen = useStore((s) => s.setActivityPanelOpen);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const darkMode = useStore((s) => s.darkMode);
  
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: "new-task",
      label: "New Task",
      icon: Plus,
      action: () => {
        setCreateModalOpen(true);
        setOpen(false);
      },
      keywords: ["create", "add", "task"],
    },
    {
      id: "calendar",
      label: "Go to Calendar",
      icon: Calendar,
      action: () => {
        navigate("/calendar");
        setOpen(false);
      },
      keywords: ["calendar", "schedule"],
    },
    {
      id: "agents",
      label: "Go to Agents",
      icon: Bot,
      action: () => {
        navigate("/agents");
        setOpen(false);
      },
      keywords: ["agents", "bots"],
    },
    {
      id: "stats",
      label: "Go to Stats",
      icon: BarChart3,
      action: () => {
        navigate("/stats");
        setOpen(false);
      },
      keywords: ["stats", "analytics", "metrics"],
    },
    {
      id: "projects",
      label: "Go to Projects",
      icon: FolderKanban,
      action: () => {
        navigate("/projects");
        setOpen(false);
      },
      keywords: ["projects"],
    },
    {
      id: "api-keys",
      label: "Go to API Keys",
      icon: Key,
      action: () => {
        navigate("/api-keys");
        setOpen(false);
      },
      keywords: ["api", "keys", "auth"],
    },
    {
      id: "webhooks",
      label: "Go to Webhooks",
      icon: Webhook,
      action: () => {
        navigate("/webhooks");
        setOpen(false);
      },
      keywords: ["webhooks", "integrations"],
    },
    {
      id: "settings",
      label: "Go to Settings",
      icon: Settings,
      action: () => {
        navigate("/settings");
        setOpen(false);
      },
      keywords: ["settings", "preferences"],
    },
    {
      id: "toggle-activity",
      label: "Toggle Activity Panel",
      icon: Calendar,
      action: () => {
        setActivityPanelOpen(true);
        setOpen(false);
      },
      keywords: ["activity", "feed", "recent"],
    },
    {
      id: "toggle-theme",
      label: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon: Settings,
      action: () => {
        toggleDarkMode();
        setOpen(false);
      },
      keywords: ["theme", "dark", "light", "mode"],
    },
  ];

  const filteredCommands = query
    ? commands.filter((cmd) => {
        const searchText = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchText) ||
          cmd.keywords?.some((kw) => kw.includes(searchText))
        );
      })
    : commands;

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          setSelectedIndex((i) => (i + 1) % filteredCommands.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, open, selectedIndex, setOpen]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-xl rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <Search size={18} className="text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <kbd className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
              ESC
            </kbd>
          </div>

          {/* Commands list */}
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                No commands found
              </div>
            ) : (
              filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors",
                      index === selectedIndex
                        ? "bg-neutral-100 dark:bg-neutral-700"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    )}
                  >
                    <Icon size={16} className="text-neutral-500" />
                    <span>{cmd.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
