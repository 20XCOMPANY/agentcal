import { Router } from "express";
import { DEFAULT_PROJECT_ID, listTasksByQuery } from "../db";

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(date: Date): Date {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + offset);
  return result;
}

function endOfIsoWeek(weekStart: Date): Date {
  const result = new Date(weekStart);
  result.setUTCDate(result.getUTCDate() + 6);
  return result;
}

const router = Router();

router.get("/daily", (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : toUtcDateString(new Date());
  const projectId =
    typeof req.query.project_id === "string" && req.query.project_id.trim().length > 0
      ? req.query.project_id.trim()
      : req.apiKey?.project_id ?? DEFAULT_PROJECT_ID;

  if (!isDate(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const tasks = listTasksByQuery(
    `
      SELECT *
      FROM tasks
      WHERE project_id = ?
        AND
        date(COALESCE(scheduled_at, started_at, completed_at, created_at)) = date(?)
      ORDER BY datetime(COALESCE(scheduled_at, started_at, created_at)) ASC
    `,
    [projectId, date],
  );

  res.json({ date, tasks });
});

router.get("/weekly", (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : toUtcDateString(new Date());
  const projectId =
    typeof req.query.project_id === "string" && req.query.project_id.trim().length > 0
      ? req.query.project_id.trim()
      : req.apiKey?.project_id ?? DEFAULT_PROJECT_ID;

  if (!isDate(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const baseDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(baseDate.getTime())) {
    res.status(400).json({ error: "invalid date" });
    return;
  }

  const weekStart = startOfIsoWeek(baseDate);
  const weekEnd = endOfIsoWeek(weekStart);

  const weekStartStr = toUtcDateString(weekStart);
  const weekEndStr = toUtcDateString(weekEnd);

  const tasks = listTasksByQuery(
    `
      SELECT *
      FROM tasks
      WHERE project_id = ?
        AND date(COALESCE(scheduled_at, started_at, completed_at, created_at))
        BETWEEN date(?) AND date(?)
      ORDER BY datetime(COALESCE(scheduled_at, started_at, created_at)) ASC
    `,
    [projectId, weekStartStr, weekEndStr],
  );

  res.json({
    week_start: weekStartStr,
    week_end: weekEndStr,
    tasks,
  });
});

router.get("/monthly", (req, res) => {
  const month = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 7);
  const projectId =
    typeof req.query.project_id === "string" && req.query.project_id.trim().length > 0
      ? req.query.project_id.trim()
      : req.apiKey?.project_id ?? DEFAULT_PROJECT_ID;

  if (!isMonth(month)) {
    res.status(400).json({ error: "date must be YYYY-MM" });
    return;
  }

  const [yearStr, monthStr] = month.split("-");
  const year = Number.parseInt(yearStr, 10);
  const monthIndex = Number.parseInt(monthStr, 10) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    res.status(400).json({ error: "date must be a valid YYYY-MM month" });
    return;
  }

  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));

  const from = toUtcDateString(firstDay);
  const to = toUtcDateString(lastDay);

  const tasks = listTasksByQuery(
    `
      SELECT *
      FROM tasks
      WHERE project_id = ?
        AND date(COALESCE(scheduled_at, started_at, completed_at, created_at))
        BETWEEN date(?) AND date(?)
      ORDER BY datetime(COALESCE(scheduled_at, started_at, created_at)) ASC
    `,
    [projectId, from, to],
  );

  res.json({
    month,
    from,
    to,
    tasks,
  });
});

export default router;
