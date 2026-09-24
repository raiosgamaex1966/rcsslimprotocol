export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, maxTokens } = req.body;
  
  // Lẽ configurações da Vercel
  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return res.status(500).json({ error: 'LLM_API_KEY não configurada na Vercel.' });
  }

  if (provider === 'gemini') {
    const cleanModel = model.replace(/^models\//, '');
    try {
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens || 1500 },
        }),
      });
      const data = await gRes.json();
      if (!gRes.ok) return res.status(gRes.status).json({ error: data.error?.message });
      return res.status(200).json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (provider === 'anthropic') {
    try {
      const aRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens || 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await aRes.json();
      if (!aRes.ok) return res.status(aRes.status).json({ error: data.error?.message });
      return res.status(200).json({ text: data.content?.[0]?.text ?? '' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Compatível com OpenAI (OpenRouter, Groq, DeepInfra, etc)
  let baseUrl = 'https://api.openai.com/v1';
  if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
  if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
  if (provider === 'deepinfra') baseUrl = 'https://api.deepinfra.com/v1/openai';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: maxTokens || 1500,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erro na LLM' });
    return res.status(200).json({ text: data.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
