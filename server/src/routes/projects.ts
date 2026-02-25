import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// List all projects
router.get("/", (req, res) => {
  try {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    res.json(projects);
  } catch (error) {
    console.error("Error listing projects:", error);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// Create project
router.post("/", (req, res) => {
  try {
    const { name, description = "" } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description, now, now);

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Get project by ID
router.get("/:id", (req, res) => {
  try {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error getting project:", error);
    res.status(500).json({ error: "Failed to get project" });
  }
});

// Update project
router.patch("/:id", (req, res) => {
  try {
    const { name, description } = req.body;
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    updates.push("updated_at = ?");
    values.push(now);
    values.push(req.params.id);

    if (updates.length > 1) {
      db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Delete project
router.delete("/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Get project members
router.get("/:id/members", (req, res) => {
  try {
    const members = db.prepare(`
      SELECT pm.*, a.name as agent_name, a.type as agent_type, a.status as agent_status
      FROM project_members pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE pm.project_id = ?
      ORDER BY pm.joined_at DESC
    `).all(req.params.id);
    res.json(members);
  } catch (error) {
    console.error("Error getting project members:", error);
    res.status(500).json({ error: "Failed to get project members" });
  }
});

// Add project member
router.post("/:id/members", (req, res) => {
  try {
    const { agent_id, role = "member" } = req.body;
    if (!agent_id) {
      return res.status(400).json({ error: "agent_id is required" });
    }

    const id = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO project_members (id, project_id, agent_id, role, joined_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, agent_id, role, now);

    const member = db.prepare(`
      SELECT pm.*, a.name as agent_name, a.type as agent_type
      FROM project_members pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE pm.id = ?
    `).get(id);
    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding project member:", error);
    res.status(500).json({ error: "Failed to add project member" });
  }
});

// Remove project member
router.delete("/:id/members/:agentId", (req, res) => {
  try {
    db.prepare("DELETE FROM project_members WHERE project_id = ? AND agent_id = ?")
      .run(req.params.id, req.params.agentId);
    res.status(204).send();
  } catch (error) {
    console.error("Error removing project member:", error);
    res.status(500).json({ error: "Failed to remove project member" });
  }
});

// Get project activities
router.get("/:id/activities", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = db.prepare(`
      SELECT a.*, ag.name as agent_name, ag.type as agent_type
      FROM activities a
      JOIN agents ag ON a.agent_id = ag.id
      WHERE a.project_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(req.params.id, limit);
    res.json(activities);
  } catch (error) {
    console.error("Error getting project activities:", error);
    res.status(500).json({ error: "Failed to get project activities" });
  }
});

// Get project API keys
router.get("/:id/keys", (req, res) => {
  try {
    const keys = db.prepare(`
      SELECT id, project_id, key, label, created_at, expires_at
      FROM api_keys
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);
    res.json(keys);
  } catch (error) {
    console.error("Error getting API keys:", error);
    res.status(500).json({ error: "Failed to get API keys" });
  }
});

// Create API key
router.post("/:id/keys", (req, res) => {
  try {
    const { label = "", expires_at } = req.body;

    const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const key = `agc_${Math.random().toString(36).slice(2, 15)}${Math.random().toString(36).slice(2, 15)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO api_keys (id, project_id, key, label, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, key, label, now, expires_at || null);

    res.status(201).json({ id, project_id: req.params.id, key, label, created_at: now, expires_at });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// Delete API key
router.delete("/:id/keys/:keyId", (req, res) => {
  try {
    db.prepare("DELETE FROM api_keys WHERE id = ?").run(req.params.keyId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

// Get project webhooks
router.get("/:id/webhooks", (req, res) => {
  try {
    const webhooks = db.prepare("SELECT * FROM webhooks WHERE project_id = ?").all(req.params.id);
    res.json(webhooks.map(w => ({ ...w, active: !!w.active, events: JSON.parse(w.events || "[]") })));
  } catch (error) {
    console.error("Error getting webhooks:", error);
    res.status(500).json({ error: "Failed to get webhooks" });
  }
});

// Create webhook
router.post("/:id/webhooks", (req, res) => {
  try {
    const { url, events = [], active = true } = req.body;
    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO webhooks (id, project_id, url, events, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, url, JSON.stringify(events), active ? 1 : 0, now);

    res.status(201).json({ id, project_id: req.params.id, url, events, active, created_at: now });
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

// Update webhook
router.patch("/:id/webhooks/:webhookId", (req, res) => {
  try {
    const { url, events, active } = req.body;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (url) {
      updates.push("url = ?");
      values.push(url);
    }
    if (events) {
      updates.push("events = ?");
      values.push(JSON.stringify(events));
    }
    if (active !== undefined) {
      updates.push("active = ?");
      values.push(active ? 1 : 0);
    }

    values.push(req.params.webhookId);

    if (updates.length > 0) {
      db.prepare(`UPDATE webhooks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(req.params.webhookId);
    res.json({ ...webhook, active: !!webhook?.active, events: JSON.parse(webhook?.events || "[]") });
  } catch (error) {
    console.error("Error updating webhook:", error);
    res.status(500).json({ error: "Failed to update webhook" });
  }
});

// Delete webhook
router.delete("/:id/webhooks/:webhookId", (req, res) => {
  try {
    db.prepare("DELETE FROM webhooks WHERE id = ?").run(req.params.webhookId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

export default router;
