import * as p from '@clack/prompts';
import chalk from 'chalk';
import { basename, dirname, join } from 'node:path';
import { copyHookFiles, getConfig, runHookCommands } from '../config';

export interface CreateOptions {
  branch?: string;
  newBranch?: boolean;
  name?: string;
  suffix?: string;
  editor?: string | false;
}

export async function createWorktree(options: CreateOptions = {}) {
  const userConfig = await getConfig();

  const interactive =
    !options.branch ||
    (!options.name && !options.suffix) ||
    options.editor === undefined;
  if (interactive) p.intro('Create Git Worktree');

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

    // --- Branch selection ---
    let branchName: string;
    let baseBranch: string;
    let isNewBranch: boolean;

    if (options.branch) {
      branchName = options.branch;
      isNewBranch = !!options.newBranch || !branches.includes(options.branch);
      baseBranch = isNewBranch ? currentBranch : options.branch;
    } else {
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
        isNewBranch = true;
      } else {
        branchName = branchChoice as string;
        baseBranch = branchChoice as string;
        isNewBranch = false;
      }
    }

    // --- Worktree name ---
    let worktreeName: string;
    let suffixUsed: string | undefined;

    if (options.name) {
      worktreeName = options.name;
    } else {
      const prefix = userConfig.namePattern
        .replace('{repo}', repoName)
        .replace('{branch}', branchName)
        .replace('-{suffix}', '');

      if (options.suffix !== undefined) {
        suffixUsed = options.suffix;
        worktreeName = `${prefix}-${options.suffix}`;
      } else {
        let suffix = await p.text({
          message: `Worktree name: ${chalk.dim(prefix + '-')}`,
          defaultValue: userConfig.defaultSuffix,
          placeholder: `${userConfig.defaultSuffix} (ESC for full edit)`,
        });

        if (p.isCancel(suffix)) {
          suffix = userConfig.defaultSuffix;
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
          suffixUsed = suffix as string;
          worktreeName = `${prefix}-${suffix}`;
        }
      }
    }

    const worktreePath = join(parentDir, worktreeName);

    if (await Bun.file(worktreePath).exists()) {
      if (interactive) p.cancel(`Directory ${worktreeName} already exists`);
      else console.error(`Error: Directory ${worktreeName} already exists`);
      process.exit(1);
    }

    // --- Create worktree ---
    const s = interactive ? p.spinner() : null;
    s?.start('Creating worktree...');

    try {
      let result;
      if (isNewBranch) {
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
          { cwd: gitRoot },
        );
      } else {
        let newBranchForWorktree = `${branchName}-${worktreeName || 'wt'}`;
        let counter = 1;
        while (branches.includes(newBranchForWorktree)) {
          newBranchForWorktree = `${branchName}-${String(suffixUsed) || 'wt'}-${counter}`;
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
          { cwd: gitRoot },
        );
      }
      if (!result.success) {
        throw new Error(result.stderr.toString());
      }
      if (s) s.stop('Worktree created successfully!');
      else console.log('Worktree created successfully!');
    } catch (error) {
      if (s) s.stop('Failed to create worktree');
      else console.error('Failed to create worktree');
      throw error;
    }

    // Run onCreate hooks
    if (userConfig.hooks?.onCreate) {
      const { copyFiles, runCommands } = userConfig.hooks.onCreate;

      if (copyFiles || runCommands) {
        const hookSpinner = interactive ? p.spinner() : null;
        hookSpinner?.start('Running onCreate hooks...');

        try {
          if (copyFiles) {
            if (interactive) p.log.info('Copying files...');
            await copyHookFiles(copyFiles, {
              gitRoot,
              worktreePath,
              branchName,
            });
            if (interactive) p.log.success('Files copied');
          }

          if (runCommands) {
            if (interactive) p.log.info('Running commands...');
            await runHookCommands(runCommands, {
              worktreePath,
              branchName,
            });
            if (interactive) p.log.success('Commands executed');
          }
        } catch (error) {
          console.warn('Hook execution encountered errors:', error);
        } finally {
          hookSpinner?.stop('Hooks completed');
        }
      }
    }

    // --- Editor ---
    const editorChoice: string =
      options.editor === false
        ? 'none'
        : options.editor !== undefined
          ? options.editor
          : await (async () => {
              const choice = await p.select({
                message: 'Open in:',
                options: [
                  { value: 'code', label: 'VS Code' },
                  { value: 'default', label: 'Default ($EDITOR)' },
                  { value: 'none', label: "Don't open" },
                ],
                initialValue: userConfig.defaultEditor,
              });

              if (p.isCancel(choice)) {
                p.outro(`Worktree created at: ${worktreePath}`);
                process.exit(0);
              }
              return choice as string;
            })();

    if (editorChoice !== 'none') {
      const s2 = interactive ? p.spinner() : null;
      s2?.start('Opening editor...');

      try {
        if (editorChoice === 'code') {
          Bun.spawnSync(['code', worktreePath]);
        } else {
          const editor = process.env.EDITOR || 'vim';
          Bun.spawnSync([editor, worktreePath], {
            stdio: ['inherit', 'inherit', 'inherit'],
          });
        }
        if (s2) s2.stop('Editor opened!');
      } catch (error) {
        if (s2) s2.stop('Failed to open editor');
        console.error(
          'Error:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    if (interactive) {
      p.outro(`✓ Worktree ready at: ${worktreePath}\n  Branch: ${branchName}`);
    } else {
      console.log(`Worktree ready at: ${worktreePath}`);
      console.log(`Branch: ${branchName}`);
    }
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
