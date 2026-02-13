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
import { removeWorktree } from './remove';

mock.module('@clack/prompts', () => ({
  intro: mock(() => {}),
  outro: mock(() => {}),
  cancel: mock(() => {}),
  isCancel: mock(() => false),
  select: mock(() => Promise.resolve('main')),
  confirm: mock(() => Promise.resolve(false)),
  spinner: mock(() => ({
    start: mock(() => {}),
    stop: mock(() => {}),
  })),
}));

describe('removeWorktree', () => {
  let mockSpawnSync: any;

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

  it('should remove selected worktree', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-feature
HEAD def5678
branch refs/heads/feature
`;

    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(worktreeOutput),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select').mockResolvedValueOnce('/home/user/repo-feature');
    spyOn(p, 'confirm').mockResolvedValueOnce(true);

    await removeWorktree();

    expect(p.intro).toHaveBeenCalledWith('Remove Git Worktree');
    expect(mockSpawnSync).toHaveBeenCalledWith([
      'git',
      'worktree',
      'list',
      '--porcelain',
    ]);
    expect(mockSpawnSync).toHaveBeenCalledWith([
      'git',
      'worktree',
      'remove',
      '/home/user/repo-feature',
    ]);
    expect(p.outro).toHaveBeenCalledWith('✓ Done');
  });

  it('should handle no worktrees to remove', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main
`;

    mockSpawnSync.mockReturnValueOnce({
      success: true,
      stdout: Buffer.from(worktreeOutput),
      stderr: Buffer.from(''),
    });

    const exitSpy = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      await removeWorktree();
    } catch (e: any) {
      expect(e.message).toBe('process.exit called');
    }

    expect(p.cancel).toHaveBeenCalledWith('No worktrees to remove');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('should prompt force remove on failure, throw if user declines', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-feature
HEAD def5678
branch refs/heads/feature
`;

    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(worktreeOutput),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: false,
        stdout: Buffer.from(''),
        stderr: Buffer.from('some error'),
      });

    spyOn(p, 'select').mockResolvedValueOnce('/home/user/repo-feature');
    spyOn(p, 'confirm')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(removeWorktree()).rejects.toThrow('some error');
  });

  it('should force remove when user confirms', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-feature
HEAD def5678
branch refs/heads/feature
`;

    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(worktreeOutput),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: false,
        stdout: Buffer.from(''),
        stderr: Buffer.from('dirty'),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select').mockResolvedValueOnce('/home/user/repo-feature');
    spyOn(p, 'confirm').mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await removeWorktree();

    expect(mockSpawnSync).toHaveBeenCalledWith([
      'git',
      'worktree',
      'remove',
      '--force',
      '/home/user/repo-feature',
    ]);
    expect(p.outro).toHaveBeenCalledWith('✓ Done');
  });

  it('should throw if force remove also fails', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-feature
HEAD def5678
branch refs/heads/feature
`;

    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(worktreeOutput),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: false,
        stdout: Buffer.from(''),
        stderr: Buffer.from('dirty'),
      })
      .mockReturnValueOnce({
        success: false,
        stdout: Buffer.from(''),
        stderr: Buffer.from('force failed'),
      });

    spyOn(p, 'select').mockResolvedValueOnce('/home/user/repo-feature');
    spyOn(p, 'confirm').mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await expect(removeWorktree()).rejects.toThrow('force failed');
  });

  it('should parse worktrees without branch (detached HEAD)', async () => {
    const worktreeOutput = `worktree /home/user/repo
HEAD abc1234
branch refs/heads/main

worktree /home/user/repo-detached
HEAD def5678
`;

    mockSpawnSync
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(worktreeOutput),
        stderr: Buffer.from(''),
      })
      .mockReturnValueOnce({
        success: true,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

    spyOn(p, 'select').mockResolvedValueOnce('/home/user/repo-detached');
    spyOn(p, 'confirm').mockResolvedValueOnce(true);

    await removeWorktree();

    expect(p.select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({
            label: expect.stringContaining('def5678'),
          }),
        ]),
      }),
    );
  });
});
