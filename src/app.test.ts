import assert from 'node:assert/strict';
import test from 'node:test';
import { app } from './app';

test('health endpoint reports the API and database status', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json() as { status: string; database: string };
    assert.equal(body.status, 'success');
    assert.equal(body.database, 'Connected');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('unknown API routes return JSON 404', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/unknown`);
    assert.equal(response.status, 404);
    const body = await response.json() as { status: string };
    assert.equal(body.status, 'error');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('admin and attempt APIs reject unauthenticated requests', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    for (const path of ['/api/v1/admin/users', '/api/v1/admin/audit-logs', '/api/v1/tests/attempts/start']) {
      const response: Response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: path.endsWith('/start') ? 'POST' : 'GET' });
      assert.equal(response.status, 401, path);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('forgot-password does not reveal whether an email exists', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'not-found@example.com' }) });
    assert.equal(response.status, 200);
    const body = await response.json() as { message: string; resetToken?: string };
    assert.match(body.message, /Nếu email tồn tại/);
    assert.equal(body.resetToken, undefined);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
