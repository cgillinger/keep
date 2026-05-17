// AI command processor for //list and //ocr.
// Pure module — no DB, no Express. Caller owns persistence + broadcasting.

const fs = require('fs').promises;
const path = require('path');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const FETCH_TIMEOUT_MS = 60_000;
const IMAGE_FILENAME_RE = /^note_\d+_\d+\.webp$/;

const LIST_PROMPT = `Du är en assistent som identifierar matvaror och andra föremål i bilder för att skapa en strukturerad inventarielista.

REGLER (följ strikt):

1. Läs faktisk text på förpackningarna. Märke, färg och form är ledtrådar, inte fakta. Prioritera innehållsförteckningen över förpackningens estetik.

2. Vid avskuren eller delvis dold text: notera detta, gissa inte hela ordet. Om bara "...GUBBAR" syns, anta inte automatiskt "JORDGUBBAR".

3. Vid osäkerhet om innehållet, beskriv föremålet istället för att gissa kategori. "Okänd gul plåtburk" är bättre än "Mjöl" om du inte kan verifiera.

4. Endast föremål som faktiskt syns i bilden. Inga inferenser om vad som "brukar" finnas i ett skafferi, kyl eller frys.

5. Brandnamn och produktnamn på originalspråk. Allt annat på svenska.

6. Om samma vara syns i flera bilder, lista den endast en gång.

7. Gruppera items i kategorier (Skafferi, Kyl, Frys, Kryddor, Bröd, Drycker, Övrigt) baserat på vad som är synligt i bilderna.

SÄKERHETSFAKTOR (heltal 1-10):
- 1-2: Säker identifiering. Märke och innehållsförteckning och produkttyp tydligt synliga.
- 3-4: En eller två detaljer osäkra (exakt variant, storlek), men huvudidentifiering robust.
- 5-6: Kategori säker, specifik produkt osäker. Vet att det är pasta, men inte vilken sort.
- 7-8: Beskrivande snarare än identifierat. Kan se färg och form men inte vad det innehåller.
- 9-10: Helt oidentifierbart. Beskriv objektet visuellt.

Returnera strukturerad JSON enligt schemat. Inga kommentarer, ingen prosa.`;

const LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          category: { type: 'string' },
          confidence: { type: 'integer', minimum: 1, maximum: 10 },
        },
        required: ['text', 'category', 'confidence'],
      },
    },
  },
  required: ['items'],
};

const OCR_PROMPT = `Du är en OCR-assistent. Transkribera all text som syns i bilderna ordagrant.

REGLER:
1. Transkribera ordagrant, tolka inte. Bevara handstilens stavfel, förkortningar och tecken.
2. Bevara layout: radbrytningar, indrag, listor.
3. Markera oläslig text med [oläsligt].
4. Om flera bilder skickas: separera transkriptionen med "--- Bild N ---" på egen rad.
5. Inga kommentarer, inga sammanfattningar, ingen översättning. Bara transkriptionen.`;

/**
 * Parses a note's content for a //command directive on its own line.
 * Returns null if no recognised command, otherwise { command, args, userText }
 * where userText is everything *before* the command line (preserved).
 */
function parseCommand(content) {
  if (!content || typeof content !== 'string') return null;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\/\/(\w+)(?:\s+(.*))?$/);
    if (m) {
      const cmd = m[1].toLowerCase();
      if (cmd !== 'list' && cmd !== 'ocr') return null;
      const userText = lines.slice(0, i).join('\n').trim();
      const args = (m[2] || '').trim();
      return { command: cmd, args, userText };
    }
  }
  return null;
}

async function callGemini(parts, responseSchema, apiKey) {
  const body = {
    contents: [{ parts }],
    generationConfig: responseSchema
      ? { responseMimeType: 'application/json', responseSchema }
      : {},
  };

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (r.status === 429) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!r.ok) {
        throw new Error(`Gemini HTTP ${r.status}`);
      }
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned no text');
      return text;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      if (attempt === 2) throw err;
    }
  }
  throw lastErr || new Error('Gemini rate limit persisted after 3 retries');
}

async function loadImageParts(imageFilenames, imagesDir) {
  const parts = [];
  const resolvedDir = path.resolve(imagesDir);
  for (const rel of imageFilenames) {
    const base = path.basename(rel);
    if (!IMAGE_FILENAME_RE.test(base)) {
      throw new Error(`Invalid image filename: ${base}`);
    }
    const fullPath = path.resolve(resolvedDir, base);
    if (!fullPath.startsWith(resolvedDir + path.sep)) {
      throw new Error(`Image path escapes images dir: ${base}`);
    }
    const buf = await fs.readFile(fullPath);
    parts.push({
      inlineData: {
        mimeType: 'image/webp',
        data: buf.toString('base64'),
      },
    });
  }
  return parts;
}

async function processListCommand(imageFilenames, imagesDir, apiKey) {
  const imageParts = await loadImageParts(imageFilenames, imagesDir);
  const parts = [...imageParts, { text: LIST_PROMPT }];
  const json = await callGemini(parts, LIST_SCHEMA, apiKey);
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.items)) throw new Error('Invalid response shape');
  for (const item of parsed.items) {
    if (!Number.isInteger(item.confidence) || item.confidence < 1 || item.confidence > 10) {
      item.confidence = 10;
    }
    if (typeof item.text !== 'string') item.text = String(item.text || '');
    if (typeof item.category !== 'string' || !item.category.trim()) item.category = 'Övrigt';
  }
  return parsed.items;
}

async function processOcrCommand(imageFilenames, imagesDir, apiKey) {
  const imageParts = await loadImageParts(imageFilenames, imagesDir);
  const parts = [...imageParts, { text: OCR_PROMPT }];
  return await callGemini(parts, null, apiKey);
}

function buildChecklistFromItems(items, userText) {
  const checklist = [];

  if (userText) {
    for (const line of userText.split('\n')) {
      const t = line.trim();
      if (t) checklist.push({ text: t, checked: false });
    }
    checklist.push({ text: '── AI-genererat ──', checked: false });
  }

  const seenCategories = [];
  const byCategory = {};
  for (const item of items) {
    const cat = item.category || 'Övrigt';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
      seenCategories.push(cat);
    }
    byCategory[cat].push(item);
  }

  for (const cat of seenCategories) {
    checklist.push({ text: `── ${cat} ──`, checked: false });
    for (const item of byCategory[cat]) {
      checklist.push({
        text: item.text,
        checked: false,
        confidence: item.confidence,
      });
    }
  }

  return checklist;
}

// In-memory rate limiter — Map keyed on userId.
// Resets on process restart (acceptable for V1).
const aiCallTimestamps = new Map();

function checkAiLimit(userId, hourly = 10, daily = 50) {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const ts = (aiCallTimestamps.get(userId) || []).filter(t => now - t < DAY);
  aiCallTimestamps.set(userId, ts);

  const hourTimestamps = ts.filter(t => now - t < HOUR);
  if (hourTimestamps.length >= hourly) {
    const oldestInHour = hourTimestamps[0];
    return { allowed: false, reason: 'hourly', retryAfter: HOUR - (now - oldestInHour) };
  }
  if (ts.length >= daily) {
    return { allowed: false, reason: 'daily', retryAfter: DAY - (now - ts[0]) };
  }
  return {
    allowed: true,
    record: () => {
      const current = aiCallTimestamps.get(userId) || [];
      current.push(Date.now());
      aiCallTimestamps.set(userId, current);
    },
  };
}

module.exports = {
  parseCommand,
  processListCommand,
  processOcrCommand,
  buildChecklistFromItems,
  checkAiLimit,
};
