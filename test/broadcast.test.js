// A note's websocket events reach its owner and every recipient, with the JSON
// columns already parsed, and nobody else.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { startServer, Client, expectStatus, uniqueName, repoRoot } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const WebSocket = require(path.join(repoRoot, 'node_modules', 'ws'));
const open = (c) => new Promise((resolve, reject) => {
  const ws = new WebSocket(srv.base, { headers: { cookie: c.cookieHeader(), origin: srv.base } });
  ws.msgs = [];
  ws.on('message', m => ws.msgs.push(JSON.parse(m)));
  ws.on('open', () => resolve(ws));
  ws.on('error', reject);
});
async function newUser(prefix) {
  const c = new Client(srv.base);
  const user = await c.register(uniqueName(prefix), 'hemligt1');
  return { c, user };
}

test('websocket: update, delete and restore reach owner and recipients only', async () => {
  const { c: owner } = await newUser('bco');
  const { c: rec, user: recUser } = await newUser('bcr');
  const { c: out } = await newUser('bcx');
  const note = await (await owner.req('/api/notes', {
    method: 'POST',
    json: { title: 'n', content: 'x', is_checklist: true, checklist_items: [{ text: 'a', checked: false }] }
  })).json();
  await expectStatus(await owner.req(`/api/notes/${note.id}/share`, { method: 'POST', json: { userId: recUser.id, permission: 'view' } }), 200, 'share');

  const sockets = { owner: await open(owner), rec: await open(rec), out: await open(out) };
  await sleep(100);

  await expectStatus(await owner.req(`/api/notes/${note.id}`, {
    method: 'PUT',
    json: { title: 'changed', content: 'y', is_checklist: true, checklist_items: [{ text: 'b', checked: true }] }
  }), 200, 'update');
  await expectStatus(await owner.req(`/api/notes/${note.id}`, { method: 'DELETE' }), 200, 'delete');
  await expectStatus(await owner.req(`/api/notes/${note.id}/restore`, { method: 'POST' }), 200, 'restore');
  await sleep(400);

  for (const who of ['owner', 'rec']) {
    const types = sockets[who].msgs.map(m => m.type);
    assert.deepEqual(types, ['note_updated', 'note_deleted', 'note_created'], `${who} events`);
    const [upd, del, created] = sockets[who].msgs;
    assert.equal(upd.note.title, 'changed');
    assert.ok(Array.isArray(upd.note.checklist_items), 'checklist arrives parsed');
    assert.equal(upd.note.checklist_items[0].text, 'b');
    assert.equal(del.noteId, note.id);
    assert.equal(created.note.id, note.id);
    assert.ok(Array.isArray(created.note.checklist_items));
  }
  assert.deepEqual(sockets.out.msgs, [], 'an unrelated user hears nothing');
  Object.values(sockets).forEach(ws => ws.close());
});
