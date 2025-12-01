# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-01

### Added

- Initial release
- Interactive worktree creation with smart defaults
- List and delete worktrees interactively
- Remove worktree command
- Configurable defaults via `~/.config/gwtree/config.json`
- Smart naming pattern: `{repo}-{branch}-wt-{suffix}`
- Auto branch creation for unique worktree branches
- Command aliases: `gwt`, `gwt ls`, `gwt rm`
- Editor integration (VS Code, default editor)
- Search and filter in worktree list
- `onCreate` hooks that help setup worktrees efficiently

[1.0.0]: https://github.com/ahmadawais/gwtree/releases/tag/v1.0.0
