#!/usr/bin/env bash
# spawn-agent.sh — Spawn a new AI coding agent in an isolated worktree + tmux session
# Usage: .openclaw/spawn-agent.sh "task description" [codex|claude] [--branch name]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TASKS_FILE="$SCRIPT_DIR/active-tasks.json"
WORKTREE_BASE="$REPO_ROOT/.worktrees"

# --- Args ---
TASK_DESC="${1:?Usage: spawn-agent.sh \"task description\" [codex|claude]}"
AGENT_TYPE="${2:-codex}"  # default to codex
CUSTOM_BRANCH="${3:-}"

# --- Validate agent type ---
if [[ "$AGENT_TYPE" != "codex" && "$AGENT_TYPE" != "claude" ]]; then
  echo "❌ Unknown agent type: $AGENT_TYPE (use 'codex' or 'claude')"
  exit 1
fi

# --- Generate task ID and branch name ---
TASK_ID="task-$(date +%s)-$$"
SAFE_DESC="$(echo "$TASK_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | head -c 50)"
BRANCH_NAME="${CUSTOM_BRANCH:-openclaw/${SAFE_DESC}-${TASK_ID##*-}}"
WORKTREE_DIR="$WORKTREE_BASE/$TASK_ID"
SESSION_NAME="oc-$TASK_ID"

echo "🚀 Spawning agent..."
echo "   Task:      $TASK_DESC"
echo "   Agent:     $AGENT_TYPE"
echo "   Branch:    $BRANCH_NAME"
echo "   Worktree:  $WORKTREE_DIR"
echo "   Session:   $SESSION_NAME"

# --- Ensure base branch is up to date ---
MAIN_BRANCH="$(git -C "$REPO_ROOT" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")"
echo "📥 Fetching latest $MAIN_BRANCH..."
git -C "$REPO_ROOT" fetch origin "$MAIN_BRANCH" --quiet

# --- Create worktree on a new branch ---
mkdir -p "$WORKTREE_BASE"
git -C "$REPO_ROOT" worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "origin/$MAIN_BRANCH" --quiet
echo "✅ Worktree created"

# --- Initialize tasks file if needed ---
if [[ ! -f "$TASKS_FILE" ]]; then
  echo '[]' > "$TASKS_FILE"
fi

# --- Register task ---
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TASK_JSON=$(cat <<EOF
{
  "id": "$TASK_ID",
  "description": "$TASK_DESC",
  "agent": "$AGENT_TYPE",
  "branch": "$BRANCH_NAME",
  "session": "$SESSION_NAME",
  "worktree": "$WORKTREE_DIR",
  "status": "running",
  "retries": 0,
  "max_retries": 3,
  "created_at": "$TIMESTAMP",
  "updated_at": "$TIMESTAMP",
  "pr_number": null,
  "pr_url": null
}
EOF
)

# Append to active-tasks.json
TMP_FILE=$(mktemp)
jq --argjson task "$TASK_JSON" '. + [$task]' "$TASKS_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$TASKS_FILE"
echo "📝 Task registered in active-tasks.json"

# --- Launch tmux session with run-agent.sh ---
tmux new-session -d -s "$SESSION_NAME" -c "$WORKTREE_DIR" \
  "bash '$SCRIPT_DIR/run-agent.sh' '$TASK_ID' '$TASK_DESC' '$AGENT_TYPE' '$WORKTREE_DIR' '$BRANCH_NAME'; echo '--- Agent finished. Press enter to close ---'; read"

echo ""
echo "✅ Agent spawned successfully!"
echo "   Monitor:  tmux attach -t $SESSION_NAME"
echo "   Logs:     $WORKTREE_DIR/.openclaw-agent.log"
echo "   Status:   .openclaw/check-agents.sh"
