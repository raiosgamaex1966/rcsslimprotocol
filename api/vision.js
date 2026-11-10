// api/vision.js — OCR de receitas médicas e laudos laboratoriais usando config salva no Supabase
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

  // Suporte a múltiplas imagens (páginas do laudo) ou imagem única
  let imageList = [];
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    imageList = req.body.images;
  } else if (base64Data) {
    imageList = [{ data: base64Data, mimeType: mimeType || 'image/jpeg' }];
  }

  if (imageList.length === 0) {
    return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
  }

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

  try {
    if (provider === 'gemini') {
      const cleanModel = model.replace(/^models\//, '');
      const parts = [{ text: prompt }];

      for (const img of imageList) {
        const pure = img.data.includes(',') ? img.data.split(',')[1] : img.data;
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: pure,
          },
        });
      }

      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens || 3000 },
        }),
      });
      const data = await gRes.json();
      if (!gRes.ok) return res.status(gRes.status).json({ error: data.error?.message });
      return res.status(200).json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' });
    }

    if (provider === 'anthropic') {
      const content = [];
      for (const img of imageList) {
        const pure = img.data.includes(',') ? img.data.split(',')[1] : img.data;
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mimeType || 'image/jpeg',
            data: pure,
          },
        });
      }
      content.push({ type: 'text', text: prompt });

      const aRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens || 3000,
          messages: [{ role: 'user', content }],
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

    const content = [{ type: 'text', text: prompt }];
    for (const img of imageList) {
      const full = img.data.startsWith('data:') ? img.data : `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`;
      content.push({ type: 'image_url', image_url: { url: full, detail: 'high' } });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        temperature: 0.1,
        max_tokens: maxTokens || 3000,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erro LLM Vision' });
    return res.status(200).json({ text: data.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
