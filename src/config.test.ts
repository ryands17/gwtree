import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

// Mock cosmiconfig before importing getConfig
let mockSearchResult: any = null;
mock.module('cosmiconfig', () => ({
  cosmiconfig: mock(() => ({
    search: mock(() => Promise.resolve(mockSearchResult)),
  })),
}));

// Import after mocking
const { getConfig, getGlobalConfigPath } = await import('./config');

// Mock global config file content
let mockGlobalConfigContent: string | null = null;

describe('getConfig', () => {
  let mockBunFile: any;

  beforeEach(() => {
    // Reset mock results before each test
    mockSearchResult = null;
    mockGlobalConfigContent = null;

    // Mock Bun.file for global config
    mockBunFile = spyOn(Bun, 'file').mockImplementation(((path: any) => {
      if (typeof path === 'string' && path.includes('gwtree/config.json')) {
        return {
          exists: async () => mockGlobalConfigContent !== null,
          text: async () => mockGlobalConfigContent || '{}',
          json: async () => JSON.parse(mockGlobalConfigContent || '{}'),
        } as any;
      }
      // For other files, return default behavior
      return Bun.file(path);
    }) as any);
  });

  afterEach(() => {
    // Restore Bun.file spy
    if (mockBunFile) {
      mockBunFile.mockRestore();
    }
  });

  it('should return default configuration when no config file exists', async () => {
    mockSearchResult = null;

    const cfg = await getConfig();

    expect(cfg).toEqual({
      defaultBranchChoice: 'current',
      defaultSuffix: '1',
      defaultOpenEditor: true,
      defaultEditor: 'code',
      namePattern: '{repo}-{branch}-wt-{suffix}',
    });
  });

  it('should return default configuration when config file is empty', async () => {
    mockSearchResult = { config: {}, filepath: '.gwtreerc' };

    const cfg = await getConfig();

    expect(cfg).toEqual({
      defaultBranchChoice: 'current',
      defaultSuffix: '1',
      defaultOpenEditor: true,
      defaultEditor: 'code',
      namePattern: '{repo}-{branch}-wt-{suffix}',
    });
  });

  it('should merge partial config with defaults', async () => {
    mockSearchResult = {
      config: {
        defaultSuffix: 'custom',
        defaultEditor: 'none',
      },
      filepath: '.gwtreerc.json',
    };

    const cfg = await getConfig();

    expect(cfg).toEqual({
      defaultBranchChoice: 'current', // default
      defaultSuffix: 'custom', // from config
      defaultOpenEditor: true, // default
      defaultEditor: 'none', // from config
      namePattern: '{repo}-{branch}-wt-{suffix}', // default
    });
  });

  it('should load full custom configuration', async () => {
    mockSearchResult = {
      config: {
        defaultBranchChoice: 'new',
        defaultSuffix: 'dev',
        defaultOpenEditor: false,
        defaultEditor: 'default',
        namePattern: '{repo}-{suffix}',
      },
      filepath: '.gwtreerc.json',
    };

    const cfg = await getConfig();

    expect(cfg).toEqual({
      defaultBranchChoice: 'new',
      defaultSuffix: 'dev',
      defaultOpenEditor: false,
      defaultEditor: 'default',
      namePattern: '{repo}-{suffix}',
    });
  });

  it('should return defaults when config validation fails', async () => {
    mockSearchResult = {
      config: {
        defaultBranchChoice: 'invalid', // invalid enum value
        defaultEditor: 'invalid', // invalid enum value
      },
      filepath: '.gwtreerc.json',
    };

    const consoleWarnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = consoleWarnSpy;

    const cfg = await getConfig();

    // Should fall back to defaults on validation error
    expect(cfg).toEqual({
      defaultBranchChoice: 'current',
      defaultSuffix: '1',
      defaultOpenEditor: true,
      defaultEditor: 'code',
      namePattern: '{repo}-{branch}-wt-{suffix}',
    });

    expect(consoleWarnSpy).toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should validate defaultBranchChoice enum', async () => {
    mockSearchResult = {
      config: {
        defaultBranchChoice: 'current',
      },
      filepath: '.gwtreerc.json',
    };

    const cfg = await getConfig();
    expect(cfg.defaultBranchChoice).toBe('current');
  });

  it('should validate defaultEditor enum', async () => {
    mockSearchResult = {
      config: {
        defaultEditor: 'code',
      },
      filepath: '.gwtreerc.json',
    };

    const cfg = await getConfig();
    expect(cfg.defaultEditor).toBe('code');
  });

  it('should validate boolean fields', async () => {
    mockSearchResult = {
      config: {
        defaultOpenEditor: false,
      },
      filepath: '.gwtreerc.json',
    };

    const cfg = await getConfig();
    expect(cfg.defaultOpenEditor).toBe(false);
  });

  it('should validate string fields', async () => {
    mockSearchResult = {
      config: {
        defaultSuffix: 'my-suffix',
        namePattern: 'custom-{branch}',
      },
      filepath: '.gwtreerc.json',
    };

    const cfg = await getConfig();
    expect(cfg.defaultSuffix).toBe('my-suffix');
    expect(cfg.namePattern).toBe('custom-{branch}');
  });
});

