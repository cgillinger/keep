// Password reset flow. The mailer cannot deliver anything here (SMTP points at a
// closed port), so the tests plant a token whose hash they know straight into
// the users table, exactly as the request route would have stored it.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const crypto = require('crypto');
const { startServer, Client, expectStatus, uniqueName, repoRoot } = require('./helpers');

let srv;
before(async () => {
  srv = await startServer({
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: 'u', SMTP_PASS: 'p', EMAIL_FROM: 'Kreep <kreep@example.test>'
  });
});
after(async () => { await srv.stop(); });

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

function dbOp(method, sql, params = []) {
  const sqlite3 = require(path.join(repoRoot, 'node_modules', 'sqlite3'));
  const conn = new sqlite3.Database(path.join(srv.dataDir, 'keep.db'));
  conn.configure('busyTimeout', 5000);
  return new Promise((resolve, reject) => {
    conn[method](sql, params, (err, row) => { conn.close(); err ? reject(err) : resolve(row); });
  });
}
const dbRun = (sql, params) => dbOp('run', sql, params);
const dbGet = (sql, params) => dbOp('get', sql, params);

async function newUser(prefix, withEmail = true) {
  const c = new Client(srv.base);
  const name = uniqueName(prefix);
  const email = withEmail ? `${name}@example.test`.toLowerCase() : undefined;
  await c.register(name, 'gammalt1', email);
  return { name, email };
}

async function plantToken(username, token, expiresInMs) {
  await dbRun('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE username = ?',
    [sha256(token), new Date(Date.now() + expiresInMs).toISOString(), username]);
}

async function verify(token, newPassword) {
  const c = new Client(srv.base);
  await c.fetchCsrf();
  return c.req('/api/password-reset/verify', { method: 'POST', json: { token, newPassword } });
}

async function canLogin(username, password) {
  const c = new Client(srv.base);
  await c.fetchCsrf();
  const r = await c.req('/api/login', { method: 'POST', json: { username, password } });
  return r.status === 200;
}

test('reset: a valid token sets the new password, and works only once', async () => {
  const { name } = await newUser('rs1');
  const token = crypto.randomBytes(32).toString('hex');
  await plantToken(name, token, 60 * 60 * 1000);

  await expectStatus(await verify(token, 'nytt-losen1'), 200, 'verify');
  assert.equal(await canLogin(name, 'nytt-losen1'), true, 'new password works');
  assert.equal(await canLogin(name, 'gammalt1'), false, 'old password is gone');

  const again = await verify(token, 'annat-losen2');
  assert.equal(again.status, 400, 'token is single-use');
  assert.equal(await canLogin(name, 'nytt-losen1'), true, 'second use changed nothing');
  const row = await dbGet('SELECT reset_token, reset_token_expires FROM users WHERE username = ?', [name]);
  assert.equal(row.reset_token, null);
  assert.equal(row.reset_token_expires, null);
});

test('reset: an expired token is rejected and cleared', async () => {
  const { name } = await newUser('rs2');
  const token = crypto.randomBytes(32).toString('hex');
  await plantToken(name, token, -1000);

  const r = await verify(token, 'nytt-losen1');
  assert.equal(r.status, 400);
  assert.equal(await canLogin(name, 'gammalt1'), true, 'password unchanged');
  const row = await dbGet('SELECT reset_token FROM users WHERE username = ?', [name]);
  assert.equal(row.reset_token, null, 'expired token cleared');
});

test('reset: unknown token, missing fields and weak password are rejected', async () => {
  const { name } = await newUser('rs3');
  const token = crypto.randomBytes(32).toString('hex');
  await plantToken(name, token, 60 * 60 * 1000);

  assert.equal((await verify('not-a-real-token', 'nytt-losen1')).status, 400);
  assert.equal((await verify(token, '')).status, 400, 'missing password');
  assert.equal((await verify(token, 'abc')).status, 400, 'too short');
  assert.equal(await canLogin(name, 'gammalt1'), true, 'nothing changed');
  // The raw token is never stored: presenting the stored hash does not work.
  assert.equal((await verify(sha256(token), 'nytt-losen1')).status, 400);
});

test('reset: the request answer is identical for known, unknown and e-mail-less accounts', async () => {
  const known = await newUser('rs4');
  const noMail = await newUser('rs5', false);
  const ask = async (usernameOrEmail) => {
    const c = new Client(srv.base);
    await c.fetchCsrf();
    const r = await c.req('/api/password-reset/request', { method: 'POST', json: { usernameOrEmail } });
    return { status: r.status, body: await r.json() };
  };
  const a = await ask(known.name);
  const b = await ask(known.email);
  const c2 = await ask('finns-inte-' + Date.now());
  const d = await ask(noMail.name);
  for (const x of [b, c2, d]) assert.deepEqual(x, a);
  assert.equal(a.status, 200);

  // ...yet the known account did get a (hashed) token, the others did not.
  const row = await dbGet('SELECT reset_token, reset_token_expires FROM users WHERE username = ?', [known.name]);
  assert.match(row.reset_token, /^[0-9a-f]{64}$/);
  assert.ok(new Date(row.reset_token_expires) > new Date());
  const none = await dbGet('SELECT reset_token FROM users WHERE username = ?', [noMail.name]);
  assert.equal(none.reset_token, null);

  const empty = new Client(srv.base);
  await empty.fetchCsrf();
  const r = await empty.req('/api/password-reset/request', { method: 'POST', json: { usernameOrEmail: '  ' } });
  assert.equal(r.status, 400);
});
