import * as p from '@clack/prompts';

export const INVALID_FOLDER_CHARS = /[/\\<>:"|?*\x00-\x1f]/g;

export function sanitizeForFolder(name: string): string {
  return name
    .replace(INVALID_FOLDER_CHARS, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateFolderName(value: string): string | undefined {
  const invalid = value.match(INVALID_FOLDER_CHARS);
  if (invalid) {
    const chars = [...new Set(invalid)].join(' ');
    return `Contains invalid folder characters: ${chars}`;
  }
}

export function handleGitError(error: unknown, interactive: boolean): void {
  if (
    error instanceof Error &&
    error.message.includes('not a git repository')
  ) {
    if (interactive) p.cancel('Error: Not in a git repository');
    else console.error('Error: Not in a git repository');
    process.exit(1);
  }
  throw error;
}
