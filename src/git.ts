import { basename } from 'node:path';

export interface Worktree {
  path: string;
  branch?: string;
  head?: string;
}

export function parseWorktrees(cwd?: string): Worktree[] {
  const args = ['git', 'worktree', 'list', '--porcelain'];
  const result = cwd ? Bun.spawnSync(args, { cwd }) : Bun.spawnSync(args);
  const output = result.stdout.toString();

  const worktrees: Worktree[] = [];
  const lines = output.trim().split('\n');
  let current: any = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current);
      current = { path: line.replace('worktree ', '') };
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '');
    } else if (line.startsWith('HEAD ')) {
      current.head = line.replace('HEAD ', '').substring(0, 7);
    }
  }
  if (current.path) worktrees.push(current);

  return worktrees;
}

export function checkWorktreeInUse(
  branch: string,
  cwd?: string,
): string | null {
  const worktrees = parseWorktrees(cwd);
  for (const wt of worktrees) {
    if (wt.branch === branch) {
      return wt.path;
    }
  }
  return null;
}

export function findWorktree(
  worktrees: Worktree[],
  query: string,
): string | undefined {
  const byPath = worktrees.find((wt) => wt.path === query);
  if (byPath) return byPath.path;

  const byName = worktrees.find((wt) => basename(wt.path) === query);
  if (byName) return byName.path;

  const byBranch = worktrees.find((wt) => wt.branch === query);
  if (byBranch) return byBranch.path;

  return undefined;
}

export function deleteBranch(branch: string, cwd?: string): void {
  const args = ['git', 'branch', '-D', branch];
  const result = cwd ? Bun.spawnSync(args, { cwd }) : Bun.spawnSync(args);
  if (!result.success) {
    throw new Error(result.stderr.toString());
  }
}

export function getGitRoot(): string {
  const result = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel']);
  if (!result.success) {
    throw new Error('not a git repository');
  }
  return result.stdout.toString().trim();
}
