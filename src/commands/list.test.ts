import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from 'bun:test';
import { listWorktrees } from './list.js';
import * as p from '@clack/prompts';

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

describe('listWorktrees', () => {
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

  it('should handle no worktrees found', async () => {
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
      await listWorktrees();
    } catch (e: any) {
      expect(e.message).toBe('process.exit called');
    }

    expect(p.cancel).toHaveBeenCalledWith('No worktrees found');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('should handle worktree removal failure', async () => {
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
      .mockImplementation(() => {
        throw new Error('Failed to remove worktree');
      });

    spyOn(p, 'select').mockResolvedValueOnce('/home/user/repo-feature');
    spyOn(p, 'confirm').mockResolvedValueOnce(true);

    await expect(listWorktrees()).rejects.toThrow('Failed to remove worktree');
  });
});
