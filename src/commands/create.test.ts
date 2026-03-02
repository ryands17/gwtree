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
import { createWorktree } from './create';

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

mock.module('../config', () => ({
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

    let branchValidateCalled = false;
    spyOn(p, 'text').mockImplementation((opts: any) => {
      if (opts.validate && opts.message === 'New branch name:') {
        expect(opts.validate('')).toBe('Branch name is required');
        branchValidateCalled = true;
      }
      return Promise.resolve('test-branch');
    });

    spyOn(p, 'isCancel').mockReturnValue(true);
    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await createWorktree();

    expect(branchValidateCalled).toBe(true);
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

    let branchValidateCalled = false;
    spyOn(p, 'text').mockImplementation((opts: any) => {
      if (opts.validate && opts.message === 'New branch name:') {
        expect(opts.validate('existing')).toBe('Branch already exists');
        branchValidateCalled = true;
      }
      return Promise.resolve('test-branch');
    });

    spyOn(p, 'isCancel').mockReturnValue(true);
    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await createWorktree();

    expect(branchValidateCalled).toBe(true);
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

    expect(createWorktree()).rejects.toThrow('Failed to create worktree');
  });

  it('should create worktree with existing branch via direct checkout', async () => {
    mockSpawnSync
      // git rev-parse --show-toplevel
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      // git branch --show-current
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      // git branch --format
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\nfeature\n'),
        stderr: Buffer.from(''),
      })
      // git worktree list --porcelain (no conflict)
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(
          'worktree /home/user/repo\nbranch refs/heads/main\n\n',
        ),
        stderr: Buffer.from(''),
      })
      // git fetch --all
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      // git branch -r --format
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('origin/main\norigin/feature\n'),
        stderr: Buffer.from(''),
      })
      // git worktree add (direct checkout)
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('existing')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text')
      .mockResolvedValueOnce('feature')
      .mockResolvedValueOnce('test');

    await createWorktree();

    // Verify direct checkout: git worktree add <path> <branch> (no -b)
    const worktreeAddCall = mockSpawnSync.mock.calls.find(
      (call: any) =>
        Array.isArray(call[0]) &&
        call[0][0] === 'git' &&
        call[0][1] === 'worktree' &&
        call[0][2] === 'add' &&
        !call[0].includes('-b'),
    );
    expect(worktreeAddCall).toBeDefined();
    expect(worktreeAddCall[0]).toContain('feature');
  });

  it('should error when existing branch is already in a worktree', async () => {
    mockSpawnSync
      // git rev-parse --show-toplevel
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      // git branch --show-current
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      // git branch --format
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\nfeature\n'),
        stderr: Buffer.from(''),
      })
      // git worktree list --porcelain (branch in use)
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(
          'worktree /home/user/repo\nbranch refs/heads/main\n\nworktree /home/user/repo-feature-wt\nbranch refs/heads/feature\n\n',
        ),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select').mockResolvedValueOnce('existing');
    spyOn(p, 'text').mockResolvedValueOnce('feature');

    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await createWorktree();

    expect(p.cancel).toHaveBeenCalledWith(
      expect.stringContaining('Worktree already exists for branch feature'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should fall back to new branch when existing branch not found', async () => {
    mockSpawnSync
      // git rev-parse --show-toplevel
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('/home/user/repo\n'),
        stderr: Buffer.from(''),
      })
      // git branch --show-current
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      // git branch --format
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('main\n'),
        stderr: Buffer.from(''),
      })
      // git worktree list --porcelain
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(
          'worktree /home/user/repo\nbranch refs/heads/main\n\n',
        ),
        stderr: Buffer.from(''),
      })
      // git fetch --all
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      // git branch -r --format (no match)
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('origin/main\n'),
        stderr: Buffer.from(''),
      })
      // git worktree add -b (new branch fallback)
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('existing')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text')
      .mockResolvedValueOnce('nonexistent-branch')
      .mockResolvedValueOnce('test');

    await createWorktree();

    // Verify new branch creation: git worktree add -b <branch> <path> <base>
    const worktreeAddCall = mockSpawnSync.mock.calls.find(
      (call: any) =>
        Array.isArray(call[0]) &&
        call[0][0] === 'git' &&
        call[0][1] === 'worktree' &&
        call[0][2] === 'add' &&
        call[0][3] === '-b',
    );
    expect(worktreeAddCall).toBeDefined();
    expect(worktreeAddCall[0]).toContain('nonexistent-branch');
  });

  it('should sanitize slashes in branch name for folder name', async () => {
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
        stdout: Buffer.from('main\nfeature/login\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(
          'worktree /home/user/repo\nbranch refs/heads/main\n\n',
        ),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('origin/main\norigin/feature/login\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('existing')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text')
      .mockResolvedValueOnce('feature/login')
      .mockResolvedValueOnce('test');

    await createWorktree();

    const worktreeAddCall = mockSpawnSync.mock.calls.find(
      (call: any) =>
        Array.isArray(call[0]) &&
        call[0][0] === 'git' &&
        call[0][1] === 'worktree' &&
        call[0][2] === 'add',
    );
    expect(worktreeAddCall).toBeDefined();
    // The path should contain feature-login, not feature/login
    const path = worktreeAddCall[0][3];
    expect(path).toContain('feature-login');
    expect(path).not.toContain('feature/login');
  });

  it('should sanitize multiple slashes in branch name', async () => {
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
        stdout: Buffer.from('main\nfeature/team/login\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(
          'worktree /home/user/repo\nbranch refs/heads/main\n\n',
        ),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from('origin/main\norigin/feature/team/login\n'),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select')
      .mockResolvedValueOnce('existing')
      .mockResolvedValueOnce('none');
    spyOn(p, 'text')
      .mockResolvedValueOnce('feature/team/login')
      .mockResolvedValueOnce('test');

    await createWorktree();

    const worktreeAddCall = mockSpawnSync.mock.calls.find(
      (call: any) =>
        Array.isArray(call[0]) &&
        call[0][0] === 'git' &&
        call[0][1] === 'worktree' &&
        call[0][2] === 'add',
    );
    expect(worktreeAddCall).toBeDefined();
    const path = worktreeAddCall[0][3];
    expect(path).toContain('feature-team-login');
  });

  it('should reject --name with invalid folder characters', async () => {
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

    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );
    const consoleErrorSpy = spyOn(console, 'error').mockImplementation(
      () => {},
    );

    await createWorktree({
      branch: 'main',
      name: 'bad/name',
      editor: false,
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid folder characters'),
    );
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should reject --suffix with invalid folder characters', async () => {
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

    const exitSpy = spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );
    const consoleErrorSpy = spyOn(console, 'error').mockImplementation(
      () => {},
    );

    await createWorktree({
      branch: 'main',
      suffix: 'bad/suffix',
      editor: false,
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid folder characters'),
    );
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
        stdout: Buffer.from('main\nmain-repo-main-wt-test\n'),
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
      expect.arrayContaining(['git', 'worktree', 'add', '-b', 'main-test-1']),
      expect.any(Object),
    );
  });
});
