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

- Download the binary from the releases page
- Move the binary into any folder in your path for e.g. `~/.local/bin/`
- If you have issues with mac not recognising this due to lack of signing, run the following command: `xattr -dr com.apple.quarantine <path-to-binary>/gwt`

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

GWTree supports two levels of configuration: **global** (user-level) and **project** (repository-level).

### Global Configuration

Create a global configuration file to set your preferred defaults across **all projects**:

**Location (platform-specific):**

- **macOS**: `~/.config/gwtree/config.json`
- **Linux**: `~/.config/gwtree/config.json`

**Example:**

```json
{
  "defaultSuffix": "1",
  "defaultEditor": "code",
  "defaultBranchChoice": "current",
  "namePattern": "{repo}-{branch}-wt-{suffix}"
}
```

### Project Configuration

Create a project-specific configuration file in your repository root to customize settings for that project:

**Searched in order:**

- `.gwtreerc`
- `.gwtreerc.json`
- `.gwtreerc.js`
- `gwtree` field in `package.json`

**Example (`.gwtreerc.json`):**

```json
{
  "defaultBranchChoice": "current",
  "defaultSuffix": "1",
  "defaultEditor": "code",
  "namePattern": "{repo}-{branch}-wt-{suffix}"
}
```

### Configuration Priority

Settings are merged in this order (highest priority last):

1. **Schema defaults** (built-in defaults)
2. **Global config** (platform-specific location, see above)
3. **Project config** (`.gwtreerc*` or `package.json`)

Project settings **override** global settings, which override defaults.

**Example:**

If you have:

- **Global config**: `{ "defaultSuffix": "global", "defaultEditor": "default" }`
- **Project config**: `{ "defaultSuffix": "project" }`

The final configuration will be:

- `defaultSuffix`: `"project"` (from project)
- `defaultEditor`: `"default"` (from global)
- Other settings: schema defaults

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