describe('getConfig with global config', () => {
  let mockBunFile: any;

  beforeEach(() => {
    mockSearchResult = null;
    mockGlobalConfigContent = null;

    // Mock Bun.file for global config
    mockBunFile = spyOn(Bun, 'file').mockImplementation(((path: any) => {
      if (typeof path === 'string' && path.includes('gwtree/config.json')) {
        return {
          exists: async () => mockGlobalConfigContent !== null,
          text: async () => mockGlobalConfigContent || '{}',
          json: async () => JSON.parse(mockGlobalConfigContent || '{}'),
        } as any;
      }
      return Bun.file(path);
    }) as any);
  });

  afterEach(() => {
    // Restore Bun.file spy
    if (mockBunFile) {
      mockBunFile.mockRestore();
    }
  });

  it('should merge global and project config with project taking priority', async () => {
    mockGlobalConfigContent = JSON.stringify({
      defaultSuffix: 'global',
      defaultEditor: 'default',
    });
    mockSearchResult = {
      config: { defaultSuffix: 'project' },
      filepath: '.gwtreerc',
    };

    const cfg = await getConfig();

    expect(cfg.defaultSuffix).toBe('project'); // project wins
    expect(cfg.defaultEditor).toBe('default'); // from global
  });

  it('should use global config when no project config exists', async () => {
    mockGlobalConfigContent = JSON.stringify({ defaultSuffix: 'global-value' });
    mockSearchResult = null; // no project config

    const cfg = await getConfig();

    expect(cfg.defaultSuffix).toBe('global-value');
  });

  it('should fall back to defaults when both configs are absent', async () => {
    mockGlobalConfigContent = null; // no global config
    mockSearchResult = null;

    const cfg = await getConfig();

    expect(cfg.defaultSuffix).toBe('1'); // schema default
    expect(cfg.defaultEditor).toBe('code'); // schema default
  });

  it('should not merge hooks arrays - project hooks override global', async () => {
    mockGlobalConfigContent = JSON.stringify({
      hooks: {
        onCreate: {
          runCommands: ['global-command'],
        },
      },
    });
    mockSearchResult = {
      config: {
        hooks: {
          onCreate: {
            runCommands: ['project-command'],
          },
        },
      },
      filepath: '.gwtreerc',
    };

    const cfg = await getConfig();

    expect(cfg.hooks?.onCreate?.runCommands).toEqual(['project-command']);
    // Should NOT be ['global-command', 'project-command']
  });

  it('should use global hooks when project has no hooks', async () => {
    mockGlobalConfigContent = JSON.stringify({
      hooks: {
        onCreate: {
          runCommands: ['global-command'],
        },
      },
    });
    mockSearchResult = {
      config: { defaultSuffix: 'project' },
      filepath: '.gwtreerc',
    };

    const cfg = await getConfig();

    expect(cfg.hooks?.onCreate?.runCommands).toEqual(['global-command']);
  });

  it('should handle invalid global config gracefully', async () => {
    mockGlobalConfigContent = JSON.stringify({
      defaultEditor: 'invalid-value',
    });
    mockSearchResult = null;

    const consoleWarnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = consoleWarnSpy;

    const cfg = await getConfig();

    expect(cfg.defaultEditor).toBe('code'); // falls back to default
    expect(consoleWarnSpy).toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should merge all three levels correctly: defaults <- global <- project', async () => {
    // Global sets defaultSuffix and defaultEditor
    mockGlobalConfigContent = JSON.stringify({
      defaultSuffix: 'global-suffix',
      defaultEditor: 'default',
    });

    // Project sets defaultSuffix (overrides global) and namePattern
    mockSearchResult = {
      config: {
        defaultSuffix: 'project-suffix',
        namePattern: 'project-{branch}',
      },
      filepath: '.gwtreerc',
    };

    const cfg = await getConfig();

    // From project (highest priority)
    expect(cfg.defaultSuffix).toBe('project-suffix');
    expect(cfg.namePattern).toBe('project-{branch}');

    // From global
    expect(cfg.defaultEditor).toBe('default');

    // From defaults (not overridden)
    expect(cfg.defaultBranchChoice).toBe('current');
    expect(cfg.defaultOpenEditor).toBe(true);
  });

  it('should handle global config with partial values', async () => {
    mockGlobalConfigContent = JSON.stringify({
      defaultEditor: 'code',
      // Only one field set
    });
    mockSearchResult = null;

    const cfg = await getConfig();

    expect(cfg.defaultEditor).toBe('code'); // from global
    expect(cfg.defaultSuffix).toBe('1'); // from defaults
    expect(cfg.defaultBranchChoice).toBe('current'); // from defaults
  });
});

describe('getGlobalConfigPath', () => {
  it('should return the path to global config file', () => {
    const path = getGlobalConfigPath();
    // Should contain gwtree/config.json in the path
    expect(path).toContain('gwtree');
    expect(path).toContain('config.json');
  });
});
