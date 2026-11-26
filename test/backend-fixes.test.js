// Backend correctness regressions. Kept in its own file (= its own server
// process) so these tests have their own registration rate-limit budget.
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

const AdmZipLib = () => require(path.join(repoRoot, 'node_modules', 'adm-zip'));

async function restoreBackup(c, zip) {
  const fd = new FormData();
  fd.append('zipfile', new Blob([zip.toBuffer()], { type: 'application/zip' }), 'upload.zip');
  return c.req('/api/import/keep', { method: 'POST', body: fd });
}

test('import: an invalid archive answers 4xx and leaves other users\' writes alone; concurrent imports both succeed', async () => {
  const { c: importer } = await newUser('impbad');
  const { c: other } = await newUser('impoth');
  const AdmZip = AdmZipLib();

  const bad = new AdmZip();
  bad.addFile('manifest.json', Buffer.from(JSON.stringify({ type: 'something-else', version: '1' })));
  const notKeep = new AdmZip();
  notKeep.addFile('readme.txt', Buffer.from('nothing here'));

  // Another user saves notes while the bad imports are running.
  const saves = [];
  for (let i = 0; i < 5; i++) {
    saves.push(other.req('/api/notes', { method: 'POST', json: { title: `concurrent ${i}`, content: 'x' } }));
  }
  const rs = await Promise.all([restoreBackup(importer, bad), restoreBackup(importer, notKeep), ...saves]);
  assert.equal(rs[0].status, 400, 'invalid manifest -> 400');
  assert.equal(rs[1].status, 400, 'not a Takeout export -> 400');
  for (const r of rs.slice(2)) await expectStatus(r, 200, 'concurrent save');
  const d = await (await other.req('/api/notes')).json();
  assert.equal(d.total, 5, 'other user\'s notes survive');

  const mk = (title) => {
    const z = new AdmZip();
    z.addFile('Takeout/Keep/n1.json', Buffer.from(JSON.stringify({
      title, textContent: 'x', createdTimestampUsec: 1700000000000000, userEditedTimestampUsec: 1700000000000000
    })));
    return z;
  };
  const both = await Promise.all([restoreBackup(importer, mk('first import')), restoreBackup(importer, mk('second import'))]);
  const bodies = [];
  for (const r of both) { bodies.push(await r.clone().text()); await expectStatus(r, 200, 'concurrent import'); }
  const d2 = await (await importer.req('/api/notes')).json();
  assert.equal(d2.total, 2, JSON.stringify(bodies) + JSON.stringify(d2));
});

const fs = require('fs');
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const imageDir = () => path.join(srv.dataDir, 'note-images');
const inImages = (f) => fs.existsSync(path.join(imageDir(), f));
const inTrash = (f) => fs.existsSync(path.join(imageDir(), '.trash', f));

test('notes: two saves with the same expected_updated_at cannot both win', async () => {
  const { c } = await newUser('race');
  const note = await (await c.req('/api/notes', { method: 'POST', json: { title: 'a', content: 'a' } })).json();
  await sleep(1100); // CURRENT_TIMESTAMP has 1 s resolution
  const put = (title) => c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title, content: 'x', images: [], expected_updated_at: note.updated_at } });
  const rs = await Promise.all([put('one'), put('two')]);
  const codes = rs.map(r => r.status).sort();
  assert.deepEqual(codes, [200, 409]);
  const loser = rs.find(r => r.status === 409);
  const body = await loser.json();
  assert.equal(body.conflict, true);
  assert.ok(body.updated_at);
});

