import * as p from '@clack/prompts';
import { basename } from 'node:path';

export interface RemoveOptions {
  path?: string;
  force?: boolean;
}

function parseWorktrees() {
  const result = Bun.spawnSync(['git', 'worktree', 'list', '--porcelain']);
  const output = result.stdout.toString();

  const worktrees: { path: string; branch?: string; head?: string }[] = [];
  const lines = output.trim().split('\n');
  let current: any = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current);
      current = { path: line.replace('worktree ', '') };
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch ', '').split('/').pop();
    } else if (line.startsWith('HEAD ')) {
      current.head = line.replace('HEAD ', '').substring(0, 7);
    }
  }
  if (current.path) worktrees.push(current);

  return worktrees;
}

function findWorktree(
  worktrees: { path: string; branch?: string; head?: string }[],
  query: string,
): string | undefined {
  // Match by full path
  const byPath = worktrees.find((wt) => wt.path === query);
  if (byPath) return byPath.path;

  // Match by directory basename
  const byName = worktrees.find((wt) => basename(wt.path) === query);
  if (byName) return byName.path;

  // Match by branch name
  const byBranch = worktrees.find((wt) => wt.branch === query);
  if (byBranch) return byBranch.path;

  return undefined;
}

export async function removeWorktree(options: RemoveOptions = {}) {
  const interactive = !options.path;
  if (interactive) p.intro('Remove Git Worktree');

  try {
    const worktrees = parseWorktrees();
    const nonMainWorktrees = worktrees.slice(1);

    if (nonMainWorktrees.length === 0) {
      if (interactive) p.cancel('No worktrees to remove');
      else console.error('No worktrees to remove');
      process.exit(0);
    }

    // --- Select worktree ---
    let worktreeChoice: string;

    if (options.path) {
      const match = findWorktree(nonMainWorktrees, options.path);
      if (!match) {
        console.error(`Worktree not found: ${options.path}`);
        process.exit(1);
      }
      worktreeChoice = match;
    } else {
      const choice = await p.select({
        message: 'Select worktree to remove:',
        options: nonMainWorktrees.map((wt) => ({
          value: wt.path,
          label: `${wt.branch || wt.head} - ${wt.path}`,
        })),
      });

      if (p.isCancel(choice)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }
      worktreeChoice = choice as string;
    }

    // --- Confirm ---
    if (!options.force) {
      const confirm = await p.confirm({
        message: `Remove worktree at ${worktreeChoice}?`,
        initialValue: false,
      });

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }
    }

    // --- Remove ---
    const s = interactive ? p.spinner() : null;
    s?.start('Removing worktree...');

    try {
      const removeResult = Bun.spawnSync([
        'git',
        'worktree',
        'remove',
        worktreeChoice,
      ]);
      if (!removeResult.success) {
        if (options.force) {
          // Auto force-remove in non-interactive mode
          const forceResult = Bun.spawnSync([
            'git',
            'worktree',
            'remove',
            '--force',
            worktreeChoice,
          ]);
          if (!forceResult.success) {
            throw new Error(forceResult.stderr.toString());
          }
        } else {
          if (s) s.stop('Failed to remove worktree');
          const forceConfirm = await p.confirm({
            message: 'Force remove? (worktree may have uncommitted changes)',
            initialValue: false,
          });
          if (p.isCancel(forceConfirm) || !forceConfirm) {
            throw new Error(removeResult.stderr.toString());
          }
          s?.start('Force removing worktree...');
          const forceResult = Bun.spawnSync([
            'git',
            'worktree',
            'remove',
            '--force',
            worktreeChoice,
          ]);
          if (!forceResult.success) {
            throw new Error(forceResult.stderr.toString());
          }
        }
      }
      if (s) s.stop('Worktree removed successfully!');
      else console.log('Worktree removed successfully!');
    } catch (error) {
      if (s) s.stop('Failed to remove worktree');
      else console.error('Failed to remove worktree');
      throw error;
    }

    if (interactive) p.outro('✓ Done');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not a git repository')
    ) {
      if (interactive) p.cancel('Error: Not in a git repository');
      else console.error('Error: Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}
