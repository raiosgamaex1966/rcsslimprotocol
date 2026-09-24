// api/vision.js — OCR de receitas médicas usando config salva no Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getLLMConfig() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings?id=eq.1&select=llm_provider,llm_model,llm_api_key,llm_enabled`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prompt, base64Data, mimeType, maxTokens } = req.body;

  let cfg = await getLLMConfig();
  if (!cfg?.llm_api_key) {
    cfg = {
      llm_provider: process.env.LLM_PROVIDER || 'openai',
      llm_model: process.env.LLM_MODEL || 'gpt-4o-mini',
      llm_api_key: process.env.LLM_API_KEY,
      llm_enabled: true,
    };
  }

  if (!cfg.llm_api_key) {
    return res.status(500).json({ error: 'Nenhuma chave de IA configurada. Configure no Painel Admin.' });
  }

  const provider = cfg.llm_provider;
  const apiKey = cfg.llm_api_key;
  const model = cfg.llm_model;
  const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const fullDataUri = base64Data.startsWith('data:') ? base64Data : `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

  try {
    if (provider === 'gemini') {
      const cleanModel = model.replace(/^models\//, '');
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: pureBase64 } }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens || 2000 },
        }),
      });
      const data = await gRes.json();
      if (!gRes.ok) return res.status(gRes.status).json({ error: data.error?.message });
      return res.status(200).json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' });
    }

    if (provider === 'anthropic') {
      const aRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model, max_tokens: maxTokens || 2000,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: pureBase64 } },
            { type: 'text', text: prompt },
          ]}],
        }),
      });
      const data = await aRes.json();
      if (!aRes.ok) return res.status(aRes.status).json({ error: data.error?.message });
      return res.status(200).json({ text: data.content?.[0]?.text ?? '' });
    }

    let baseUrl = 'https://api.openai.com/v1';
    if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
    if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
    if (provider === 'deepinfra') baseUrl = 'https://api.deepinfra.com/v1/openai';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: fullDataUri, detail: 'high' } },
        ]}],
        temperature: 0.2, max_tokens: maxTokens || 2000,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erro LLM Vision' });
    return res.status(200).json({ text: data.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
