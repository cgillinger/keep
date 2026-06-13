#!/usr/bin/env node
/*
 * Build step: minify + fingerprint the frontend so it can be cached
 * immutably. Output goes to public/dist/ (git-ignored, generated in Docker).
 *
 * IMPORTANT: app.js is a classic script whose functions are called from inline
 * onclick="fn()" handlers in index.html. They MUST stay global, so we minify
 * whitespace + syntax only and never rename identifiers.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

const pub = path.join(__dirname, 'public');
const distDir = path.join(pub, 'dist');

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// ----- JS: minify WITHOUT mangling identifiers (keeps the global onclick contract) -----
const appJs = fs.readFileSync(path.join(pub, 'app.js'), 'utf8');
const jsMin = esbuild.transformSync(appJs, {
  loader: 'js',
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  legalComments: 'none',
}).code;
const jsName = `app.${hash(jsMin)}.js`;
fs.writeFileSync(path.join(distDir, jsName), jsMin);

// ----- CSS: concat in index.html link order, then minify -----
const cssOrder = [
  'base.css',
  'layout.css',
  'components.css',
  'confidence-badge.css',
  'modals.css',
  'utilities.css',
  'debug.css',
];
const cssConcat = cssOrder.map((f) => fs.readFileSync(path.join(pub, 'css', f), 'utf8')).join('\n');
const cssMin = esbuild.transformSync(cssConcat, { loader: 'css', minify: true }).code;
const cssName = `app.${hash(cssMin)}.css`;
fs.writeFileSync(path.join(distDir, cssName), cssMin);

// ----- index.html: rewrite references to the fingerprinted bundles -----
let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
// Drop the individual stylesheet links...
html = html.replace(/[ \t]*<link rel="stylesheet" href="css\/[^"]+">\n/g, '');
// ...and add the single bundled stylesheet before </head>.
html = html.replace('</head>', `  <link rel="stylesheet" href="dist/${cssName}">\n</head>`);
// Swap the app script for the fingerprinted bundle.
html = html.replace(/<script src="app\.js[^"]*"( defer)?><\/script>/, `<script src="dist/${jsName}" defer></script>`);
fs.writeFileSync(path.join(distDir, 'index.html'), html);

// Sanity: the rewrite must have happened.
if (!html.includes(`dist/${jsName}`) || !html.includes(`dist/${cssName}`)) {
  console.error('build.js: failed to rewrite index.html references');
  process.exit(1);
}

console.log(`Built dist/${jsName} (${(jsMin.length / 1024).toFixed(1)} KB), dist/${cssName} (${(cssMin.length / 1024).toFixed(1)} KB), dist/index.html`);
