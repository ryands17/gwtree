# Agent Guidelines for gwtree

## Commands

- **Build:** `bun build` (no build step required for this CLI)
- **Dev:** `bun run --watch src/index.ts`
- **Test All:** `bun test`
- **Test Single:** `bun test <filename>` (e.g., `bun test create`, `bun test list`)
- **Format:** Automatic via husky pre-commit hook (prettier with singleQuote: true)

## Code Style

- **Runtime:** Use Bun APIs exclusively - `Bun.spawnSync()`, `Bun.file()`, NOT Node.js `execSync` or `fs`
- **Imports:** Use `node:` prefix for Node built-ins (e.g., `node:path`). No need to use `.js` for relative imports
- **Commands:** Use array syntax for `Bun.spawnSync(['git', 'worktree', 'list'])` NOT strings
- **Types:** Strict TypeScript enabled; use explicit types, avoid `any` when possible
- **Error Handling:** Check `result.success` from `Bun.spawnSync`, throw errors with `result.stderr.toString()`
- **Testing:** Use Bun test API (`bun:test`), `mock.module()` for modules, `spyOn()` for functions
- **Mocking:** Mock `Bun.spawnSync` with default implementation: `spyOn(Bun, 'spawnSync').mockImplementation(() => ({ success: true, stdout: Buffer.from(''), stderr: Buffer.from('') }))`

## Architecture

- Commands in `src/commands/*.ts` with corresponding `*.test.ts` files
- Each command exports async function, uses `@clack/prompts` for UI
- Config management via `conf` library in `src/config.ts`
