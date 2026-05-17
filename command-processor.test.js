const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCommand,
  buildChecklistFromItems,
  checkAiLimit,
} = require('./command-processor');

test('parseCommand returns null for non-command content', () => {
  assert.equal(parseCommand('Hej, hur mår du'), null);
  assert.equal(parseCommand(''), null);
  assert.equal(parseCommand(null), null);
  assert.equal(parseCommand(undefined), null);
  assert.equal(parseCommand(42), null);
});

test('parseCommand detects //list at start', () => {
  assert.deepEqual(parseCommand('//list'), {
    command: 'list', args: '', userText: '',
  });
});

test('parseCommand preserves user text above command', () => {
  const r = parseCommand('Glöm inte:\nRussin\nBananer\n//list');
  assert.equal(r.command, 'list');
  assert.equal(r.userText, 'Glöm inte:\nRussin\nBananer');
});

test('parseCommand detects //ocr', () => {
  assert.equal(parseCommand('//ocr').command, 'ocr');
});

test('parseCommand ignores unknown commands', () => {
  assert.equal(parseCommand('//unknown'), null);
  assert.equal(parseCommand('//translate'), null);
});

test('parseCommand is case-insensitive', () => {
  assert.equal(parseCommand('//LIST').command, 'list');
  assert.equal(parseCommand('//Ocr').command, 'ocr');
});

test('parseCommand only fires on a command line — inline // is not a command', () => {
  assert.equal(parseCommand('See //list below'), null);
});

test('parseCommand stops at first command line; text below is ignored', () => {
  const r = parseCommand('Hej\n//list\nIgnorerad text');
  assert.equal(r.command, 'list');
  assert.equal(r.userText, 'Hej');
});

test('parseCommand captures args after command', () => {
  const r = parseCommand('//list noggrann');
  assert.equal(r.command, 'list');
  assert.equal(r.args, 'noggrann');
});

test('buildChecklistFromItems groups by category in seen-order', () => {
  const items = [
    { text: 'A', category: 'Skafferi', confidence: 1 },
    { text: 'B', category: 'Frys', confidence: 5 },
    { text: 'C', category: 'Skafferi', confidence: 2 },
  ];
  const result = buildChecklistFromItems(items, '');
  assert.equal(result.length, 5);
  assert.ok(result[0].text.includes('Skafferi'));
  assert.equal(result[1].text, 'A');
  assert.equal(result[2].text, 'C');
  assert.ok(result[3].text.includes('Frys'));
  assert.equal(result[4].text, 'B');
});

test('buildChecklistFromItems prepends user text with separator', () => {
  const items = [{ text: 'X', category: 'Övrigt', confidence: 3 }];
  const result = buildChecklistFromItems(items, 'Russin\nBananer');
  assert.equal(result[0].text, 'Russin');
  assert.equal(result[1].text, 'Bananer');
  assert.ok(result[2].text.includes('AI-genererat'));
  assert.equal(result[3].text, '── Övrigt ──');
  assert.equal(result[4].text, 'X');
  assert.equal(result[4].confidence, 3);
});

test('buildChecklistFromItems leaves user text out when empty', () => {
  const items = [{ text: 'X', category: 'Övrigt', confidence: 3 }];
  const result = buildChecklistFromItems(items, '');
  assert.equal(result.length, 2);
  assert.ok(result[0].text.includes('Övrigt'));
});

test('buildChecklistFromItems handles items without confidence gracefully', () => {
  const items = [{ text: 'A', category: 'Skafferi' }];
  const result = buildChecklistFromItems(items, '');
  assert.equal(result[1].text, 'A');
  // confidence may be undefined — that's fine
});

test('checkAiLimit allows requests under the hourly cap', () => {
  const userId = 'test-user-under-cap';
  const l1 = checkAiLimit(userId, 2, 5);
  assert.equal(l1.allowed, true);
  l1.record();
  const l2 = checkAiLimit(userId, 2, 5);
  assert.equal(l2.allowed, true);
});

test('checkAiLimit blocks when hourly cap is reached', () => {
  const userId = 'test-user-hourly';
  const l1 = checkAiLimit(userId, 2, 10);
  l1.record();
  const l2 = checkAiLimit(userId, 2, 10);
  l2.record();
  const blocked = checkAiLimit(userId, 2, 10);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'hourly');
  assert.ok(blocked.retryAfter > 0);
});

test('checkAiLimit isolates users from each other', () => {
  const a = checkAiLimit('user-a', 1, 5); a.record();
  const blockedA = checkAiLimit('user-a', 1, 5);
  assert.equal(blockedA.allowed, false);
  const b = checkAiLimit('user-b', 1, 5);
  assert.equal(b.allowed, true);
});
