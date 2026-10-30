const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { LocalStorage } = require('node-localstorage');

const ITEMS_KEY = 'items';
const MAX_BODY_SIZE = 1024 * 1024;

function createAppServer(storagePath = path.join(__dirname, '.data')) {
  const storage = new LocalStorage(storagePath);

  function getItems() {
    const storedItems = storage.getItem(ITEMS_KEY);
    return storedItems === null ? [] : JSON.parse(storedItems);
  }

  function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(data));
  }

  function readJsonBody(request) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      let tooLarge = false;

      request.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) {
          tooLarge = true;
          reject(Object.assign(new Error('Request body is too large'), { statusCode: 413 }));
          return;
        }
        chunks.push(chunk);
      });

      request.on('end', () => {
        if (tooLarge) return;
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(Object.assign(new Error('Request body must be valid JSON'), { statusCode: 400 }));
        }
      });

      request.on('error', reject);
    });
  }

  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    try {
      if (pathname === '/' && request.method === 'GET') {
        sendJson(response, 200, {
          message: 'Welcome to the CRUD server',
          endpoints: ['/items', '/items/:id'],
        });
        return;
      }

      if (pathname === '/items' && request.method === 'GET') {
        sendJson(response, 200, getItems());
        return;
      }

      if (pathname === '/items' && request.method === 'POST') {
        const body = await readJsonBody(request);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          sendJson(response, 400, { error: 'Request body must be a JSON object' });
          return;
        }

        const items = getItems();
        const item = { ...body, id: randomUUID() };
        items.push(item);
        storage.setItem(ITEMS_KEY, JSON.stringify(items));
        sendJson(response, 201, item);
        return;
      }

      const itemMatch = pathname.match(/^\/items\/([^/]+)$/);
      if (itemMatch) {
        const id = decodeURIComponent(itemMatch[1]);
        const items = getItems();
        const itemIndex = items.findIndex((entry) => entry.id === id);

        if (request.method === 'GET') {
          if (itemIndex === -1) {
            sendJson(response, 404, { error: 'Item not found' });
            return;
          }
          sendJson(response, 200, items[itemIndex]);
          return;
        }

        if (request.method === 'PUT') {
          if (itemIndex === -1) {
            sendJson(response, 404, { error: 'Item not found' });
            return;
          }

          const body = await readJsonBody(request);
          if (!body || typeof body !== 'object' || Array.isArray(body)) {
            sendJson(response, 400, { error: 'Request body must be a JSON object' });
            return;
          }

          items[itemIndex] = { ...body, id };
          storage.setItem(ITEMS_KEY, JSON.stringify(items));
          sendJson(response, 200, items[itemIndex]);
          return;
        }

        if (request.method === 'DELETE') {
          if (itemIndex === -1) {
            sendJson(response, 404, { error: 'Item not found' });
            return;
          }

          items.splice(itemIndex, 1);
          storage.setItem(ITEMS_KEY, JSON.stringify(items));
          response.writeHead(204);
          response.end();
          return;
        }
      }

      sendJson(response, 404, { error: 'Route not found' });
    } catch (error) {
      if (error.statusCode === 400 || error.statusCode === 413) {
        sendJson(response, error.statusCode, { error: error.message });
        return;
      }

      console.error('Request failed:', error);
      sendJson(response, 500, { error: 'Internal server error' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createAppServer().listen(port, () => {
    console.log(`CRUD server listening on http://localhost:${port}`);
  });
}

module.exports = { createAppServer };