# GWTree

A CLI for creating and managing git worktrees, so multiple branches (often driven by parallel coding agents) can be worked on simultaneously in separate directories.

## Language

**Worktree**:
A git worktree — a filesystem directory checked out against a specific branch, linked to one shared repository.
_Avoid_: Workspace, checkout, clone

**Main Worktree**:
The original worktree of the repository (where `.git` lives), always first in `git worktree list` output. Excluded from selection in `list` and `remove`, since it can't be removed.
_Avoid_: Root worktree, primary worktree

**Repository** / **Git Root**:
The shared `.git` directory and its original working directory, resolved via `git rev-parse --show-toplevel`. All worktrees for a repo live as sibling directories to it.
_Avoid_: Repo root, project root

**Branch**:
A git branch. May be local, remote-only (`origin/<name>`), or not yet existing.
_Avoid_: Ref

**Base Branch**:
The branch a new or derived branch is created from. Defaults to the current branch of the git root unless the user is doing a Direct Checkout.
_Avoid_: Source branch, parent branch

**From Branch**:
The branch resolution used when the user names a single branch directly — via the interactive menu's free-text entry, or the `--branch` CLI flag. gwtree resolves the name into either a Direct Checkout (branch exists, local or remote) or a New Branch (branch doesn't exist, created off the Base Branch). Errors out if the branch exists but is already checked out in another worktree, even via `--branch` (see [ADR 0002](./docs/adr/0002-branch-flag-errors-on-in-use-branch.md)). Replaces the old separate "Use existing branch" / "Create new branch" menu entries and the old `--new-branch` CLI flag; the quick-pick Base Branch entry (e.g. `main`) is unaffected and keeps its Derived Branch behavior.
_Avoid_: Use existing branch, Create new branch, --new-branch

**Direct Checkout**:
Outcome of From Branch where an existing branch (local or remote) is checked out into the new worktree unmodified — no new branch is created. Blocked if that branch is already checked out in another worktree.
_Avoid_: Existing branch mode

**New Branch**:
Outcome of From Branch where the typed name doesn't exist yet, so gwtree creates it fresh off the Base Branch.
_Avoid_: Fresh branch

**Derived Branch**:
Worktree creation mode used when the user picks a shared Base Branch (e.g. main) directly rather than naming a new branch. Since git forbids checking out the same branch in two worktrees, gwtree creates a new branch named `{branch}-{worktreeName}` off that base branch instead of checking it out directly.
_Avoid_: Auto branch, branch fork, implicit branch

**Worktree Name**:
The directory name for a worktree, created as a sibling to the Git Root. Built from the Name Pattern unless the user supplies one explicitly (`--name`).
_Avoid_: Directory name, folder name

**Name Pattern**:
The configurable template (default `{repo}-{branch}-wt-{suffix}`) used to generate a Worktree Name from the repo name, sanitized branch name, and Suffix.
_Avoid_: Naming convention

**Suffix**:
A short user-supplied token (default `"1"`) substituted into the Name Pattern to distinguish multiple worktrees for the same branch/repo.
_Avoid_: Index, counter

**Worktree Reference**:
A single string used to identify one worktree for removal — resolved, in order, against full path, Worktree Name, then Branch. Anything that resolves to exactly one worktree is a valid reference.
_Avoid_: Worktree locator, worktree selector, worktree ID

**Config**:
Project-level settings (`.gwtreerc`, `gwtree.json`, or `.gwtree.json`) discovered by searching from the current directory up to the home directory, validated against a schema with defaults for every field.
_Avoid_: Settings, options

**Hook**:
A config-defined automation step that runs after a worktree is created: copying files from the Git Root (`copyFiles`) and/or running shell commands inside the new worktree (`runCommands`). Currently only the `onCreate` hook exists.
_Avoid_: Post-create script, lifecycle hook

**Interactive Mode**:
Per-command behavior where missing information is collected via prompts. Each command decides independently whether it has enough CLI flags to skip straight to Non-Interactive Mode.
_Avoid_: Prompt mode

**Non-Interactive Mode**:
Behavior where a command runs to completion from CLI flags alone (for scripting/CI), printing plain output instead of showing prompts/spinners/banner.
_Avoid_: CLI mode, script mode, headless mode
