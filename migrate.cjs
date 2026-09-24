const fs = require('fs');
let code = fs.readFileSync('src/lib/llm.ts', 'utf8');

// Replace requestLLM
code = code.replace(/export async function requestLLM\([\s\S]*?\n\}/, `export async function requestLLM(_cfg: LLMConfig, prompt: string, maxTokens: number = 2000): Promise<string> {
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const url = isLocal ? 'http://localhost:3000/api/llm' : '/api/llm';
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, maxTokens }) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? \`Erro HTTP \${res.status}\`);
  return data?.text ?? '';
}`);

// Replace requestLLMVision
code = code.replace(/export async function requestLLMVision\([\s\S]*?\n\}/, `export async function requestLLMVision(_cfg: LLMConfig, prompt: string, base64Data: string, mimeType: string = 'image/jpeg', maxTokens: number = 2000): Promise<string> {
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const url = isLocal ? 'http://localhost:3000/api/vision' : '/api/vision';
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, base64Data, mimeType, maxTokens }) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? \`Erro HTTP \${res.status}\`);
  return data?.text ?? '';
}`);

// Remove cfg checks
code = code.replace(/if \(!cfg \|\| !cfg\.enabled\) \{[\s\S]*?return "Nota: Habilite a Inteligência Artificial[\s\S]*?\}\n/g, '');

fs.writeFileSync('src/lib/llm.ts', code);
console.log('Update complete.');