test('images: removed images go to the trash after the save, unless another note still uses them', async () => {
  const { c } = await newUser('trash');
  const upload = async (color) => {
    const buf = await require(path.join(repoRoot, 'node_modules', 'sharp'))({
      create: { width: 50, height: 50, channels: 3, background: color }
    }).png().toBuffer();
    const fd = new FormData();
    fd.append('image', new Blob([buf], { type: 'image/png' }), 'a.png');
    const r = await c.req('/api/notes/image', { method: 'POST', body: fd });
    await expectStatus(r, 200, 'upload');
    return (await r.json()).filename;
  };
  const f = await upload('#ff0000');
  await sleep(5);
  const g = await upload('#00ff00');
  const mk = async (images) => (await (await c.req('/api/notes', { method: 'POST', json: { title: 't', images } })).json());
  const a = await mk([f, g]);
  const b = await mk([f]);
  const put = (n, images) => c.req(`/api/notes/${n.id}`, { method: 'PUT', json: { title: 't', content: '', images } });

  await expectStatus(await put(a, []), 200, 'drop images from a');
  await sleep(300);
  assert.ok(inImages(f), 'f is still used by note b and stays');
  assert.ok(!inTrash(f));
  assert.ok(inTrash(g), 'g is unreferenced now and moved to the trash');
  assert.ok(!inImages(g));

  await expectStatus(await put(b, []), 200, 'drop f from b');
  await sleep(300);
  assert.ok(inTrash(f), 'f trashed once nothing references it');
});

test('images: imported (non-upload scheme) images are trashed too, not left for the sweep', async () => {
  const { c } = await newUser('impimg');
  const AdmZip = AdmZipLib();
  const z = new AdmZip();
  z.addFile('Takeout/Keep/n1.json', Buffer.from(JSON.stringify({
    title: 'with pic', textContent: 'x', createdTimestampUsec: 1700000000000000, userEditedTimestampUsec: 1700000000000000,
    attachments: [{ filePath: 'img.png', mimetype: 'image/png' }]
  })));
  z.addFile('Takeout/Keep/img.png', await png());
  await expectStatus(await restoreBackup(c, z), 200, 'import');
  const note = (await (await c.req('/api/notes')).json()).notes[0];
  const name = note.images[0];
  assert.ok(!/^note_/.test(name), 'imported name uses the second scheme');
  await expectStatus(await c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'x', content: '', images: [] } }), 200, 'remove image');
  await sleep(300);
  assert.ok(inTrash(name));
  assert.ok(!inImages(name));
});

test('search matches checklist item text, not the JSON keys', async () => {
  const { c } = await newUser('srch');
  await expectStatus(await c.req('/api/notes', { method: 'POST', json: { title: 'groceries', is_checklist: true, checklist_items: [{ text: 'milk', checked: false }, { text: 'bread', checked: true }] } }), 200, 'seed');
  const total = async (q) => (await (await c.req('/api/notes?q=' + encodeURIComponent(q))).json()).total;
  assert.equal(await total('bread'), 1, 'word inside an item matches');
  assert.equal(await total('checked'), 0);
  assert.equal(await total('text'), 0);
  assert.equal(await total('true'), 0);
});

test('notes: limit and offset are clamped; isHeader survives save', async () => {
  const { c } = await newUser('lim');
  for (let i = 0; i < 3; i++) {
    await expectStatus(await c.req('/api/notes', { method: 'POST', json: { title: `n${i}`, content: 'x' } }), 200, 'seed');
  }
  let d = await (await c.req('/api/notes?limit=-1')).json();
  assert.equal(d.notes.length, 1, 'negative limit clamps to 1');
  d = await (await c.req('/api/notes?limit=0&offset=-5')).json();
  assert.equal(d.notes.length, 3, 'limit=0 falls back to the default; negative offset to 0');

  const items = [{ text: '-- Fruit --', checked: false, isHeader: true }, { text: 'apple', checked: false }];
  const note = await (await c.req('/api/notes', { method: 'POST', json: { title: 'list', is_checklist: true, checklist_items: items } })).json();
  assert.equal(note.checklist_items[0].isHeader, true);
  assert.equal(note.checklist_items[1].isHeader, undefined);
  const put = await (await c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'list', is_checklist: true, checklist_items: items, images: [] } })).json();
  assert.equal(put.checklist_items[0].isHeader, true);
});

