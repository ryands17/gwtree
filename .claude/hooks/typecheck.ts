#!/usr/bin/env bun

/**
 * Claude Code Stop Hook — TypeScript typecheck
 *
 * Runs `tsc --noEmit` and, if there are errors, tells Claude to continue
 * and fix them by injecting the compiler output as a system message.
 *
 * Setup: add the following to .claude/settings.local.json (or ~/.claude/settings.json):
 */
import type {
  StopHookInput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk';
import { $ } from 'bun';

// Read the JSON payload Claude Code sends on stdin
const raw = await Bun.stdin.text();
const input: StopHookInput = JSON.parse(raw);

// Avoid infinite loops: if a stop hook is already active, let Claude finish
if (input.stop_hook_active) {
  process.exit(0);
}

// Run tsc --noEmit in the project's working directory
const result = await $`bun tsc --noEmit --pretty false`
  .cwd(input.cwd)
  .nothrow()
  .quiet();

const output = result.stdout.toString() + result.stderr.toString();
const hasErrors = result.exitCode !== 0;

if (!hasErrors) {
  // No errors — let Claude stop normally
  process.exit(0);
}

// There are errors: tell Claude to continue and fix them
const response: SyncHookJSONOutput = {
  // Keep the agent running instead of stopping
  continue: true,
  // This message is injected into the conversation so Claude sees it
  systemMessage: [
    'TypeScript typecheck failed. Fix ALL of the following errors before finishing:\n',
    '```',
    output.trim(),
    '```',
  ].join('\n'),
};

// Claude Code reads structured JSON from stdout
process.stdout.write(JSON.stringify(response));
process.exit(0);
