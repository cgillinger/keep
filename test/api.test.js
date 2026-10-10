const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { startServer, Client, expectStatus, uniqueName, repoRoot } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const png = () => require(path.join(repoRoot, 'node_modules', 'sharp'))({
  create: { width: 1400, height: 900, channels: 3, background: '#3366cc' }
}).png().toBuffer();

async function newUser(prefix = 'u') {
  const c = new Client(srv.base);
  const name = uniqueName(prefix);
  const user = await c.register(name, 'hemligt1');
  return { c, name, user };
}

test('auth: register, login regenerates the session id, logout', async () => {
  const c = new Client(srv.base);
  const name = uniqueName('auth');
  await c.register(name, 'hemligt1');
  const sidAfterRegister = c.jar.sessionId;
  await expectStatus(await c.req('/api/logout', { method: 'POST' }), 200, 'logout');
  await expectStatus(await c.req('/api/me'), 401, 'me after logout');

  await c.login(name, 'hemligt1', true);
  assert.notEqual(c.jar.sessionId, sidAfterRegister, 'session id must change on login');
  await expectStatus(await c.req('/api/me'), 200, 'me');
});

test('auth: wrong password, bad username charset, short password', async () => {
  const c = new Client(srv.base);
  await c.fetchCsrf();
  let r = await c.req('/api/register', { method: 'POST', json: { username: '<script>', password: 'hemligt1' } });
  await expectStatus(r, 400, 'bad charset');
  r = await c.req('/api/register', { method: 'POST', json: { username: uniqueName('ok'), password: 'abc' } });
  await expectStatus(r, 400, 'short password');
  const name = uniqueName('pw');
  await c.register(name, 'hemligt1');
  r = await c.req('/api/login', { method: 'POST', json: { username: name, password: 'wrong' } });
  await expectStatus(r, 401, 'wrong password');
});

test('csrf: state-changing routes reject a missing token', async () => {
  const { c } = await newUser('csrf');
  await expectStatus(await c.req('/api/notes', { method: 'POST', json: { title: 'x' }, noCsrf: true }), 403, 'no csrf');
  const fd = new FormData();
  fd.append('zipfile', new Blob([Buffer.from('x')], { type: 'application/zip' }), 'a.zip');
  await expectStatus(await c.req('/api/import/keep', { method: 'POST', body: fd, noCsrf: true }), 403, 'import no csrf');
});

test('notes: create/update/delete/restore round-trip text verbatim', async () => {
  const { c } = await newUser('notes');
  let r = await c.req('/api/notes', {
    method: 'POST',
    json: { title: 'x < y', content: 'mail <anna@ex.se> & 5 > 3', is_checklist: true, checklist_items: [{ text: '1 < 2' }], color: '#fff475' }
  });
  await expectStatus(r, 200, 'create');
  const note = await r.json();
  assert.equal(note.title, 'x < y');
  assert.equal(note.content, 'mail <anna@ex.se> & 5 > 3');
  assert.equal(note.checklist_items[0].text, '1 < 2');
  assert.equal(note.color, '#fff475');

  r = await c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'T2', content: 'c2', color: '#not-a-color', images: [] } });
  await expectStatus(r, 200, 'update');
  const updated = await r.json();
  assert.equal(updated.title, 'T2');
  assert.equal(updated.color, '#ffffff', 'invalid color falls back to white');

  await expectStatus(await c.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 200, 'delete');
  r = await c.req('/api/notes');
  assert.equal((await r.json()).notes.length, 0, 'trashed note is hidden');
  await expectStatus(await c.req(`/api/notes/${note.id}/restore`, { method: 'POST' }), 200, 'restore');
  r = await c.req('/api/notes');
  assert.equal((await r.json()).notes.length, 1, 'restored note is back');
});

test('notes: pagination and server-side search with literal wildcards', async () => {
  const { c } = await newUser('search');
  for (let i = 0; i < 25; i++) {
    await expectStatus(await c.req('/api/notes', { method: 'POST', json: { title: `Note ${i}`, content: i === 3 ? 'the needle 100% _x_' : 'hay' } }), 200, 'seed');
  }
  let d = await (await c.req('/api/notes?limit=20&offset=0')).json();
  assert.equal(d.notes.length, 20);
  assert.equal(d.total, 25);
  assert.equal(d.hasMore, true);
  d = await (await c.req('/api/notes?limit=20&offset=20')).json();
  assert.equal(d.notes.length, 5);
  assert.equal(d.hasMore, false);

  d = await (await c.req('/api/notes?q=needle')).json();
  assert.equal(d.total, 1);
  assert.equal(d.notes[0].title, 'Note 3');
  d = await (await c.req('/api/notes?q=' + encodeURIComponent('100% _x_'))).json();
  assert.equal(d.total, 1, 'wildcards in the query match literally');
  d = await (await c.req('/api/notes?q=' + encodeURIComponent('%'))).json();
  assert.equal(d.total, 1, '% alone must not match everything');
  d = await (await c.req('/api/notes?archived=true&q=needle')).json();
  assert.equal(d.total, 0);
});