test('uploads: a rejected file type answers 400, image ETag is quoted and honoured', async () => {
  const { c } = await newUser('upl');
  let fd = new FormData();
  fd.append('image', new Blob(['hello'], { type: 'text/plain' }), 'a.txt');
  let r = await c.req('/api/notes/image', { method: 'POST', body: fd });
  await expectStatus(r, 400, 'non-image');
  assert.ok((await r.json()).error);
  fd = new FormData();
  fd.append('zipfile', new Blob(['hello'], { type: 'text/plain' }), 'a.txt');
  await expectStatus(await c.req('/api/import/keep', { method: 'POST', body: fd }), 400, 'non-zip');

  fd = new FormData();
  fd.append('image', new Blob([await png()], { type: 'image/png' }), 'a.png');
  const { filename } = await (await c.req('/api/notes/image', { method: 'POST', body: fd })).json();
  r = await c.req(`/api/notes/image/${filename}`);
  await expectStatus(r, 200, 'image');
  const etag = r.headers.get('etag');
  assert.equal(etag, `"${filename}"`);
  // fetch() adds Cache-Control: no-cache to requests that carry If-None-Match, which
  // disables the 304 path, so use a raw http request for the conditional GET.
  const status = await new Promise((resolve, reject) => {
    require('http').get(srv.base + `/api/notes/image/${filename}`, { headers: { cookie: c.cookieHeader(), 'if-none-match': etag } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
  assert.equal(status, 304, 'conditional GET with the quoted ETag');
});

test('websocket: logout closes that session\'s sockets; note_shared carries the sharer\'s avatar colour', async () => {
  const WebSocket = require(path.join(repoRoot, 'node_modules', 'ws'));
  const open = (c) => new Promise((resolve, reject) => {
    const ws = new WebSocket(srv.base, { headers: { cookie: c.cookieHeader(), origin: srv.base } });
    ws.msgs = [];
    ws.on('message', m => ws.msgs.push(JSON.parse(m)));
    ws.closed = new Promise(res => ws.on('close', res));
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
  const { name, c: a } = await newUser('wsa');
  const { c: b, user: ub } = await newUser('wsb');

  await expectStatus(await a.req('/api/profile/avatar-color', { method: 'POST', json: { avatarColor: '#aa11bb' } }), 200, 'avatar');
  const wsB = await open(b);
  const note = await (await a.req('/api/notes', { method: 'POST', json: { title: 's', content: 'x' } })).json();
  await expectStatus(await a.req(`/api/notes/${note.id}/share`, { method: 'POST', json: { userId: ub.id, permission: 'view' } }), 200, 'share');
  await sleep(300);
  const shared = wsB.msgs.find(m => m.type === 'note_shared');
  assert.ok(shared, 'note_shared received');
  assert.equal(shared.note.owner_avatar_color, '#aa11bb');
  wsB.close();

  // a second login of the same user keeps its socket when the first logs out
  const a2 = new Client(srv.base);
  await a2.login(name, 'hemligt1');
  const ws1 = await open(a);
  const ws2 = await open(a2);
  await expectStatus(await a.req('/api/logout', { method: 'POST' }), 200, 'logout');
  const code = await Promise.race([ws1.closed, sleep(2000).then(() => 'still open')]);
  assert.notEqual(code, 'still open', 'logged-out session socket is closed');
  assert.equal(ws2.readyState, WebSocket.OPEN, 'other session keeps its socket');

  // revokeOtherSessions: password change on a2 closes sockets of other sessions
  const a3 = new Client(srv.base);
  await a3.login(name, 'hemligt1');
  const ws3 = await open(a3);
  await expectStatus(await a2.req('/api/profile/change-password', { method: 'POST', json: { currentPassword: 'hemligt1', newPassword: 'nyttlosen2' } }), 200, 'change');
  const code3 = await Promise.race([ws3.closed, sleep(2000).then(() => 'still open')]);
  assert.notEqual(code3, 'still open', 'revoked session socket is closed');
  assert.equal(ws2.readyState, WebSocket.OPEN, 'current session keeps its socket');
  ws2.close();
});
