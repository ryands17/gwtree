---
name: gwtree
description: Use when user asks to create, list, or remove git worktrees, or set up parallel dev environments with gwtree.
---

# gwtree — Git Worktree Manager

`gwtree` manages git worktrees for parallel development. All commands support non-interactive (scriptable) mode via flags.

## create (default command)

```bash
gwtree create [flags]
```

| Flag                | Description                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `--branch <name>`   | Branch to checkout directly (if exists) or create (if not). **Required for non-interactive.** |
| `--new-branch`      | Force-create the branch even if it exists                                                     |
| `--name <name>`     | Full worktree directory name (skips name pattern)                                             |
| `--suffix <suffix>` | Suffix appended to auto-generated name                                                        |
| `--editor <editor>` | Open after create: `code`, `default` (uses `$EDITOR`), or `none`                              |
| `--no-editor`       | Do not open any editor                                                                        |

**Non-interactive requires:** `--branch` + (`--name` OR `--suffix`) + (`--editor`/`--no-editor`)

### Examples

```bash
# New branch, VS Code, fully non-interactive
gwtree create --branch feat/auth --new-branch --suffix wt --editor code

# Existing branch, direct checkout (no new branch created)
gwtree create --branch feat-login --suffix 1 --no-editor

# Existing branch (main), derived branch
gwtree create --branch main --suffix review --no-editor

# Custom full name
gwtree create --branch feat/auth --new-branch --name myrepo-auth-wt --no-editor

# Partial flags — falls through to interactive for missing parts
gwtree create --branch feat/auth
```

## list / ls

```bash
gwtree list [--json]
gwtree ls [--json]
```

- Without `--json`: interactive TUI for selecting and deleting worktrees.
- `--json`: prints JSON array, non-interactive. Each item: `{ path, branch, head }`.

```bash
# List all worktrees as JSON
gwtree list --json

# Pipe to jq — get just paths
gwtree list --json | jq -r '.[].path'

# Get branch of first non-main worktree
gwtree list --json | jq -r '.[1].branch'
```

## remove / rm

```bash
gwtree remove [path] [--force]
gwtree rm [path] [--force]
```

| Arg/Flag  | Description                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| `[path]`  | Match by full path, directory basename, or branch name. **Required for non-interactive.** |
| `--force` | Skip confirmation prompt; also auto-force-removes if worktree has uncommitted changes     |

```bash
# Remove by branch name, no prompts
gwtree remove feat/auth --force

# Remove by directory name
gwtree remove myrepo-auth-wt --force

# Remove by full path
gwtree remove /Users/ryan/projects/myrepo-auth-wt --force

# Interactive (no args) — shows TUI picker
gwtree remove
```

## Common patterns

```bash
# Create worktree for a ticket, open in VS Code
gwtree create --branch feat/TICKET-123 --new-branch --suffix wt --editor code

# Create worktree for code review (no editor)
gwtree create --branch pr/456 --suffix review --no-editor

# List all worktrees, extract paths for a script
PATHS=$(gwtree list --json | jq -r '.[].path')

# Remove all non-main worktrees by piping list --json
gwtree list --json | jq -r '.[1:][].branch' | xargs -I{} gwtree remove {} --force
```
