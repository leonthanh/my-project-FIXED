const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'routes', 'listeningTests.js'), 'utf8');
const needle = 'for (const q of sorted) {';
const idx = s.indexOf(needle);
console.log('found at', idx, 'line', s.slice(0, idx).split('\n').length);
let brace = 0; let i = s.indexOf('{', idx);
for (; i < s.length; i++){
  if (s[i] === '{') brace++;
  if (s[i] === '}') brace--;
  if (brace === 0) { console.log('closing at index', i, 'line', s.slice(0,i).split('\n').length); console.log('context:\n', s.slice(Math.max(0,i-80), i+40)); break; }
}
