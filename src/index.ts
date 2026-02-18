import { Command } from 'commander';
import { createWorktree } from './commands/create';
import { listWorktrees } from './commands/list';
import { removeWorktree } from './commands/remove';

import * as pk from '../package.json';

const program = new Command();

const banner = `
 ██████╗ ██╗    ██╗████████╗
██╔════╝ ██║    ██║╚══██╔══╝
██║  ███╗██║ █╗ ██║   ██║
██║   ██║██║███╗██║   ██║
╚██████╔╝╚███╔███╔╝   ██║
 ╚═════╝  ╚══╝╚══╝    ╚═╝
`;

function isNonInteractive(opts: Record<string, unknown>): boolean {
  return Object.keys(opts).some(
    (k) => opts[k] !== undefined && opts[k] !== false,
  );
}

program
  .name('gwtree')
  .description('Git worktree manager for parallel development')
  .version(pk.version, '-v, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for commands');

program
  .command('create', { isDefault: true })
  .description('Create a new git worktree')
  .option('--branch <name>', 'Branch to use (existing) or create (new)')
  .option('--new-branch', 'Create the branch instead of using existing')
  .option('--name <name>', 'Worktree directory name (skips pattern)')
  .option('--suffix <suffix>', 'Suffix for name pattern')
  .option('--editor <editor>', 'Editor to open: code | default | none')
  .option('--no-editor', 'Do not open an editor')
  .action(async (opts) => {
    if (!isNonInteractive(opts)) console.log(banner);
    await createWorktree(opts);
  });

program
  .command('list')
  .alias('ls')
  .description('List all git worktrees')
  .option('--json', 'Output as JSON (non-interactive)')
  .action(async (opts) => {
    if (!isNonInteractive(opts)) console.log(banner);
    await listWorktrees(opts);
  });

program
  .command('remove')
  .alias('rm')
  .description('Remove a git worktree')
  .argument('[path]', 'Worktree path, directory name, or branch name')
  .option('--force', 'Force removal without confirmation')
  .action(async (path, opts) => {
    if (!path && !isNonInteractive(opts)) console.log(banner);
    await removeWorktree({ ...opts, path });
  });

program.parse();
