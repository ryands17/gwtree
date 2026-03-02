import { describe, expect, it, mock, spyOn } from 'bun:test';
import { sanitizeForFolder, validateFolderName, handleGitError } from './utils';

mock.module('@clack/prompts', () => ({
  cancel: mock(() => {}),
}));

describe('sanitizeForFolder', () => {
  it('should replace slashes with hyphens', () => {
    expect(sanitizeForFolder('feature/login')).toBe('feature-login');
  });

  it('should replace multiple slashes', () => {
    expect(sanitizeForFolder('feature/team/login')).toBe('feature-team-login');
  });

  it('should collapse consecutive hyphens', () => {
    expect(sanitizeForFolder('a//b')).toBe('a-b');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(sanitizeForFolder('/leading')).toBe('leading');
    expect(sanitizeForFolder('trailing/')).toBe('trailing');
  });

  it('should replace other invalid chars', () => {
    expect(sanitizeForFolder('a<b>c')).toBe('a-b-c');
    expect(sanitizeForFolder('a:b')).toBe('a-b');
  });

  it('should return clean names unchanged', () => {
    expect(sanitizeForFolder('my-branch')).toBe('my-branch');
  });
});

describe('validateFolderName', () => {
  it('should return undefined for valid names', () => {
    expect(validateFolderName('my-worktree')).toBeUndefined();
    expect(validateFolderName('repo-main-wt-1')).toBeUndefined();
  });

  it('should return error for names with slashes', () => {
    const result = validateFolderName('bad/name');
    expect(result).toContain('invalid folder characters');
    expect(result).toContain('/');
  });

  it('should return error for names with special chars', () => {
    expect(validateFolderName('bad<name')).toContain(
      'invalid folder characters',
    );
    expect(validateFolderName('bad|name')).toContain(
      'invalid folder characters',
    );
  });

  it('should list unique invalid characters', () => {
    const result = validateFolderName('a/b/c');
    expect(result).toContain('/');
  });
});

describe('handleGitError', () => {
  it('should exit for git repository errors in interactive mode', () => {
    const exitSpy = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('EXIT');
    });

    expect(() =>
      handleGitError(new Error('not a git repository'), true),
    ).toThrow('EXIT');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should exit for git repository errors in non-interactive mode', () => {
    const exitSpy = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('EXIT');
    });
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      handleGitError(new Error('not a git repository'), false),
    ).toThrow('EXIT');
    expect(consoleSpy).toHaveBeenCalledWith('Error: Not in a git repository');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should rethrow non-git errors', () => {
    expect(() => handleGitError(new Error('something else'), true)).toThrow(
      'something else',
    );
  });
});
