import * as p from '@clack/prompts';
import chalk from 'chalk';
import { basename } from 'node:path';
import { parseWorktrees } from '../git';
import { handleGitError } from '../utils';

export interface ListOptions {
  json?: boolean;
}

export async function listWorktrees(options: ListOptions = {}) {
  if (options.json) {
    const worktrees = parseWorktrees();
    console.log(JSON.stringify(worktrees, null, 2));
    return;
  }

  p.intro('Manage Worktrees');

  try {
    while (true) {
      const worktrees = parseWorktrees();
      const nonMainWorktrees = worktrees.slice(1);

      if (nonMainWorktrees.length === 0) {
        p.cancel('No worktrees found');
        process.exit(0);
      }

      const worktreeChoice = await p.select({
        message: 'Select worktree to delete (ESC to exit):',
        options: nonMainWorktrees.map((wt) => ({
          value: wt.path,
          label: `${wt.branch || wt.head} ${chalk.dim(basename(wt.path))}`,
        })),
      });

      if (p.isCancel(worktreeChoice)) {
        p.outro('Done');
        process.exit(0);
      }

      const selectedName = basename(worktreeChoice as string);
      const confirm = await p.confirm({
        message: `Delete ${selectedName}?`,
        initialValue: false,
      });

      if (p.isCancel(confirm)) {
        p.outro('Done');
        process.exit(0);
      }

      if (confirm) {
        const s = p.spinner();
        s.start('Removing worktree...');

        try {
          const removeResult = Bun.spawnSync([
            'git',
            'worktree',
            'remove',
            worktreeChoice as string,
          ]);
          if (!removeResult.success) {
            throw new Error(removeResult.stderr.toString());
          }
          s.stop(`${selectedName} removed!`);
        } catch (error) {
          s.stop('Failed to remove worktree');
          throw error;
        }
      }
    }
  } catch (error) {
    handleGitError(error, true);
  }
}
