// Access control, profile validation, upload limits, data exposure and export
// scoping. Own file = own server process (and own rate limit budget).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { startServer, Client, expectStatus, uniqueName, repoRoot } = require('./helpers');

let srv;
before(async () => { srv = await startServer({ MAX_IMAGES_PER_NOTE: '3' }); });
after(async () => { await srv.stop(); });

async function newUser(prefix = 'u', email) {
  const c = new Client(srv.base);
  const name = uniqueName(prefix);
  const user = await c.register(name, 'hemligt1', email);
  return { c, name, id: user.id };
}

const colorPng = (hex) => require(path.join(repoRoot, 'node_modules', 'sharp'))({
  create: { width: 40, height: 30, channels: 3, background: hex }
}).png().toBuffer();

async function upload(c, buf, type = 'image/png', name = 'a.png') {
  const fd = new FormData();
  fd.append('image', new Blob([buf], { type }), name);
  return c.req('/api/notes/image', { method: 'POST', body: fd });
}

const mkNote = async (c, fields = {}) =>
  (await expectStatus(await c.req('/api/notes', { method: 'POST', json: { title: 't', content: 'c', ...fields } }), 200, 'create')).json();
const listIds = async (c, qs = '') => (await (await c.req('/api/notes' + qs)).json()).notes.map(n => n.id);
const share = (c, noteId, userId, permission) =>
  c.req(`/api/notes/${noteId}/share`, { method: 'POST', json: { userId, permission } });

test('private notes: another user can neither see, edit, delete, restore, pin nor share them', async () => {
  const a = await newUser('own');
  const b = await newUser('oth');
  const note = await mkNote(a.c, { title: 'secret' });

  assert.ok(!(await listIds(b.c)).includes(note.id), 'not in B\'s list');
  assert.ok(!(await listIds(b.c, '?q=secret')).includes(note.id), 'not in B\'s search');
  await expectStatus(await b.c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'pwn', content: 'x' } }), 404, 'PUT');
  await expectStatus(await b.c.req(`/api/notes/${note.id}/pin`, { method: 'POST' }), 404, 'pin');
  await expectStatus(await share(b.c, note.id, a.id, 'edit'), 404, 'share');
  await expectStatus(await b.c.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 404, 'DELETE');

  // Own delete, then B tries to resurrect it.
  await expectStatus(await a.c.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 200, 'owner delete');
  await expectStatus(await b.c.req(`/api/notes/${note.id}/restore`, { method: 'POST' }), 404, 'B restore');
  assert.ok(!(await listIds(a.c)).includes(note.id), 'still deleted');
  await expectStatus(await a.c.req(`/api/notes/${note.id}/restore`, { method: 'POST' }), 200, 'owner restore');

  const live = (await (await a.c.req('/api/notes')).json()).notes.find(n => n.id === note.id);
  assert.equal(live.title, 'secret', 'B\'s attempts changed nothing');

  // Unauthenticated callers get 401 across the board.
  const anon = new Client(srv.base);
  await anon.fetchCsrf();
  for (const [m, p] of [['GET', '/api/notes'], ['GET', '/api/users'], ['GET', '/api/me'], ['GET', '/api/backup/export'],
    ['GET', `/api/notes/${note.id}/shares`], ['DELETE', `/api/notes/${note.id}`], ['PUT', `/api/notes/${note.id}`]]) {
    await expectStatus(await anon.req(p, { method: m, ...(m === 'PUT' ? { json: {} } : {}) }), 401, `${m} ${p}`);
  }
});