test('notes: optimistic concurrency returns 409 on a stale save', async () => {
  const { c } = await newUser('conc');
  let r = await c.req('/api/notes', { method: 'POST', json: { title: 'a', content: 'a' } });
  const note = await r.json();
  await new Promise(res => setTimeout(res, 1100)); // CURRENT_TIMESTAMP has 1 s resolution
  await expectStatus(await c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'b', content: 'b', images: [] } }), 200, 'first save');
  r = await c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'c', content: 'c', images: [], expected_updated_at: note.updated_at } });
  await expectStatus(r, 409, 'stale save');
  assert.equal((await r.json()).conflict, true);
  r = await c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'c', content: 'c', images: [] } });
  await expectStatus(r, 200, 'forced save');
});

test('images: upload, attach, serve only to users with access, dedup', async () => {
  const { c: owner } = await newUser('img');
  const { c: stranger } = await newUser('str');
  const buf = await png();
  const upload = async () => {
    const fd = new FormData();
    fd.append('image', new Blob([buf], { type: 'image/png' }), 'a.png');
    const r = await owner.req('/api/notes/image', { method: 'POST', body: fd });
    await expectStatus(r, 200, 'upload');
    return (await r.json()).filename;
  };
  const f1 = await upload();
  await new Promise(res => setTimeout(res, 5));
  const f2 = await upload(); // identical bytes -> deduped on attach

  let r = await owner.req('/api/notes', { method: 'POST', json: { title: 'pic', images: [f1, f2] } });
  await expectStatus(r, 200, 'create with images');
  const note = await r.json();
  assert.equal(note.images.length, 1, 'duplicate image dropped');
  assert.equal(note.duplicatesSkipped, 1);

  r = await owner.req(`/api/notes/image/${note.images[0]}`);
  await expectStatus(r, 200, 'owner can view');
  assert.equal(r.headers.get('content-type'), 'image/webp');
  await expectStatus(await stranger.req(`/api/notes/image/${note.images[0]}`), 404, 'stranger gets 404');
  await expectStatus(await owner.req('/api/notes/image/..%2F..%2Fserver.js'), 404, 'traversal rejected');

  // A foreign filename can't be injected onto a note
  r = await owner.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'pic', images: [note.images[0], 'note_999_1.webp'] } });
  await expectStatus(r, 200, 'update');
  assert.deepEqual((await r.json()).images, note.images);
});

test('sharing: view vs edit permission, recipient pin survives permission change, dismiss', async () => {
  const { c: a } = await newUser('sha');
  const { c: b, user: ub } = await newUser('shb');
  let r = await a.req('/api/notes', { method: 'POST', json: { title: 'shared', content: 'x' } });
  const note = await r.json();

  await expectStatus(await a.req(`/api/notes/${note.id}/share`, { method: 'POST', json: { userId: ub.id, permission: 'view' } }), 200, 'share view');
  r = await b.req('/api/notes?shared=true');
  let d = await r.json();
  assert.equal(d.notes.length, 1);
  assert.equal(d.notes[0].permission, 'view');
  await expectStatus(await b.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'nope', content: 'x', images: [] } }), 404, 'viewer cannot edit');
  await expectStatus(await b.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 404, 'recipient cannot delete');

  await expectStatus(await b.req(`/api/notes/${note.id}/pin`, { method: 'POST' }), 200, 'recipient pins');
  await expectStatus(await a.req(`/api/notes/${note.id}/share`, { method: 'POST', json: { userId: ub.id, permission: 'edit' } }), 200, 'upgrade to edit');
  d = await (await b.req('/api/notes?shared=true')).json();
  assert.equal(d.notes[0].is_pinned, 1, 'pin preserved');
  assert.equal(d.notes[0].permission, 'edit');
  await expectStatus(await b.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'edited by b', content: 'x', images: [] } }), 200, 'editor can edit');

  d = await (await a.req(`/api/notes/${note.id}/shares`)).json();
  assert.equal(d.length, 1);
  await expectStatus(await b.req(`/api/notes/${note.id}/dismiss-share`, { method: 'DELETE' }), 200, 'dismiss');
  d = await (await b.req('/api/notes?shared=true')).json();
  assert.equal(d.notes.length, 0);
});

