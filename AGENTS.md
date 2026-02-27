# Agent Guidelines for gwtree

## Commands

Check `package.json` for relevant commands

## Architecture

- Commands in `src/commands/*.ts` with corresponding `*.test.ts` files
- Each command exports async function, uses `@clack/prompts` for UI
- Config management via `conf` library in `src/config.ts`

## Dev workflow

- Always test the feature after implementation using `bun test`
