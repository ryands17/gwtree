import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

// Zod schema with defaults
const configSchema = z.object({
  defaultBranchChoice: z.enum(['current', 'new']).default('current'),
  defaultSuffix: z.string().default('1'),
  defaultOpenEditor: z.boolean().default(true),
  defaultEditor: z.enum(['code', 'default', 'none']).default('code'),
  namePattern: z.string().default('{repo}-{branch}-wt-{suffix}'),
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

  const { success, data } = await configSchema.safeParseAsync(result.config);
  if (!success) {
    return configSchema.parse({});
  }
  return data;
}
