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

console.log(banner);

program
  .name('gwtree')
  .description('Git worktree manager for parallel development')
  .version(pk.version, '-v, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for commands');

program
  .command('create', { isDefault: true })
  .description('Create a new git worktree')
  .action(createWorktree);

program
  .command('list')
  .alias('ls')
  .description('List all git worktrees')
  .action(listWorktrees);

program
  .command('remove')
  .alias('rm')
  .description('Remove a git worktree')
  .action(removeWorktree);

program.parse();