test('sharing: only the owner lists and removes shares; view recipients cannot write', async () => {
  const owner = await newUser('sho');
  const viewer = await newUser('shv');
  const editor = await newUser('she');
  const stranger = await newUser('shs');
  const note = await mkNote(owner.c, { title: 'shared' });
  await expectStatus(await share(owner.c, note.id, viewer.id, 'view'), 200, 'share view');
  await expectStatus(await share(owner.c, note.id, editor.id, 'edit'), 200, 'share edit');

  const sharesOf = async (c) => c.req(`/api/notes/${note.id}/shares`);
  const list = await (await expectStatus(await sharesOf(owner.c), 200, 'owner lists')).json();
  assert.deepEqual(list.map(s => s.shared_with_user_id).sort(), [viewer.id, editor.id].sort());
  for (const s of list) assert.ok(!('password' in s) && !('email' in s), 'no sensitive user columns in share list');
  for (const who of [viewer, editor, stranger]) {
    await expectStatus(await sharesOf(who.c), 404, 'non-owner cannot list');
    await expectStatus(await who.c.req(`/api/notes/${note.id}/share/${editor.id}`, { method: 'DELETE' }), 404, 'non-owner cannot unshare');
    await expectStatus(await share(who.c, note.id, stranger.id, 'edit'), 404, 'non-owner cannot share on');
  }
  assert.equal((await (await sharesOf(owner.c)).json()).length, 2, 'all shares survived');

  // View recipient: sees it, cannot PUT or DELETE. Edit recipient: can PUT, cannot DELETE.
  assert.ok((await listIds(viewer.c)).includes(note.id));
  const put = (c) => c.req(`/api/notes/${note.id}`, { method: 'PUT', json: { title: 'changed', content: 'c' } });
  await expectStatus(await put(viewer.c), 404, 'viewer PUT');
  await expectStatus(await viewer.c.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 404, 'viewer DELETE');
  await expectStatus(await put(stranger.c), 404, 'stranger PUT');
  await expectStatus(await put(editor.c), 200, 'editor PUT');
  await expectStatus(await editor.c.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 404, 'editor DELETE');
  await expectStatus(await editor.c.req(`/api/notes/${note.id}/restore`, { method: 'POST' }), 404, 'editor restore');

  // Owner removes one share; that user loses access, the other keeps it.
  await expectStatus(await owner.c.req(`/api/notes/${note.id}/share/${viewer.id}`, { method: 'DELETE' }), 200, 'owner unshare');
  assert.ok(!(await listIds(viewer.c)).includes(note.id));
  assert.ok((await listIds(editor.c)).includes(note.id));
  // Cannot share with yourself or with a missing user.
  await expectStatus(await share(owner.c, note.id, owner.id, 'edit'), 400, 'self share');
  await expectStatus(await share(owner.c, note.id, 999999, 'edit'), 404, 'unknown user');
});

test('profile: invalid avatar colours and background themes are rejected', async () => {
  const { c } = await newUser('prof');
  const post = (p, json) => c.req(p, { method: 'POST', json });
  for (const bad of ['red', '#12345', '#1234567', '#GGGGGG', '1a73e8', '', null, 123, '#1a73e8; x']) {
    await expectStatus(await post('/api/profile/avatar-color', { avatarColor: bad }), 400, `avatar ${JSON.stringify(bad)}`);
  }
  await expectStatus(await post('/api/profile/avatar-color', {}), 400, 'avatar missing');
  for (const bad of ['neon', '', null, 'DARK', 'dark ', ['dark']]) {
    await expectStatus(await post('/api/profile/background-theme', { theme: bad }), 400, `theme ${JSON.stringify(bad)}`);
  }
  await expectStatus(await post('/api/profile/background-theme', {}), 400, 'theme missing');

  let me = await (await c.req('/api/me')).json();
  assert.equal(me.avatarColor, '#1a73e8', 'defaults untouched');
  assert.equal(me.backgroundTheme, 'default');

  await expectStatus(await post('/api/profile/avatar-color', { avatarColor: '#aBc123' }), 200, 'valid colour');
  await expectStatus(await post('/api/profile/background-theme', { theme: 'mint-green' }), 200, 'valid theme');
  me = await (await c.req('/api/me')).json();
  assert.equal(me.avatarColor, '#aBc123');
  assert.equal(me.backgroundTheme, 'mint-green');
});

