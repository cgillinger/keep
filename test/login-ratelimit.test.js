// Own file = own server process, so exhausting the login limiter here cannot
// affect any other test.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startServer, Client, uniqueName } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test('login: the rate limit answers 429 after the allowed number of attempts', async () => {
  const c = new Client(srv.base);
  const name = uniqueName('rl');
  await c.register(name, 'riktigt1');
  const other = new Client(srv.base);
  await other.fetchCsrf();

  // Non-production limit is 50 attempts per minute per IP.
  const codes = [];
  for (let i = 0; i < 52; i++) {
    const r = await other.req('/api/login', { method: 'POST', json: { username: name, password: 'fel-' + i } });
    codes.push(r.status);
  }
  assert.ok(codes.slice(0, 50).every(s => s === 401), 'first 50 are plain 401s: ' + codes.join(','));
  assert.equal(codes[50], 429);
  assert.equal(codes[51], 429);

  // Even the right password is refused while limited.
  const r = await other.req('/api/login', { method: 'POST', json: { username: name, password: 'riktigt1' } });
  assert.equal(r.status, 429);
  assert.ok((await r.json()).error);
});
