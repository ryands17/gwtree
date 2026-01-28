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
 * Recursively search for config files from current directory to home directory
 */
async function findConfigFile(startDir: string): Promise<string | null> {
  const homeDir = Bun.env.HOME || process.env.HOME;
  if (!homeDir) return null;

  const configNames = ['.gwtreerc', 'gwtree.json', '.gwtree.json'];
  let currentDir = startDir;

  while (true) {
    // Check for config files in current directory
    for (const name of configNames) {
      const configPath = join(currentDir, name);
      if (await Bun.file(configPath).exists()) {
        return configPath;
      }
    }

    // Stop if we've reached home directory
    if (currentDir === homeDir) break;

    // Move up one directory
    const parentDir = dirname(currentDir);

    // Stop if we can't go up anymore (reached root)
    if (parentDir === currentDir) break;

    currentDir = parentDir;
  }

  return null;
}

/**
 * Get configuration by searching for config files and parsing with Zod
 * Returns defaults if no config file is found or parsing fails
 */
export async function getConfig(): Promise<GWTreeConfig> {
  try {
    const configPath = await findConfigFile(process.cwd());

    if (!configPath) {
      // No config file found, return defaults
      return configSchema.parse({});
    }

    // Read and parse config file
    const configData = await Bun.file(configPath).json();
    return configSchema.parse(configData);
  } catch (error) {
    // If reading or parsing fails, return defaults
    console.warn('Failed to load config, using defaults:');
    return configSchema.parse({});
  }
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