test('backup export and Google Keep import', async () => {
  const { c } = await newUser('imp');
  await expectStatus(await c.req('/api/notes', { method: 'POST', json: { title: 'before', content: 'x' } }), 200, 'seed');
  let r = await c.req('/api/backup/export');
  await expectStatus(r, 200, 'export');
  assert.match(r.headers.get('content-disposition') || '', /kreep-backup-.*\.zip/);
  const zipBuf = Buffer.from(await r.arrayBuffer());
  assert.ok(zipBuf.length > 100);

  const AdmZip = require(path.join(repoRoot, 'node_modules', 'adm-zip'));
  const z = new AdmZip();
  z.addFile('Takeout/Keep/n1.json', Buffer.from(JSON.stringify({
    title: 'Imported', textContent: 'from keep', color: 'RED',
    createdTimestampUsec: 1700000000000000, userEditedTimestampUsec: 1700000000000000,
    attachments: [{ filePath: 'img.png', mimetype: 'image/png' }]
  })));
  z.addFile('Takeout/Keep/n2.json', Buffer.from(JSON.stringify({ title: 'Trashed', textContent: 'skip', isTrashed: true })));
  z.addFile('Takeout/Keep/img.png', await png());
  const fd = new FormData();
  fd.append('zipfile', new Blob([z.toBuffer()], { type: 'application/zip' }), 'takeout.zip');
  r = await c.req('/api/import/keep', { method: 'POST', body: fd });
  await expectStatus(r, 200, 'import');
  const result = await r.json();
  assert.equal(result.imported, 1);
  assert.equal(result.stats.skippedNotes, 1);
  assert.equal(result.stats.attachments, 1);

  const d = await (await c.req('/api/notes?q=Imported')).json();
  assert.equal(d.total, 1);
  assert.equal(d.notes[0].color, '#f28b82');
  assert.equal(d.notes[0].images.length, 1);
  await expectStatus(await c.req(`/api/notes/image/${d.notes[0].images[0]}`), 200, 'imported image served');
});

test('password change revokes the other sessions but keeps the current one', async () => {
  const { c: a, name } = await newUser('pwc');
  const b = new Client(srv.base);
  await b.login(name, 'hemligt1');
  await expectStatus(await b.req('/api/me'), 200, 'b before');
  await expectStatus(await a.req('/api/profile/change-password', { method: 'POST', json: { currentPassword: 'hemligt1', newPassword: 'nyttlosen2' } }), 200, 'change');
  await new Promise(res => setTimeout(res, 200));
  await expectStatus(await a.req('/api/me'), 200, 'a still valid');
  await expectStatus(await b.req('/api/me'), 401, 'b revoked');
  await b.login(name, 'nyttlosen2');
});

test('websocket: foreign origin refused, same origin gets broadcasts', async () => {
  const { c } = await newUser('ws');
  const WebSocket = require(path.join(repoRoot, 'node_modules', 'ws'));
  const closeCode = (origin) => new Promise(res => {
    const ws = new WebSocket(srv.base, { headers: { cookie: c.cookieHeader(), ...(origin ? { origin } : {}) } });
    ws.on('close', (code) => res(code));
    ws.on('error', () => res('error'));
    setTimeout(() => { ws.close(); res('open'); }, 500);
  });
  assert.equal(await closeCode('http://evil.example'), 1008);
  assert.equal(await closeCode(srv.base), 'open', 'authenticated same-origin socket stays open');

  const ws = new WebSocket(srv.base, { headers: { cookie: c.cookieHeader(), origin: srv.base } });
  const msgs = [];
  ws.on('message', m => msgs.push(JSON.parse(m)));
  await new Promise(res => ws.on('open', res));
  const r = await c.req('/api/notes', { method: 'POST', json: { title: 'ws', content: 'x' } });
  const note = await r.json();
  await c.req(`/api/notes/${note.id}/pin`, { method: 'POST' });
  await new Promise(res => setTimeout(res, 300));
  assert.ok(msgs.some(m => m.type === 'note_created' && m.note.id === note.id), 'note_created');
  assert.ok(msgs.some(m => m.type === 'note_pinned' && m.noteId === note.id), 'note_pinned');
  ws.close();
});
