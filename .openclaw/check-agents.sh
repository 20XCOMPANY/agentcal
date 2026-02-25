#!/usr/bin/env bash
# check-agents.sh — Monitor all active agents, check status, retry failures, notify on completion
# Usage: .openclaw/check-agents.sh (typically called by cron every 10 minutes)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TASKS_FILE="$SCRIPT_DIR/active-tasks.json"

# --- No tasks file = nothing to do ---
if [[ ! -f "$TASKS_FILE" ]]; then
  echo "No active-tasks.json found. Nothing to check."
  exit 0
fi

TASK_COUNT=$(jq 'length' "$TASKS_FILE")
if [[ "$TASK_COUNT" -eq 0 ]]; then
  echo "No active tasks."
  exit 0
fi

echo "🔍 Checking $TASK_COUNT task(s)..."
echo "---"

# --- Helper: update task field ---
update_task() {
  local task_id="$1" field="$2" value="$3"
  local tmp=$(mktemp)
  jq --arg id "$task_id" --arg f "$field" --arg v "$value" \
    '(.[] | select(.id == $id))[$f] = $v | (.[] | select(.id == $id)).updated_at = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))' \
    "$TASKS_FILE" > "$tmp" && mv "$tmp" "$TASKS_FILE"
}

update_task_int() {
  local task_id="$1" field="$2" value="$3"
  local tmp=$(mktemp)
  jq --arg id "$task_id" --arg f "$field" --argjson v "$value" \
    '(.[] | select(.id == $id))[$f] = $v | (.[] | select(.id == $id)).updated_at = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))' \
    "$TASKS_FILE" > "$tmp" && mv "$tmp" "$TASKS_FILE"
}

