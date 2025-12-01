<div align="center">

![GWTree](image.png)

# GWTree

**Git worktree manager for parallel development**

[![Coverage](https://img.shields.io/badge/coverage-88.7%25-000000.svg?style=for-the-badge&labelColor=000000)](https://github.com/ahmadawais/gwtree)
[![Tests](https://img.shields.io/badge/tests-34_passing-000000.svg?style=for-the-badge&labelColor=000000)](https://github.com/ahmadawais/gwtree)
[![License](https://img.shields.io/badge/license-MIT-000000.svg?style=for-the-badge&labelColor=000000)](LICENSE)

<br />

Create and manage git worktrees effortlessly.  
Perfect for running multiple coding agents in parallel on different branches.

<br />

</div>

---

<br />

## Installation

```bash
npm install -g gwtree
```

<br />

## Usage

### Create Worktree

```bash
gwtree
```

Interactive prompts guide you through:

1. **Branch** — Select main/master or create new branch
2. **Worktree name** — Quick edit suffix or press ESC for full customization
3. **Open in** — Choose VS Code, default editor, or skip

<br />

### List & Delete Worktrees

```bash
gwtree list
```

Browse and delete worktrees interactively with arrow keys and search.

<br />

### Remove Worktree

```bash
gwtree remove
```

<br />

---

<br />

## Features

**Quick worktree creation**  
Minimal prompts, smart defaults

**Smart naming**  
Pattern: `{repo}-{branch}-wt-{suffix}`

**Interactive management**  
List, search, and delete worktrees

**Configurable defaults**  
Customize via `.gwtreerc.json` in your project

**Automation hooks**  
Copy files and run commands on worktree creation

**Clean UX**  
Dimmed prefixes, ESC for full control

**Auto branch creation**  
Unique branch names for each worktree

<br />

---

<br />

## Configuration

Create a `.gwtreerc.json` file in your project root to customize defaults:

```json
{
  "defaultBranchChoice": "current",
  "defaultSuffix": "1",
  "defaultEditor": "code",
  "namePattern": "{repo}-{branch}-wt-{suffix}"
}
```

GWTree searches for configuration in the following order:

- `.gwtreerc`
- `.gwtreerc.json`
- `.gwtreerc.js`
- `gwtree` field in `package.json`

### Available Options

| Option                | Type                                | Default                         | Description              |
| --------------------- | ----------------------------------- | ------------------------------- | ------------------------ |
| `defaultBranchChoice` | `"current"` \| `"new"`              | `"current"`                     | Default branch selection |
| `defaultSuffix`       | `string`                            | `"1"`                           | Default worktree suffix  |
| `defaultOpenEditor`   | `boolean`                           | `true`                          | Prompt to open editor    |
| `defaultEditor`       | `"code"` \| `"default"` \| `"none"` | `"code"`                        | Default editor choice    |
| `namePattern`         | `string`                            | `"{repo}-{branch}-wt-{suffix}"` | Worktree naming pattern  |

<br />

---

<br />

## Hooks

Automate tasks when creating worktrees with the `onCreate` hook:

### Copy Files

Copy files or directories from your main worktree to newly created worktrees:

```json
{
  "hooks": {
    "onCreate": {
      "copyFiles": [
        { "src": ".env", "dst": "." },
        { "src": "root/.env.local", "dst": "." },
        { "src": "config", "dst": "config" }
      ]
    }
  }
}
```

**Path resolution:**

- `src`: Path relative to git root (optional `root/` prefix)
- `dst`: Path relative to new worktree (`.` copies to root)

### Run Commands

Execute commands in the newly created worktree:

```json
{
  "hooks": {
    "onCreate": {
      "runCommands": ["npm install", "echo 'Setup complete for {branchName}'"]
    }
  }
}
```

**Variables:**

- `{worktreePath}` - Full path to new worktree
- `{branchName}` - Branch name

### Complete Example

Combine file copying and command execution:

```json
{
  "defaultEditor": "code",
  "hooks": {
    "onCreate": {
      "copyFiles": [
        { "src": ".env", "dst": "." },
        { "src": "node_modules", "dst": "." }
      ],
      "runCommands": [
        "npm install",
        "npm run build",
        "echo 'Worktree {branchName} ready!'"
      ]
    }
  }
}
```

**Execution order:**

1. Worktree created
2. Files/directories copied (`copyFiles`)
3. Commands executed (`runCommands`)
4. Editor opened (if configured)

<br />

---

<br />

## Commands

| Command         | Alias       | Description               |
| --------------- | ----------- | ------------------------- |
| `gwtree`        | `gwt`       | Create new worktree       |
| `gwtree list`   | `gwt ls`    | List and manage worktrees |
| `gwtree remove` | `gwt rm`    | Remove a worktree         |
| `gwtree -v`     | `--version` | Show version              |
| `gwtree -h`     | `--help`    | Show help                 |

<br />

---

<br />

## Why GWTree?

Perfect for parallel development workflows:

- Run Command Code, Claude and Codex simultaneously on different features
- Test changes across multiple branches
- Keep main branch clean while experimenting
- Quick context switching without stashing

<br />

---

<br />

<div align="center">

**MIT License** © 2025 [Ahmad Awais](https://x.com/_AhmadAwais)

</div>
