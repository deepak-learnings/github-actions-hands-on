const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createAppServer } = require('../server');

async function startServer(t) {
  const storagePath = await mkdtemp(path.join(os.tmpdir(), 'crud-server-'));
  const server = createAppServer(storagePath);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(storagePath, { recursive: true, force: true });
  });

  return `http://127.0.0.1:${server.address().port}`;
}

test('supports creating, reading, updating, and deleting items', async (t) => {
  const baseUrl = await startServer(t);

  const homeResponse = await fetch(`${baseUrl}/`);
  assert.equal(homeResponse.status, 200);
  assert.deepEqual(await homeResponse.json(), {
    message: 'Welcome to the CRUD server',
    endpoints: ['/items', '/items/:id'],
  });

  const initialList = await fetch(`${baseUrl}/items`);
  assert.equal(initialList.status, 200);
  assert.deepEqual(await initialList.json(), []);

  const createResponse = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'first item' }),
  });
  assert.equal(createResponse.status, 201);
  const createdItem = await createResponse.json();
  assert.equal(createdItem.name, 'first item');
  assert.ok(createdItem.id);

  const readResponse = await fetch(`${baseUrl}/items/${createdItem.id}`);
  assert.equal(readResponse.status, 200);
  assert.deepEqual(await readResponse.json(), createdItem);

  const updateResponse = await fetch(`${baseUrl}/items/${createdItem.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'updated item' }),
  });
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(await updateResponse.json(), { name: 'updated item', id: createdItem.id });

  const deleteResponse = await fetch(`${baseUrl}/items/${createdItem.id}`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/items/${createdItem.id}`);
  assert.equal(missingResponse.status, 404);
});

test('rejects invalid JSON and non-object item bodies', async (t) => {
  const baseUrl = await startServer(t);

  const invalidJson = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(invalidJson.status, 400);

  const invalidItem = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(['not', 'an', 'object']),
  });
  assert.equal(invalidItem.status, 400);
});