test('images: wrong types are refused and the per-note limit is enforced', async () => {
  const { c } = await newUser('imgl');
  const anon = new Client(srv.base);
  await anon.fetchCsrf();
  await expectStatus(await upload(anon, await colorPng('#ff0000')), 401, 'anonymous upload');

  await expectStatus(await upload(c, Buffer.from('%PDF-1.4'), 'application/pdf', 'a.pdf'), 400, 'pdf');
  await expectStatus(await upload(c, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml', 'a.svg'), 400, 'svg');
  await expectStatus(await upload(c, Buffer.from('MZ'), 'application/octet-stream', 'a.exe'), 400, 'binary');
  const noFile = await c.req('/api/notes/image', { method: 'POST', body: new FormData() });
  await expectStatus(noFile, 400, 'no file');

  // Five distinct images (dedup would otherwise collapse identical ones).
  const files = [];
  for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff']) {
    const r = await expectStatus(await upload(c, await colorPng(hex)), 200, 'upload');
    files.push((await r.json()).filename);
    await new Promise(res => setTimeout(res, 3)); // filenames carry a ms timestamp
  }
  const note = await mkNote(c, { images: files });
  assert.equal(note.images.length, 3, 'create keeps at most MAX_IMAGES_PER_NOTE');
  assert.deepEqual(note.images, files.slice(0, 3));

  const put = await (await expectStatus(await c.req(`/api/notes/${note.id}`, {
    method: 'PUT', json: { title: 't', content: 'c', images: files }
  }), 200, 'update')).json();
  assert.equal(put.images.length, 3, 'update keeps at most MAX_IMAGES_PER_NOTE');
});

test('exposure: /api/users and /api/me never leak hashes or other users\' e-mail addresses', async () => {
  const a = await newUser('exa', 'a-exposure@example.test');
  const b = await newUser('exb', 'b-exposure@example.test');

  const users = await (await expectStatus(await a.c.req('/api/users'), 200, 'users')).json();
  assert.ok(users.some(u => u.id === b.id), 'other users are listed for sharing');
  assert.ok(!users.some(u => u.id === a.id), 'self is not listed');
  for (const u of users) {
    assert.deepEqual(Object.keys(u).sort(), ['avatar_color', 'id', 'username']);
  }
  const raw = JSON.stringify(users);
  assert.ok(!raw.includes('exposure@example.test') && !raw.includes('$2'), 'no e-mail or bcrypt hash anywhere');

  const me = await (await expectStatus(await a.c.req('/api/me'), 200, 'me')).json();
  assert.equal(me.email, 'a-exposure@example.test', 'own e-mail is returned to oneself');
  assert.equal(me.id, a.id);
  for (const k of ['password', 'reset_token', 'reset_token_expires']) assert.ok(!(k in me), `/api/me has no ${k}`);
  assert.ok(!JSON.stringify(me).includes('$2'));
  assert.equal(me.email.includes('b-exposure'), false);

  // The note list exposes owner name/colour for shared notes, nothing more.
  const note = await mkNote(b.c, { title: 'for a' });
  await expectStatus(await share(b.c, note.id, a.id, 'view'), 200, 'share');
  const listed = (await (await a.c.req('/api/notes')).json()).notes.find(n => n.id === note.id);
  assert.equal(listed.owner_username, b.name);
  assert.ok(!JSON.stringify(listed).includes('exposure@example.test'));
  assert.ok(!('password' in listed));
});

test('export: contains only the caller\'s own notes and images', async () => {
  const a = await newUser('exp1');
  const b = await newUser('exp2');
  const imgA = (await (await upload(a.c, await colorPng('#123456'))).json()).filename;
  await mkNote(a.c, { title: 'alpha-private-note', content: 'only-for-a', images: [imgA] });
  const mineB = await mkNote(b.c, { title: 'beta-note', content: 'only-for-b' });
  const sharedFromA = await mkNote(a.c, { title: 'alpha-shared-note', content: 'shared-with-b' });
  await expectStatus(await share(a.c, sharedFromA.id, b.id, 'view'), 200, 'share');

  const r = await expectStatus(await b.c.req('/api/backup/export'), 200, 'export');
  const AdmZip = require(path.join(repoRoot, 'node_modules', 'adm-zip'));
  const zip = new AdmZip(Buffer.from(await r.arrayBuffer()));
  const names = zip.getEntries().map(e => e.entryName);
  const noteFiles = names.filter(n => n.startsWith('notes/') && n.endsWith('.json'));
  assert.equal(noteFiles.length, 1, names.join(','));
  const exported = JSON.parse(zip.readAsText(noteFiles[0]));
  assert.equal(exported.id, mineB.id);
  assert.ok(!names.some(n => n.startsWith('images/') && n.includes(imgA)), 'A\'s image not included');

  const everything = zip.getEntries().map(e => zip.readAsText(e)).join('\n');
  assert.ok(!everything.includes('alpha-private-note') && !everything.includes('only-for-a'), 'A\'s private note absent');
  assert.ok(!everything.includes('alpha-shared-note') && !everything.includes('shared-with-b'), 'notes shared with B are not exported as B\'s own');
  assert.ok(!everything.includes('$2'), 'no password hashes');
});
