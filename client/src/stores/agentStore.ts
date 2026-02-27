/**
 * [INPUT]: Depends on Zustand state container and api client agent endpoints.
 * [OUTPUT]: Exposes agent list state with load and realtime upsert actions.
 * [POS]: client agent domain store consumed by agents page and task detail references.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { create } from "zustand";
import type { Agent } from "@/types";
import { fetchAgents } from "@/api/client";

interface AgentStoreState {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  loadAgents: () => Promise<void>;
  upsertAgent: (agent: Agent) => void;
  getAgentById: (agentId: string | null) => Agent | null;
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,
  async loadAgents() {
    set({ isLoading: true, error: null });
    try {
      const agents = await fetchAgents();
      set({ agents, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load agents",
      });
    }
  },
  upsertAgent(agent) {
    set((state) => {
      const index = state.agents.findIndex((candidate) => candidate.id === agent.id);
      if (index === -1) {
        return { agents: [agent, ...state.agents] };
      }

      const nextAgents = [...state.agents];
      nextAgents[index] = agent;
      return { agents: nextAgents };
    });
  },
  getAgentById(agentId) {
    if (!agentId) return null;
    return get().agents.find((agent) => agent.id === agentId) ?? null;
  },
}));
