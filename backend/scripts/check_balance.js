const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'routes', 'listeningTests.js');
const s = fs.readFileSync(file, 'utf8');
let paren = 0, brace = 0, brack = 0;
let state = null; // null | single | double | backtick | line | block
let line = 1, col = 1;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  const nxt = s[i + 1];

  if (state === 'line') {
    if (ch === '\n') state = null;
  } else if (state === 'block') {
    if (ch === '*' && nxt === '/') { state = null; i++; col++; }
  } else if (state === 'single') {
    if (ch === '\\' && nxt) { i++; col++; } else if (ch === "'") state = null;
  } else if (state === 'double') {
    if (ch === '\\' && nxt) { i++; col++; } else if (ch === '"') state = null;
  } else if (state === 'backtick') {
    if (ch === '\\' && nxt) { i++; col++; } else if (ch === '`') state = null;
  } else {
    if (ch === '/' && nxt === '*') { state = 'block'; i++; col++; }
    else if (ch === '/' && nxt === '/') { state = 'line'; i++; col++; }
    else if (ch === "'") state = 'single';
    else if (ch === '"') state = 'double';
    else if (ch === '`') state = 'backtick';
    else if (ch === '(') paren++;
    else if (ch === ')') { paren--; if (paren < 0) { console.log('Unmatched ) at', line + ':' + col); console.log(s.slice(Math.max(0, i-120), i+40)); process.exit(1); } }
    else if (ch === '{') brace++;
    else if (ch === '}') { brace--; if (brace < 0) { console.log('Unmatched } at', line + ':' + col); console.log(s.slice(Math.max(0, i-120), i+40)); process.exit(1); } }
    else if (ch === '[') brack++;
    else if (ch === ']') { brack--; if (brack < 0) { console.log('Unmatched ] at', line + ':' + col); console.log(s.slice(Math.max(0, i-120), i+40)); process.exit(1); } }
  }

  if (ch === '\n') { line++; col = 1; } else col++;
}
console.log('final counts -> paren:', paren, 'brace:', brace, 'brack:', brack);
process.exit(0);
