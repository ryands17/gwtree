import { cosmiconfig } from 'cosmiconfig';
import { basename, dirname, join } from 'node:path';
import { z } from 'zod';

// Zod schema with defaults
const configSchema = z.object({
  defaultBranchChoice: z.enum(['current', 'new']).default('current'),
  defaultSuffix: z.string().default('1'),
  defaultOpenEditor: z.boolean().default(true),
  defaultEditor: z.enum(['code', 'default', 'none']).default('code'),
  namePattern: z.string().default('{repo}-{branch}-wt-{suffix}'),
  hooks: z
    .object({
      onCreate: z
        .object({
          copyFiles: z
            .array(
              z.object({
                src: z.string(),
                dst: z.string(),
              }),
            )
            .optional(),
          runCommands: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
});

export type GWTreeConfig = z.infer<typeof configSchema>;

/**
 * Get configuration from .gwtreerc files or defaults
 * Searches for config in the following order:
 * - .gwtreerc
 * - .gwtreerc.json
 * - .gwtreerc.js
 * - gwtree field in package.json
 */
export async function getConfig(): Promise<GWTreeConfig> {
  const explorer = cosmiconfig('gwtree');
  const result = await explorer.search();

  if (!result || !result.config) {
    // No config file found, return defaults
    return configSchema.parse({});
  }

  const { success, data, error } = await configSchema.safeParseAsync(
    result.config,
  );
  if (!success) {
    console.warn('Config validation failed, using defaults:', error);
    return configSchema.parse({});
  }
  return data;
}

/**
 * Helper function to recursively copy a directory
 */
async function copyDirectory(src: string, dst: string): Promise<void> {
  // Create destination directory
  await Bun.spawn(['mkdir', '-p', dst]).exited;

  // Use cp -r for recursive copy
  const result = Bun.spawnSync(['cp', '-r', `${src}/.`, dst]);

  if (!result.success) {
    throw new Error(`Failed to copy directory: ${result.stderr.toString()}`);
  }
}

/**
 * Copy files/directories from main worktree to new worktree
 */
export async function copyHookFiles(
  copyFiles: Array<{ src: string; dst: string }> | undefined,
  context: { gitRoot: string; worktreePath: string; branchName: string },
): Promise<void> {
  if (!copyFiles || copyFiles.length === 0) return;

  for (const { src, dst } of copyFiles) {
    try {
      // Resolve source path
      let srcPath: string;
      if (src.startsWith('root/')) {
        srcPath = join(context.gitRoot, src.slice(5));
      } else {
        srcPath = join(context.gitRoot, src);
      }

      // Determine if source is a file or directory
      const stat = await Bun.file(srcPath).stat();
      const isDirectory = stat.isDirectory();

      // Resolve destination path
      let dstPath: string;
      if (dst === '.') {
        dstPath = join(context.worktreePath, basename(srcPath));
      } else {
        dstPath = join(context.worktreePath, dst);
      }

      if (isDirectory) {
        // Copy directory recursively
        await copyDirectory(srcPath, dstPath);
      } else {
        // Check if source exists
        if (!(await Bun.file(srcPath).exists())) {
          console.warn(`Hook copyFiles: Source not found: ${srcPath}`);
          continue;
        }

        // Ensure parent directory exists
        const parentDir = dirname(dstPath);
        await Bun.spawn(['mkdir', '-p', parentDir]).exited;

        // Copy single file
        const fileContent = await Bun.file(srcPath).arrayBuffer();
        await Bun.write(dstPath, fileContent);
      }
    } catch (error) {
      console.warn(`Hook copyFiles failed for ${src} -> ${dst}:`, error);
    }
  }
}

/**
 * Run commands in the newly created worktree
 */
export async function runHookCommands(
  commands: string[] | undefined,
  context: { worktreePath: string; branchName: string },
): Promise<void> {
  if (!commands || commands.length === 0) return;

  for (const command of commands) {
    try {
      // Replace variables
      const expandedCommand = command
        .replace(/\{worktreePath\}/g, context.worktreePath)
        .replace(/\{branchName\}/g, context.branchName);

      // Execute in worktree directory
      const result = Bun.spawnSync(['sh', '-c', expandedCommand], {
        cwd: context.worktreePath,
      });

      if (!result.success) {
        console.warn(`Hook command failed: ${expandedCommand}`);
        console.warn(result.stderr.toString());
      }
    } catch (error) {
      console.warn(`Hook command error: ${command}:`, error);
    }
  }
}
