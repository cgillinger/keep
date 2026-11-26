// Shared note field validation, used by the notes routes and the backup restore.

const VALID_COLORS = [
  '#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90',
  '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8',
  '#e6c9a8', '#e8eaed'
];

// Notes are plain text, stored verbatim and escaped by the frontend at render
// time (escapeHtml/linkify, textContent, value=). The old DOMPurify pass here
// HTML-serialised the text, so "2 < 3" was stored as "2 &lt; 3" and shown that
// way, and anything tag-shaped like "<anna@example.se>" vanished. We now only
// drop control characters (except tab/newline) and enforce the length cap.
function sanitizeInput(input, maxLength = 10000) {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .substring(0, maxLength);
}

function validateColor(color) {
  return VALID_COLORS.includes(color) ? color : '#ffffff';
}

// Returns the JSON string to store, or null when there is nothing to store.
function sanitizeChecklist(isChecklist, items) {
  if (!(isChecklist && items && Array.isArray(items))) return null;
  const sanitized = items
    .slice(0, 100) // Max 100 items
    .map(item => {
      item = item || {};
      const entry = {
        text: sanitizeInput(item.text, 1000),
        checked: !!item.checked
      };
      if (item.isHeader === true) entry.isHeader = true;
      const conf = parseInt(item.confidence, 10);
      if (Number.isInteger(conf) && conf >= 1 && conf <= 10) {
        entry.confidence = conf;
      }
      return entry;
    });
  return JSON.stringify(sanitized);
}

module.exports = { sanitizeInput, validateColor, sanitizeChecklist };
