import { cosmiconfig } from 'cosmiconfig';
import { homedir } from 'node:os';
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
 * Get the path to the global config file
 * Platform-specific locations:
 * - macOS: ~/Library/Preferences/gwtree/config.json
 * - Linux: ~/.config/gwtree/config.json
 * - Windows: %APPDATA%\gwtree\config.json
 */
export function getGlobalConfigPath(): string {
  const home = homedir();
  const platform = process.platform;

  if (platform === 'darwin') {
    return join(home, 'Library', 'Preferences', 'gwtree', 'config.json');
  } else if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'gwtree', 'config.json');
  } else {
    // Linux and others
    const configHome = process.env.XDG_CONFIG_HOME || join(home, '.config');
    return join(configHome, 'gwtree', 'config.json');
  }
}

/**
 * Read global config from file system
 */
async function readGlobalConfig(): Promise<Partial<GWTreeConfig>> {
  try {
    const configPath = getGlobalConfigPath();
    const file = Bun.file(configPath);

    if (!(await file.exists())) {
      return {};
    }

    const content = await file.json();
    return content;
  } catch (error) {
    // Silently return empty config if file doesn't exist or is invalid
    return {};
  }
}

/**
 * Get configuration with priority: defaults <- global <- project
 *
 * Priority order (highest to lowest):
 * 1. Project-level config (.gwtreerc, .gwtreerc.json, .gwtreerc.js, package.json)
 * 2. Global user-level config (~/.config/gwtree/config.json)
 * 3. Schema defaults
 */
export async function getConfig(): Promise<GWTreeConfig> {
  // 1. Get defaults from schema
  const defaults = configSchema.parse({});

  // 2. Get global config from ~/.config/gwtree/config.json
  const globalConfig = await readGlobalConfig();

  // 3. Get project config from cosmiconfig (raw, not validated yet)
  const explorer = cosmiconfig('gwtree');
  const result = await explorer.search();

  let projectConfig: Record<string, any> = {};
  if (result?.config) {
    projectConfig = result.config;
  }

  // 4. Merge: defaults <- global <- project (using raw configs)
  const merged = {
    ...defaults,
    ...globalConfig,
    ...projectConfig,
  };

  // Handle hooks separately - project hooks completely override global (no array merging)
  if (projectConfig.hooks !== undefined) {
    merged.hooks = projectConfig.hooks;
  } else if (globalConfig.hooks !== undefined) {
    merged.hooks = globalConfig.hooks;
  }

  // 5. Final validation and return
  const { success, data, error } = await configSchema.safeParseAsync(merged);
  if (!success) {
    console.warn(
      'Merged config validation failed, using defaults:',
      error.message,
    );
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
