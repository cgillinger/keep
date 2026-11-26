// Static assets are served ahead of the session middleware: they must not set
// a session cookie, still carry the security headers, and login must keep working.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startServer, Client, expectStatus, uniqueName } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

test('static files and the app shell set no cookies but keep the security headers', async () => {
  for (const p of ['/', '/index.html', '/app.js', '/locales/en.json']) {
    const r = await fetch(srv.base + p);
    await expectStatus(r, 200, p);
    assert.deepEqual(r.headers.getSetCookie(), [], `${p} sets no cookie`);
    assert.ok(r.headers.get('content-security-policy'), `${p} has a CSP`);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  }
  const html = await (await fetch(srv.base + '/')).text();
  assert.match(html, /<html/i);
  assert.equal((await fetch(srv.base + '/no-such-file.js')).status, 404);

  // Sending a stale/forged session cookie to a static file is harmless too.
  const r = await fetch(srv.base + '/app.js', { headers: { cookie: 'sessionId=s%3Aforged.sig' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.headers.getSetCookie(), []);
});

test('only the CSRF token route and login set cookies; sessions still work after static requests', async () => {
  const c = new Client(srv.base);
  await fetch(srv.base + '/');
  let r = await c.req('/api/csrf-token');
  const csrfCookies = r.headers.getSetCookie().map(s => s.split('=')[0]);
  assert.deepEqual(csrfCookies, ['kreep.csrf']);
  c.csrf = (await r.json()).csrfToken;

  const name = uniqueName('stat');
  r = await c.req('/api/register', { method: 'POST', json: { username: name, password: 'hemligt1' } });
  await expectStatus(r, 200, 'register');
  assert.ok(r.headers.getSetCookie().some(s => s.startsWith('sessionId=')), 'login/register issue the session cookie');

  await expectStatus(await c.req('/api/me'), 200, 'session works');
  await expectStatus(await c.req('/app.js'), 200, 'static with a live session');
  const anon = await fetch(srv.base + '/api/me');
  assert.equal(anon.status, 401);
});
