import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordIssue, safeNext, normalizedEmail, validEmail } from '../src/lib/account-validation.ts';
test('password validation matches UTF-8 bcrypt limit', () => {
  assert.equal(passwordIssue('ấ'.repeat(24)), '');
  assert.ok(passwordIssue('ấ'.repeat(24) + 'A'));
  assert.ok(passwordIssue('short'));
  assert.equal(passwordIssue('Valid2026!'), '');
});
test('auth return destinations reject external and authentication loops', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/auth?next=/auth', '/reset-password', '/\nother']) assert.equal(safeNext(value), '/');
  assert.equal(safeNext('/events/music?qty=2'), '/events/music?qty=2');
  assert.equal(safeNext(['/tickets', '//evil.test']), '/tickets');
  assert.equal(normalizedEmail('  QA@Example.test '), 'qa@example.test');
  assert.equal(validEmail('not email'), false);
});
