import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

import {
  adminConfigured,
  createSessionToken,
  passwordMatches,
  verifySessionToken,
  SESSION_TTL_MS,
} from '../src/lib/admin-auth';

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple';
  process.env.ADMIN_SESSION_SECRET = 'a-signing-secret';
});

describe('adminConfigured', () => {
  test('true when both secrets are present', () => {
    assert.equal(adminConfigured(), true);
  });

  test('false when the password is missing', () => {
    delete process.env.ADMIN_PASSWORD;
    assert.equal(adminConfigured(), false);
  });

  test('false when the signing secret is missing', () => {
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(adminConfigured(), false);
  });

  test('false when a secret is set but empty', () => {
    process.env.ADMIN_PASSWORD = '';
    assert.equal(adminConfigured(), false);
  });
});

describe('session tokens', () => {
  test('a freshly signed token verifies', async () => {
    const token = await createSessionToken();
    assert.equal(await verifySessionToken(token), true);
  });

  test('a tampered signature does not verify', async () => {
    const token = await createSessionToken();
    const [expiry, sig] = token.split('.');
    const flipped = sig[0] === 'a' ? `b${sig.slice(1)}` : `a${sig.slice(1)}`;
    assert.equal(await verifySessionToken(`${expiry}.${flipped}`), false);
  });

  test('an extended expiry does not verify, because the expiry is signed', async () => {
    const token = await createSessionToken();
    const sig = token.split('.')[1];
    const farFuture = Date.now() + 10 * SESSION_TTL_MS;
    assert.equal(await verifySessionToken(`${farFuture}.${sig}`), false);
  });

  test('an expired token does not verify', async () => {
    const issuedAt = Date.now() - 2 * SESSION_TTL_MS;
    const token = await createSessionToken(issuedAt);
    assert.equal(await verifySessionToken(token), false);
  });

  test('a token signed with a different secret does not verify', async () => {
    const token = await createSessionToken();
    process.env.ADMIN_SESSION_SECRET = 'a-different-secret';
    assert.equal(await verifySessionToken(token), false);
  });

  test('undefined, empty and malformed tokens do not verify', async () => {
    assert.equal(await verifySessionToken(undefined), false);
    assert.equal(await verifySessionToken(null), false);
    assert.equal(await verifySessionToken(''), false);
    assert.equal(await verifySessionToken('garbage'), false);
    assert.equal(await verifySessionToken('...'), false);
    assert.equal(await verifySessionToken('notanumber.abcd'), false);
  });

  test('nothing verifies when admin is not configured', async () => {
    const token = await createSessionToken();
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(await verifySessionToken(token), false);
  });
});

describe('passwordMatches', () => {
  test('true for the exact password', async () => {
    assert.equal(await passwordMatches('correct-horse-battery-staple'), true);
  });

  test('false for a prefix of the password', async () => {
    assert.equal(await passwordMatches('correct-horse'), false);
  });

  test('false for a string that merely starts with the password', async () => {
    assert.equal(await passwordMatches('correct-horse-battery-staple-extra'), false);
  });

  test('false for the empty string', async () => {
    assert.equal(await passwordMatches(''), false);
  });

  test('false when admin is not configured, even for an empty submission', async () => {
    delete process.env.ADMIN_PASSWORD;
    assert.equal(await passwordMatches(''), false);
  });
});
