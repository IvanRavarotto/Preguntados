#!/usr/bin/env node
// PreToolUse guard: refuse edits that target the shared main checkout's working tree.
//
// OPT-IN — not wired into .claude/settings.json by default.
//
// This guard belongs to the worktree-per-agent operating model: every agent gets its own
// git worktree, and the main checkout is shared with other sessions, where recovering a
// stray edit (git checkout --) has destroyed another session's work before.
//
// Turn it on only once agents actually run in worktrees. With a single shared checkout it
// denies every write to the project, which is not a safer workspace — it is a broken one.
//
// Exempt: anything under a .claude/ directory. That covers agent worktrees at
// .claude/worktrees/ and keeps the harness config editable.
//
// The guarded root comes from CLAUDE_PROJECT_DIR, never a literal path: a hardcoded
// checkout location makes this guard silently no-op on every other machine, which reads as
// protection while providing none.
//
// Fails CLOSED. If the root is unknown or the payload will not parse, the write is denied
// rather than allowed: an unreadable input is not evidence that the target is safe.

import { resolve } from "node:path";

function respond(reason) {
  if (reason) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      }),
    );
  }
  process.exit(0);
}

// Backslashes to forward slashes, then lowercase, so Windows and POSIX spellings compare.
const norm = (p) => resolve(p).replaceAll("\\", "/").toLowerCase().replace(/\/$/, "");

async function main() {
  const root = process.env.CLAUDE_PROJECT_DIR;
  if (!root) {
    respond(
      "BLOCKED: CLAUDE_PROJECT_DIR is unset, so this guard cannot tell whether the write target is the shared main checkout. Write to your assigned git worktree.",
    );
  }

  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  let target;
  try {
    const payload = JSON.parse(raw);
    target = payload?.tool_input?.file_path ?? payload?.tool_input?.notebook_path ?? "";
  } catch {
    respond(
      `BLOCKED: this guard could not parse the tool payload, so it cannot tell whether the write target is the shared main checkout (${root}). Write to your assigned git worktree.`,
    );
  }

  // A tool invocation with no file target has nothing to guard.
  if (!target) respond();

  const path = norm(target);
  if (path.includes("/.claude/")) respond();

  if (path.startsWith(`${norm(root)}/`)) {
    respond(
      `BLOCKED: the shared main checkout ${root} is off-limits. Another session works there, and recovering stray edits with git checkout -- has destroyed work before. Write to your assigned git worktree instead.`,
    );
  }

  respond();
}

main().catch((error) => {
  respond(
    `BLOCKED: this guard failed before it could check the write target (${error?.message ?? error}), so it cannot tell whether the target is the shared main checkout.`,
  );
});