# --- Iterate over each task ---
jq -c '.[]' "$TASKS_FILE" | while IFS= read -r task; do
  TASK_ID=$(echo "$task" | jq -r '.id')
  STATUS=$(echo "$task" | jq -r '.status')
  SESSION=$(echo "$task" | jq -r '.session')
  BRANCH=$(echo "$task" | jq -r '.branch')
  AGENT=$(echo "$task" | jq -r '.agent')
  DESC=$(echo "$task" | jq -r '.description')
  WORKTREE=$(echo "$task" | jq -r '.worktree')
  RETRIES=$(echo "$task" | jq -r '.retries')
  MAX_RETRIES=$(echo "$task" | jq -r '.max_retries')
  PR_NUMBER=$(echo "$task" | jq -r '.pr_number // empty')

  echo "📋 Task: $TASK_ID ($STATUS)"
  echo "   Desc: $DESC"

  # --- Skip completed/abandoned tasks ---
  if [[ "$STATUS" == "completed" || "$STATUS" == "abandoned" ]]; then
    echo "   ⏭️  Skipping ($STATUS)"
    echo "---"
    continue
  fi

  # --- Check if tmux session is still alive ---
  if [[ "$STATUS" == "running" ]]; then
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "   🟢 tmux session alive"
      # Check how long it's been running (timeout after 2 hours)
      CREATED=$(echo "$task" | jq -r '.created_at')
      CREATED_TS=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$CREATED" "+%s" 2>/dev/null || date -d "$CREATED" "+%s" 2>/dev/null || echo "0")
      NOW_TS=$(date +%s)
      ELAPSED=$(( (NOW_TS - CREATED_TS) / 60 ))
      echo "   ⏱️  Running for ${ELAPSED}m"

      if [[ $ELAPSED -gt 120 ]]; then
        echo "   ⚠️  Timeout! Killing session after 2 hours"
        tmux kill-session -t "$SESSION" 2>/dev/null || true
        update_task "$TASK_ID" "status" "failed"
      fi
    else
      echo "   🔴 tmux session dead — agent finished or crashed"
      # Check if it pushed / created PR by looking at status
      # If still "running", it probably crashed
      if [[ "$STATUS" == "running" ]]; then
        echo "   💀 Agent crashed (session gone but status still 'running')"
        update_task "$TASK_ID" "status" "failed"
        STATUS="failed"
      fi
    fi
  fi

  # --- Handle failed tasks: retry logic ---
  if [[ "$STATUS" == "failed" ]]; then
    if [[ "$RETRIES" -lt "$MAX_RETRIES" ]]; then
      NEW_RETRIES=$((RETRIES + 1))
      echo "   🔄 Retrying ($NEW_RETRIES/$MAX_RETRIES)..."
      update_task_int "$TASK_ID" "retries" "$NEW_RETRIES"
      update_task "$TASK_ID" "status" "running"

      # Clean up old worktree if exists, recreate
      if [[ -d "$WORKTREE" ]]; then
        git -C "$REPO_ROOT" worktree remove "$WORKTREE" --force 2>/dev/null || rm -rf "$WORKTREE"
      fi
      git -C "$REPO_ROOT" branch -D "$BRANCH" 2>/dev/null || true

      MAIN_BRANCH="$(git -C "$REPO_ROOT" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")"
      git -C "$REPO_ROOT" fetch origin "$MAIN_BRANCH" --quiet
      git -C "$REPO_ROOT" worktree add -b "$BRANCH" "$WORKTREE" "origin/$MAIN_BRANCH" --quiet 2>/dev/null || true

      # Relaunch in tmux
      tmux kill-session -t "$SESSION" 2>/dev/null || true
      tmux new-session -d -s "$SESSION" -c "$WORKTREE" \
        "bash '$SCRIPT_DIR/run-agent.sh' '$TASK_ID' '$DESC' '$AGENT' '$WORKTREE' '$BRANCH'; echo '--- Agent finished. Press enter to close ---'; read"

      echo "   ✅ Retry launched"
    else
      echo "   ❌ Max retries reached. Abandoning task."
      update_task "$TASK_ID" "status" "abandoned"
    fi
  fi

  # --- Check PR status ---
  if [[ "$STATUS" == "pr-open" && -n "$PR_NUMBER" ]]; then
    if command -v gh &>/dev/null; then
      echo "   🔀 Checking PR #$PR_NUMBER..."

      # Check CI status
      CI_STATUS=$(gh pr checks "$PR_NUMBER" --repo "$(git -C "$REPO_ROOT" remote get-url origin)" --json 'state' --jq '.[].state' 2>/dev/null | sort -u || echo "unknown")

      if echo "$CI_STATUS" | grep -q "FAILURE"; then
        echo "   ❌ CI failed"
        update_task "$TASK_ID" "status" "ci-failed"
      elif echo "$CI_STATUS" | grep -q "PENDING"; then
        echo "   ⏳ CI still running"
      elif echo "$CI_STATUS" | grep -q "SUCCESS"; then
        echo "   ✅ CI passed! PR ready for review"
        update_task "$TASK_ID" "status" "ready"
        # Could add notification here (Discord webhook, etc.)
        echo "   📢 NOTIFY: PR #$PR_NUMBER is ready for review!"
      fi
    else
      echo "   ⚠️  gh CLI not found, can't check PR status"
    fi
  fi

  # --- Handle CI failures: retry ---
  if [[ "$STATUS" == "ci-failed" ]]; then
    if [[ "$RETRIES" -lt "$MAX_RETRIES" ]]; then
      NEW_RETRIES=$((RETRIES + 1))
      echo "   🔄 CI failed, re-running agent to fix ($NEW_RETRIES/$MAX_RETRIES)..."
      update_task_int "$TASK_ID" "retries" "$NEW_RETRIES"
      update_task "$TASK_ID" "status" "running"

      CI_LOGS=""
      if command -v gh &>/dev/null && [[ -n "$PR_NUMBER" ]]; then
        CI_LOGS=$(gh pr checks "$PR_NUMBER" --json 'name,state,detailsUrl' 2>/dev/null || echo "")
      fi

      FIX_PROMPT="The previous attempt created PR #$PR_NUMBER but CI failed. Fix the CI failures and push again. CI info: $CI_LOGS"

      tmux kill-session -t "$SESSION" 2>/dev/null || true
      tmux new-session -d -s "$SESSION" -c "$WORKTREE" \
        "bash '$SCRIPT_DIR/run-agent.sh' '$TASK_ID' '$FIX_PROMPT' '$AGENT' '$WORKTREE' '$BRANCH'; echo '--- Agent finished ---'; read"

      echo "   ✅ Fix attempt launched"
    else
      echo "   ❌ Max retries on CI fix. Needs manual intervention."
      update_task "$TASK_ID" "status" "abandoned"
    fi
  fi

  echo "---"
done

echo ""
echo "📊 Summary:"
jq -r 'group_by(.status) | .[] | "   \(.[0].status): \(length)"' "$TASKS_FILE"
