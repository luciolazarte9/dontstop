import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import express from 'express';
import handler from '../api/index.js';
import { resolveRoute } from '../server/router.js';
import { hashPassword } from '../server/_lib/auth.js';

const id = '0123456789abcdef01234567';
const paths = ['subscribe','config', 'rsvp', 'unsubscribe', 'admin/production', 'admin/contacts', 'admin/campaigns', 'admin/login', 'admin/me', 'admin/logout', 'admin/guests', 'admin/config', 'admin/upload', 'admin/export-pdf', 'admin/export-balance-pdf', 'admin/admins', 'admin/audit', ...['image', 'admin/guests', 'admin/gender', 'admin/notify', 'admin/admins', 'admin/checkin','admin/access-category'].map(p => `${p}/${id}`)];

test('all existing routes resolve identically before and after the Vercel rewrite', () => {
  for (const path of paths) {
    const direct = resolveRoute(`/api/${path}`);
    const rewritten = resolveRoute(`/api/index?route=${path}`);
    const query = resolveRoute('/api/index', { route: path });
    assert.ok(direct, path);
    assert.equal(direct.handler, rewritten.handler, path);
    assert.equal(direct.handler, query.handler, path);
    assert.equal(direct.id, rewritten.id, path);
  }
  assert.equal(resolveRoute('/api/missing'), null);
  assert.equal(resolveRoute('/api/admin/guests/invalid'), null);
  assert.equal(resolveRoute('/api/index', { route: ['admin/me', 'config'] }), null);
  assert.equal(resolveRoute('/api/index?route=../config'), null);
});

test('only one function entry point remains, with API and admin rewrites', async () => {
  assert.deepEqual(await readdir(new URL('../api/', import.meta.url)), ['index.js']);
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url)));
  assert.ok(config.rewrites.some(r => r.source === '/api/:path*' && r.destination === '/api/index?route=:path*'));
  assert.ok(config.rewrites.some(r => r.source === '/admin' && r.destination === '/index.html'));
});

test('single entry point preserves admin authorization, method checks and RSVP validation', async t => {
  process.env.ADMIN_EMAIL = 'router-test@example.com';
  process.env.ADMIN_PASSWORD_HASH = hashPassword('router-test-password');
  process.env.SESSION_SECRET = 'router-test-secret'.repeat(4);
  const app = express();
  app.use(express.json());
  app.all(['/api', '/api/*'], handler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = 'GET', body) => fetch(base + path, { method, headers: { Origin: base, 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }) });
  for (const [path, method] of [
    ['admin/production','GET'], ['admin/contacts','GET'], ['admin/campaigns','GET'], ['admin/production','POST'], ['admin/contacts','POST'], ['admin/campaigns','POST'], ['admin/guests','GET'], ['admin/export-pdf','GET'], ['admin/export-balance-pdf','GET'], ['admin/audit','GET'],
    ['admin/config','GET'], ['admin/admins','GET'], ['admin/upload','POST'],
    [`admin/checkin/${id}`,'PATCH'], [`admin/gender/${id}`,'PATCH'], [`admin/access-category/${id}`,'PATCH'],
    [`admin/guests/${id}`,'PATCH'], [`admin/admins/${id}`,'PATCH'], [`admin/notify/${id}`,'POST']
  ]) {
    assert.equal((await request(`/api/${path}`, method)).status, 401, path);
    assert.equal((await request(`/api/index?route=${path}`, method)).status, 401, `rewrite ${path}`);
  }
  assert.equal((await request('/api/config', 'POST')).status, 405);
  assert.equal((await request('/api/rsvp', 'POST', { name: 'Test' })).status, 400);
  assert.equal((await request('/api/rsvp','POST',{name:'Test Guest',email:'test@example.com',attending:'yes',gender:'man',accessCategory:['vip']})).status,400);
  assert.equal((await request('/api/admin/login', 'POST', { email: 'invalid', password: 42 })).status, 400);
  assert.equal((await request('/api/missing')).status, 404);
});
