export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, base64Data, mimeType, maxTokens } = req.body;
  
  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return res.status(500).json({ error: 'LLM_API_KEY não configurada na Vercel.' });
  }

  const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const fullDataUri = base64Data.startsWith('data:') ? base64Data : `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

  if (provider === 'gemini') {
    const cleanModel = model.replace(/^models\//, '');
    try {
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: pureBase64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens || 2000 },
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
          max_tokens: maxTokens || 2000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: pureBase64 } },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });
      const data = await aRes.json();
      if (!aRes.ok) return res.status(aRes.status).json({ error: data.error?.message });
      return res.status(200).json({ text: data.content?.[0]?.text ?? '' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // OpenAI / OpenRouter / Custom / Groq / DeepInfra (chat completions com image_url)
  let baseUrl = 'https://api.openai.com/v1';
  if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
  if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
  if (provider === 'deepinfra') baseUrl = 'https://api.deepinfra.com/v1/openai';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: fullDataUri, detail: 'high' } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: maxTokens || 2000,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erro na LLM' });
    return res.status(200).json({ text: data.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
