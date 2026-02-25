import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentType } from "../types";

const execAsync = promisify(exec);

const SCRIPT_NAMES = {
  spawn: "spawn-agent.sh",
  redirect: "redirect-agent.sh",
  kill: "kill-agent.sh",
  status: "status.sh",
} as const;

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function scriptCandidates(scriptName: string): string[] {
  const cwd = process.cwd();
  const home = os.homedir();
  const envRoot = process.env.AGENT_SWARM_SCRIPTS_DIR;

  const roots = [
    envRoot,
    path.resolve(cwd, ".openclaw"),
    path.resolve(cwd, "..", ".openclaw"),
    path.resolve(cwd, "..", "..", ".openclaw"),
    path.join(home, ".openclaw"),
  ].filter((item): item is string => Boolean(item));

  const candidates: string[] = [];
  for (const root of roots) {
    candidates.push(
      path.resolve(root, scriptName),
      path.resolve(root, "scripts", scriptName),
      path.resolve(root, "bin", scriptName),
    );
  }

  return candidates;
}

function resolveScript(scriptName: string): string {
  for (const candidate of scriptCandidates(scriptName)) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate ${scriptName}. Set AGENT_SWARM_SCRIPTS_DIR or place scripts under .openclaw/.`,
  );
}

async function runScript(scriptName: string, args: string[] = []): Promise<{
  command: string;
  stdout: string;
  stderr: string;
}> {
  const scriptPath = resolveScript(scriptName);
  const command = `${shellEscape(scriptPath)} ${args.map(shellEscape).join(" ")}`.trim();
  const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
  return { command, stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function spawnAgent(description: string, agentType: AgentType): Promise<{
  command: string;
  stdout: string;
  stderr: string;
}> {
  return runScript(SCRIPT_NAMES.spawn, [description, agentType]);
}

export async function redirectAgent(
  tmuxSession: string,
  message: string,
): Promise<{
  command: string;
  stdout: string;
  stderr: string;
}> {
  return runScript(SCRIPT_NAMES.redirect, [tmuxSession, message]);
}

export async function killAgent(tmuxSession: string): Promise<{
  command: string;
  stdout: string;
  stderr: string;
}> {
  return runScript(SCRIPT_NAMES.kill, [tmuxSession]);
}

export async function getAgentSwarmStatus(): Promise<{
  command: string;
  stdout: string;
  stderr: string;
}> {
  return runScript(SCRIPT_NAMES.status);
}
