import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { getConfig } from './config';

describe('getConfig', () => {
  let mockBunFile: any;
  let mockConfigExists = false;
  let mockConfigContent: any = {};

  beforeEach(() => {
    mockConfigExists = false;
    mockConfigContent = {};

    // Mock Bun.file to control config file behavior
    mockBunFile = spyOn(Bun, 'file').mockImplementation(((path: any) => {
      return {
        exists: async () => mockConfigExists,
        json: async () => mockConfigContent,
      } as any;
    }) as any);
  });

  afterEach(() => {
    if (mockBunFile) {
      mockBunFile.mockRestore();
    }
  });

  it('should return default configuration when no config file exists', async () => {
    mockConfigExists = false;

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
    mockConfigExists = true;
    mockConfigContent = {};

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
    mockConfigExists = true;
    mockConfigContent = {
      defaultSuffix: 'custom',
      defaultEditor: 'none',
    };

    const cfg = await getConfig();

    expect(cfg).toEqual({
      defaultBranchChoice: 'current',
      defaultSuffix: 'custom',
      defaultOpenEditor: true,
      defaultEditor: 'none',
      namePattern: '{repo}-{branch}-wt-{suffix}',
    });
  });

  it('should load full custom configuration', async () => {
    mockConfigExists = true;
    mockConfigContent = {
      defaultBranchChoice: 'new',
      defaultSuffix: 'dev',
      defaultOpenEditor: false,
      defaultEditor: 'default',
      namePattern: '{repo}-{suffix}',
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
    mockConfigExists = true;
    mockConfigContent = {
      defaultBranchChoice: 'invalid',
      defaultEditor: 'invalid',
    };

    const cfg = await getConfig();

    expect(cfg).toEqual({
      defaultBranchChoice: 'current',
      defaultSuffix: '1',
      defaultOpenEditor: true,
      defaultEditor: 'code',
      namePattern: '{repo}-{branch}-wt-{suffix}',
    });
  });
});
