import { readFileSync } from 'fs';
import { join } from 'path';

export const PasswordPolicy = Object.freeze({
  minLength: 12,
  maxLength: 128,
  requiredClassCount: 3,
  breachedPasswordDenylistPath: 'resources/breached-passwords-top1000.txt',
});

let _denylist: Set<string> | null = null;

function getDenylist(): Set<string> {
  if (_denylist) return _denylist;
  try {
    const filePath = join(
      process.cwd(),
      PasswordPolicy.breachedPasswordDenylistPath,
    );
    const lines = readFileSync(filePath, 'utf8')
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);
    _denylist = new Set(lines);
  } catch {
    _denylist = new Set();
  }
  return _denylist;
}

export interface PasswordValidationResult {
  valid: boolean;
  violations: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const violations: string[] = [];

  if (password.length < PasswordPolicy.minLength) {
    violations.push(
      `Password must be at least ${PasswordPolicy.minLength} characters long.`,
    );
  }

  if (password.length > PasswordPolicy.maxLength) {
    violations.push(
      `Password must not exceed ${PasswordPolicy.maxLength} characters.`,
    );
  }

  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const classCount = classes.filter(Boolean).length;
  if (classCount < PasswordPolicy.requiredClassCount) {
    violations.push(
      `Password must contain characters from at least ${PasswordPolicy.requiredClassCount} character classes (lowercase, uppercase, digit, symbol).`,
    );
  }

  const denylist = getDenylist();
  if (denylist.has(password.toLowerCase())) {
    violations.push(
      'Password is too commonly used. Please choose a more unique password.',
    );
  }

  return { valid: violations.length === 0, violations };
}
