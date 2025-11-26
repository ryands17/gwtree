import * as p from '@clack/prompts';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { createWorktree } from './create.js';

mock.module('@clack/prompts', () => ({
  intro: mock(() => {}),
  outro: mock(() => {}),
  cancel: mock(() => {}),
  isCancel: mock(() => false),
  select: mock(() => Promise.resolve('main')),
  text: mock(() => Promise.resolve('test')),
  spinner: mock(() => ({
    start: mock(() => {}),
    stop: mock(() => {}),
  })),
}));

mock.module('../config.js', () => ({
  getConfig: mock(() => ({
    defaultBranchChoice: 'current',
    defaultSuffix: '1',
    defaultOpenEditor: true,
    defaultEditor: 'code',
    namePattern: '{repo}-{branch}-wt-{suffix}',
  })),
}));

describe('createWorktree', () => {
  let mockSpawnSync: any;
  let mockFileExists: any;

  beforeEach(() => {
    mock.restore();

    // Mock Bun.spawnSync with default implementation
    mockSpawnSync = spyOn(Bun, 'spawnSync').mockImplementation(
      () =>
        ({
          success: true,
          stdout: Buffer.from(''),
          stderr: Buffer.from(''),
        }) as any,
    );

    // Mock Bun.file().exists()
    mockFileExists = mock(async () => false);
    spyOn(Bun, 'file').mockImplementation(
      () =>
        ({
          exists: mockFileExists,
        }) as any,
    );

    // Reset prompt mocks
    spyOn(p, 'intro').mockImplementation(() => {});
    spyOn(p, 'outro').mockImplementation(() => {});
    spyOn(p, 'cancel').mockImplementation(() => {});
    spyOn(p, 'isCancel').mockReturnValue(false);
    spyOn(p, 'spinner').mockReturnValue({
      start: mock(() => {}),
      stop: mock(() => {}),
    } as any);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should create worktree with existing branch', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\nfeature\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('main')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    await createWorktree();

    expect(p.intro).toHaveBeenCalledWith('Create Git Worktree');
    expect(mockSpawnSync).toHaveBeenCalledWith([
      'git',
      'rev-parse',
      '--show-toplevel',
    ]);
  });

  it('should create worktree with new branch', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\nfeature\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('new')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text')
      .mockResolvedValueOnce('new-feature')
      .mockResolvedValueOnce('test');

    await createWorktree();

    expect(p.intro).toHaveBeenCalledWith('Create Git Worktree');
  });

  it('should validate new branch name is required', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select').mockResolvedValueOnce('new');

    spyOn(p, 'text').mockImplementation((opts: any) => {
      if (opts.validate) {
        expect(opts.validate('')).toBe('Branch name is required');
      }
      return Promise.resolve('test-branch');
    });

    spyOn(p, 'isCancel').mockReturnValue(true);
    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await createWorktree();

    exitSpy.mockRestore();
  });

  it('should validate branch does not already exist', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\nexisting\n'),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select').mockResolvedValueOnce('new');

    spyOn(p, 'text').mockImplementation((opts: any) => {
      if (opts.validate) {
        expect(opts.validate('existing')).toBe('Branch already exists');
      }
      return Promise.resolve('test-branch');
    });

    spyOn(p, 'isCancel').mockReturnValue(true);
    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await createWorktree();

    exitSpy.mockRestore();
  });

  it('should handle existing directory', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      });

    mockFileExists.mockResolvedValue(true);
    spyOn(p, 'select').mockResolvedValueOnce('main');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await createWorktree();

    expect(p.cancel).toHaveBeenCalledWith(
      expect.stringContaining('already exists'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should open VS Code when selected', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('main')
      .mockResolvedValueOnce('code');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    await createWorktree();

    expect(mockSpawnSync).toHaveBeenCalledWith(['code', expect.any(String)]);
  });

  it('should open default editor when selected', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('main')
      .mockResolvedValueOnce('default');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    process.env.EDITOR = 'nano';

    await createWorktree();

    expect(mockSpawnSync).toHaveBeenCalledWith(
      ['nano', expect.any(String)],
      expect.any(Object),
    );
  });

  it('should handle editor open failure', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      .mockImplementation(() => {
        throw new Error('Editor not found');
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('main')
      .mockResolvedValueOnce('code');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    const consoleErrorSpy = spyOn(console, 'error').mockImplementation(
      () => {},
    );

    await createWorktree();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Editor not found');
    consoleErrorSpy.mockRestore();
  });

  it('should handle worktree creation failure', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: false,
        stdout: Buffer.from(''),
        stderr: Buffer.from('Failed to create worktree'),
      });

    spyOn(p, 'select').mockResolvedValueOnce('main');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    await expect(createWorktree()).rejects.toThrow('Failed to create worktree');
  });

  it('should create unique branch name when branch exists', async () => {
    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\nmain-test\nmain-test-1\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('main')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text').mockResolvedValueOnce('test');

    await createWorktree();

    expect(mockSpawnSync).toHaveBeenCalledWith(
      expect.arrayContaining(['git', 'worktree', 'add', '-b', 'main-test-2']),
      expect.any(Object),
    );
  });
});
