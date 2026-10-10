// Shared harness for the API integration tests: boots a real server.js on a
// random port with its own temporary DATA_DIR, and a tiny cookie-jar client.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const repoRoot = path.join(__dirname, '..');

async function startServer(extraEnv = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kreep-test-'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    DATA_DIR: dataDir,
    PORT: String(port),
    NODE_ENV: 'test',
    SESSION_SECRET: 'test-secret-0123456789abcdef0123456789',
    BASE_URL: base,
    LOG_LEVEL: 'error',
    ...extraEnv
  };
  const child = spawn(process.execPath, ['server.js'], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', d => { output += d; });
  child.stderr.on('data', d => { output += d; });

  let exited = false;
  child.on('exit', () => { exited = true; });
  for (let i = 0; i < 100 && !exited; i++) {
    try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }

  return {
    base,
    dataDir,
    child,
    get output() { return output; },
    get exited() { return exited; },
    async stop() {
      if (!exited) {
        child.kill('SIGTERM');
        await new Promise(r => { child.on('exit', r); setTimeout(r, 3000); });
      }
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

class Client {
  constructor(base) { this.base = base; this.jar = {}; this.csrf = null; }

  cookieHeader() {
    return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async req(p, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;
    if (opts.json !== undefined) { headers['content-type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
    if (this.csrf && !opts.noCsrf) headers['csrf-token'] = this.csrf;
    const r = await fetch(this.base + p, { ...opts, headers, redirect: 'manual' });
    for (const sc of r.headers.getSetCookie?.() || []) {
      const [kv] = sc.split(';');
      const eq = kv.indexOf('=');
      this.jar[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
    return r;
  }

  async fetchCsrf() {
    const r = await this.req('/api/csrf-token');
    this.csrf = (await r.json()).csrfToken;
  }

  async register(username, password, email) {
    await this.fetchCsrf();
    const r = await this.req('/api/register', { method: 'POST', json: { username, password, email } });
    await expectStatus(r, 200, 'register');
    return r.json();
  }

  async login(username, password, rememberMe = false) {
    await this.fetchCsrf();
    const r = await this.req('/api/login', { method: 'POST', json: { username, password, rememberMe } });
    await expectStatus(r, 200, 'login');
    return r.json();
  }
}

async function expectStatus(r, status, label) {
  if (r.status !== status) {
    throw new assert.AssertionError({ message: `${label}: expected ${status}, got ${r.status}: ${await r.text()}` });
  }
  return r;
}

function uniqueName(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

module.exports = { startServer, Client, expectStatus, uniqueName, repoRoot };
