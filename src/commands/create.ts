import * as p from '@clack/prompts';
import chalk from 'chalk';
import { basename, dirname, join } from 'node:path';
import { getConfig } from '../config';

export async function createWorktree() {
  const userConfig = await getConfig();
  p.intro('Create Git Worktree');

  try {
    const gitRootResult = Bun.spawnSync([
      'git',
      'rev-parse',
      '--show-toplevel',
    ]);
    if (!gitRootResult.success) {
      throw new Error('not a git repository');
    }
    const gitRoot = gitRootResult.stdout.toString().trim();

    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);

    const currentBranchResult = Bun.spawnSync(
      ['git', 'branch', '--show-current'],
      { cwd: gitRoot },
    );
    const currentBranch = currentBranchResult.stdout.toString().trim();

    const branchesResult = Bun.spawnSync(
      ['git', 'branch', '--format=%(refname:short)'],
      { cwd: gitRoot },
    );
    const branches = branchesResult.stdout
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    const mainBranch =
      branches.find((b) => b === 'main' || b === 'master') || currentBranch;

    const branchChoice = await p.select({
      message: 'Branch:',
      options: [
        { value: mainBranch, label: mainBranch },
        { value: 'new', label: 'Create new branch' },
      ],
      initialValue:
        userConfig.defaultBranchChoice === 'new' ? 'new' : mainBranch,
    });

    if (p.isCancel(branchChoice)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    let branchName: string;
    let baseBranch: string;

    if (branchChoice === 'new') {
      const newBranchName = await p.text({
        message: 'New branch name:',
        placeholder: `${currentBranch}-worktree`,
        validate: (value) => {
          if (!value) return 'Branch name is required';
          if (branches.includes(value)) return 'Branch already exists';
        },
      });

      if (p.isCancel(newBranchName)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      branchName = newBranchName as string;
      baseBranch = currentBranch;
    } else {
      branchName = branchChoice as string;
      baseBranch = branchChoice as string;
    }

    const prefix = userConfig.namePattern
      .replace('{repo}', repoName)
      .replace('{branch}', branchName)
      .replace('-{suffix}', '');

    const suffix = await p.text({
      message: `Worktree name: ${chalk.dim(prefix + '-')}`,
      defaultValue: userConfig.defaultSuffix,
      placeholder: `${userConfig.defaultSuffix} (ESC for full edit)`,
    });

    let worktreeName: string;

    if (p.isCancel(suffix)) {
      const defaultName = `${repoName}-${branchName}`;

      const customName = await p.text({
        message: 'Custom name:',
        defaultValue: defaultName,
        placeholder: defaultName,
      });

      if (p.isCancel(customName)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      worktreeName = customName as string;
    } else {
      worktreeName = `${prefix}-${suffix}`;
    }

    const worktreePath = join(parentDir, worktreeName);

    if (await Bun.file(worktreePath).exists()) {
      p.cancel(`Directory ${worktreeName} already exists`);
      process.exit(1);
    }

    if (p.isCancel(worktreeName)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const s = p.spinner();
    s.start('Creating worktree...');

    try {
      let result;
      if (branchChoice === 'new') {
        result = Bun.spawnSync(
          [
            'git',
            'worktree',
            'add',
            '-b',
            branchName,
            worktreePath,
            baseBranch,
          ],
          {
            cwd: gitRoot,
          },
        );
      } else {
        let newBranchForWorktree = `${branchName}-${String(suffix) || 'wt'}`;
        let counter = 1;
        while (branches.includes(newBranchForWorktree)) {
          newBranchForWorktree = `${branchName}-${String(suffix) || 'wt'}-${counter}`;
          counter++;
        }
        result = Bun.spawnSync(
          [
            'git',
            'worktree',
            'add',
            '-b',
            newBranchForWorktree,
            worktreePath,
            baseBranch,
          ],
          {
            cwd: gitRoot,
          },
        );
      }
      if (!result.success) {
        throw new Error(result.stderr.toString());
      }
      s.stop('Worktree created successfully!');
    } catch (error) {
      s.stop('Failed to create worktree');
      throw error;
    }

    const editorChoice = await p.select({
      message: 'Open in:',
      options: [
        { value: 'code', label: 'VS Code' },
        { value: 'default', label: 'Default ($EDITOR)' },
        { value: 'none', label: "Don't open" },
      ],
      initialValue: userConfig.defaultEditor,
    });

    if (p.isCancel(editorChoice)) {
      p.outro(`Worktree created at: ${worktreePath}`);
      process.exit(0);
    }

    if (editorChoice !== 'none') {
      const s2 = p.spinner();
      s2.start('Opening editor...');

      try {
        if (editorChoice === 'code') {
          Bun.spawnSync(['code', worktreePath]);
        } else {
          const editor = process.env.EDITOR || 'vim';
          Bun.spawnSync([editor, worktreePath], {
            stdio: ['inherit', 'inherit', 'inherit'],
          });
        }
        s2.stop('Editor opened!');
      } catch (error) {
        s2.stop('Failed to open editor');
        console.error(
          'Error:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    p.outro(`✓ Worktree ready at: ${worktreePath}\n  Branch: ${branchName}`);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not a git repository')
    ) {
      p.cancel('Error: Not in a git repository');
      process.exit(1);
    }
    throw error;
  }
}
