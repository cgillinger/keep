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
  for (const r of both) await expectStatus(r, 200, 'concurrent import');
  const d2 = await (await importer.req('/api/notes')).json();
  assert.equal(d2.total, 2);
});
