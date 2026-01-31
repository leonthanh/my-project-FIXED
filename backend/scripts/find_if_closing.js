const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'routes', 'listeningTests.js'), 'utf8');
const needle = "if (!scoredFromSections && Array.isArray(questions) && questions.length > 0) {";
const idx = s.indexOf(needle);
console.log('found at', idx);
if (idx < 0) process.exit(0);
let brace = 0;
let startIndex = s.indexOf('{', idx);
for (let i = startIndex; i < s.length; i++) {
  if (s[i] === '{') brace++;
  if (s[i] === '}') brace--;
  if (brace === 0) {
    const line = s.slice(0, i).split('\n').length;
    console.log('closing brace at index', i, 'line', line);
    console.log('context:\n', s.slice(Math.max(0, i - 120), i + 40));
    break;
  }
}
