/**
 * [INPUT]: Depends on React state and calendar view semantics used by calendar page/components.
 * [OUTPUT]: Exposes date navigation helpers, labels, and API query keys for day/week/month modes.
 * [POS]: calendar behavior model shared by UI controls and task loading logic.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { useMemo, useState } from "react";
import type { CalendarView } from "@/types";

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

function startOfDay(date: Date): Date {
  const d = cloneDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + delta);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = cloneDate(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const d = cloneDate(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isoDate(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

function isoMonth(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 7);
}

export interface UseCalendarResult {
  view: CalendarView;
  setView: (view: CalendarView) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goToday: () => void;
  goPrevious: () => void;
  goNext: () => void;
  label: string;
  queryDate: string;
}

export function useCalendar(initialView: CalendarView = "week"): UseCalendarResult {
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const label = useMemo(() => {
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    if (view === "day") {
      return currentDate.toLocaleDateString(undefined, {
        weekday: "long",
        ...formatOptions,
      });
    }

    if (view === "month") {
      return currentDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }

    const start = startOfWeek(currentDate);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString(undefined, formatOptions)} - ${end.toLocaleDateString(undefined, formatOptions)}`;
  }, [currentDate, view]);

  const queryDate = useMemo(() => {
    if (view === "month") {
      return isoMonth(currentDate);
    }
    if (view === "week") {
      return isoDate(startOfWeek(currentDate));
    }
    return isoDate(currentDate);
  }, [currentDate, view]);

  const goToday = (): void => setCurrentDate(new Date());

  const goPrevious = (): void => {
    setCurrentDate((prev) => {
      if (view === "day") return addDays(prev, -1);
      if (view === "week") return addWeeks(prev, -1);
      return addMonths(prev, -1);
    });
  };

  const goNext = (): void => {
    setCurrentDate((prev) => {
      if (view === "day") return addDays(prev, 1);
      if (view === "week") return addWeeks(prev, 1);
      return addMonths(prev, 1);
    });
  };

  return {
    view,
    setView,
    currentDate,
    setCurrentDate,
    goToday,
    goPrevious,
    goNext,
    label,
    queryDate,
  };
}

export function getWeekDays(baseDate: Date): Date[] {
  const weekStart = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getMonthGrid(baseDate: Date): Date[] {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const grid: Date[] = [];

  let cursor = gridStart;
  while (cursor <= monthEnd || grid.length % 7 !== 0 || grid.length < 35) {
    grid.push(cursor);
    cursor = addDays(cursor, 1);
    if (grid.length >= 42) break;
  }

  return grid;
}
