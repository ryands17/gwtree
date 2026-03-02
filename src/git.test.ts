import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import {
  parseWorktrees,
  findWorktree,
  checkWorktreeInUse,
  deleteBranch,
  getGitRoot,
} from './git';

describe('parseWorktrees', () => {
  let mockSpawnSync: any;

  beforeEach(() => {
    mockSpawnSync = spyOn(Bun, 'spawnSync');
  });

  afterEach(() => {
    mock.restore();
  });

  it('should parse porcelain output with branches', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(
        'worktree /home/user/repo\nHEAD abc1234def\nbranch refs/heads/main\n\nworktree /home/user/repo-feature\nHEAD def5678abc\nbranch refs/heads/feature\n\n',
      ),
      stderr: Buffer.from(''),
    });

    const result = parseWorktrees();

    expect(result).toEqual([
      { path: '/home/user/repo', head: 'abc1234', branch: 'main' },
      { path: '/home/user/repo-feature', head: 'def5678', branch: 'feature' },
    ]);
  });

  it('should handle detached HEAD (no branch)', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(
        'worktree /home/user/repo\nHEAD abc1234def\nbranch refs/heads/main\n\nworktree /home/user/repo-detached\nHEAD def5678abc\ndetached\n\n',
      ),
      stderr: Buffer.from(''),
    });

    const result = parseWorktrees();

    expect(result).toHaveLength(2);
    expect(result[1].branch).toBeUndefined();
    expect(result[1].head).toBe('def5678');
  });

  it('should return empty array for empty output', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    });

    const result = parseWorktrees();
    expect(result).toEqual([]);
  });

  it('should pass cwd when provided', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(
        'worktree /repo\nHEAD abc1234\nbranch refs/heads/main\n',
      ),
      stderr: Buffer.from(''),
    });

    parseWorktrees('/some/dir');

    expect(mockSpawnSync).toHaveBeenCalledWith(
      ['git', 'worktree', 'list', '--porcelain'],
      { cwd: '/some/dir' },
    );
  });

  it('should preserve full branch name (feature/login)', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(
        'worktree /repo\nHEAD abc1234\nbranch refs/heads/feature/login\n',
      ),
      stderr: Buffer.from(''),
    });

    const result = parseWorktrees();
    expect(result[0].branch).toBe('feature/login');
  });
});

describe('findWorktree', () => {
  const worktrees = [
    { path: '/home/user/repo', branch: 'main', head: 'abc1234' },
    { path: '/home/user/repo-feature-wt', branch: 'feature', head: 'def5678' },
  ];

  it('should match by full path', () => {
    expect(findWorktree(worktrees, '/home/user/repo-feature-wt')).toBe(
      '/home/user/repo-feature-wt',
    );
  });

  it('should match by basename', () => {
    expect(findWorktree(worktrees, 'repo-feature-wt')).toBe(
      '/home/user/repo-feature-wt',
    );
  });

  it('should match by branch name', () => {
    expect(findWorktree(worktrees, 'feature')).toBe(
      '/home/user/repo-feature-wt',
    );
  });

  it('should return undefined when no match', () => {
    expect(findWorktree(worktrees, 'nonexistent')).toBeUndefined();
  });
});

describe('checkWorktreeInUse', () => {
  let mockSpawnSync: any;

  beforeEach(() => {
    mockSpawnSync = spyOn(Bun, 'spawnSync');
  });

  afterEach(() => {
    mock.restore();
  });

  it('should return path when branch is in use', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(
        'worktree /home/user/repo\nHEAD abc1234\nbranch refs/heads/main\n\nworktree /home/user/repo-feature-wt\nHEAD def5678\nbranch refs/heads/feature\n\n',
      ),
      stderr: Buffer.from(''),
    });

    expect(checkWorktreeInUse('feature')).toBe('/home/user/repo-feature-wt');
  });

  it('should return null when branch is not in use', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(
        'worktree /home/user/repo\nHEAD abc1234\nbranch refs/heads/main\n\n',
      ),
      stderr: Buffer.from(''),
    });

    expect(checkWorktreeInUse('feature')).toBeNull();
  });
});

describe('deleteBranch', () => {
  let mockSpawnSync: any;

  beforeEach(() => {
    mockSpawnSync = spyOn(Bun, 'spawnSync');
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call git branch -D with the branch name', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    });

    deleteBranch('feature');

    expect(mockSpawnSync).toHaveBeenCalledWith([
      'git',
      'branch',
      '-D',
      'feature',
    ]);
  });

  it('should pass cwd when provided', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    });

    deleteBranch('feature', '/some/dir');

    expect(mockSpawnSync).toHaveBeenCalledWith(
      ['git', 'branch', '-D', 'feature'],
      { cwd: '/some/dir' },
    );
  });

  it('should throw on failure', () => {
    mockSpawnSync.mockReturnValue({
      success: false,
      stdout: Buffer.from(''),
      stderr: Buffer.from('error: branch not found'),
    });

    expect(() => deleteBranch('nonexistent')).toThrow(
      'error: branch not found',
    );
  });
});

describe('getGitRoot', () => {
  let mockSpawnSync: any;

  beforeEach(() => {
    mockSpawnSync = spyOn(Bun, 'spawnSync');
  });

  afterEach(() => {
    mock.restore();
  });

  it('should return trimmed git root path', () => {
    mockSpawnSync.mockReturnValue({
      success: true,
      stdout: Buffer.from('/home/user/repo\n'),
      stderr: Buffer.from(''),
    });

    expect(getGitRoot()).toBe('/home/user/repo');
  });

  it('should throw when not in a git repository', () => {
    mockSpawnSync.mockReturnValue({
      success: false,
      stdout: Buffer.from(''),
      stderr: Buffer.from('fatal: not a git repository'),
    });

    expect(() => getGitRoot()).toThrow('not a git repository');
  });
});
