import { describe, expect, it, mock, beforeEach } from 'bun:test';

// Mock cosmiconfig before importing getConfig
let mockSearchResult: any = null;
mock.module('cosmiconfig', () => ({
  cosmiconfig: mock(() => ({
    search: mock(() => Promise.resolve(mockSearchResult)),
  })),
}));

// Import after mocking
const { getConfig } = await import('./config');

describe('getConfig', () => {
  beforeEach(() => {
    // Reset mock result before each test
    mockSearchResult = null;
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
