// api/settings.js — Salva e lê configurações de LLM no Supabase (backend seguro)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseRequest(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  if (method === 'GET') return res.json();
  return null;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados na Vercel.' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await supabaseRequest('/admin_settings?id=eq.1&select=llm_provider,llm_model,llm_api_key,llm_enabled');
      if (!rows || rows.length === 0) return res.status(200).json(null);
      const row = rows[0];
      // Retorna os dados mas OFUSCA a chave (mostra só os últimos 4 chars)
      return res.status(200).json({
        provider: row.llm_provider,
        model: row.llm_model,
        enabled: row.llm_enabled,
        apiKeyHint: row.llm_api_key ? `...${row.llm_api_key.slice(-4)}` : null,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { provider, model, apiKey, enabled } = req.body;
    if (!provider || !model || !apiKey) {
      return res.status(400).json({ error: 'Campos obrigatórios: provider, model, apiKey.' });
    }
    try {
      await supabaseRequest('/admin_settings', 'POST', {
        id: 1,
        llm_provider: provider,
        llm_model: model,
        llm_api_key: apiKey,
        llm_enabled: enabled !== false,
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
