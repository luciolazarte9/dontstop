import test from 'node:test';
import assert from 'node:assert/strict';
import { requestStatus, hasSpace } from '../server/_lib/capacity.js';
import { defaults, validateConfig } from '../server/_lib/config.js';

test('new requests enter the waitlist only after the confirmed capacity is full', () => {
  assert.equal(requestStatus(true, 5, 4), 'pending');
  assert.equal(requestStatus(true, 5, 5), 'waitlist');
  assert.equal(requestStatus(true, 5, 6), 'waitlist');
  assert.equal(requestStatus(true, 0, 600), 'pending');
  assert.equal(requestStatus(false, 5, 5), 'not_attending');
});

test('event capacity accepts unlimited or a positive integer up to 5000', () => {
  assert.equal(validateConfig({ ...defaults, capacity: 0 }).capacity, 0);
  assert.equal(validateConfig({ ...defaults, capacity: 5000 }).capacity, 5000);
  assert.equal(validateConfig({ ...defaults, capacity: -1 }), null);
  assert.equal(validateConfig({ ...defaults, capacity: 1.5 }), null);
  assert.equal(validateConfig({ ...defaults, capacity: 5001 }), null);
});

test('confirmation respects the same limit, including unlimited capacity', () => {
  assert.equal(hasSpace(5, 4), true);
  assert.equal(hasSpace(5, 5), false);
  assert.equal(hasSpace(0, 600), true);
});
