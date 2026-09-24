const fs = require('fs');
let lines = fs.readFileSync('src/lib/llm.ts', 'utf8').split('\n');

// Remove lines 344 to 366 (0-indexed: 343 to 365)
// Line 343 is the closing brace of requestLLM, we keep that.
// Lines 344-366 is the orphaned code (1-indexed), 0-indexed: 343-365
lines.splice(343, 23);

fs.writeFileSync('src/lib/llm.ts', lines.join('\n'));
console.log('Fixed. Total lines now:', lines.length);
