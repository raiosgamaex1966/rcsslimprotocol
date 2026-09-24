import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Dumbbell,
  Eye,
  EyeOff,
  FlaskConical,
  LoaderCircle,
  LogIn,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
} from 'lucide-react';
import { Badge, Button, Card, Field, Logo, SectionTitle, TextInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { checkSuperAdmin, DEMO_ADMIN_CREDENTIALS } from '../../lib/backend';
import {
  DEFAULT_SYSTEM_PROMPT,
  generateAIMenu,
  getLLMConfig,
  LLM_DEFAULTS,
  saveLLMConfig,
  type LLMConfig,
} from '../../lib/llm';
import { computeTargets } from '../../lib/llm';
import { DEFAULT_EXERCISE_PROMPT } from '../../lib/exercise';
import VideoManager from '../../components/admin/VideoManager';

export default function AdminPanel() {
  const { user, signIn, loading } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    let on = true;
    if (user?.id) {
      checkSuperAdmin(user.id).then((is) => on && setAdmin(is));
    } else {
      setAdmin(null);
    }
    return () => {
      on = false;
    };
  }, [user?.id]);

  async function handleLogin() {
    setLoginError(null);
    setLoginBusy(true);
    const res = await signIn(email, password);
    setLoginBusy(false);
    if (!res.ok) setLoginError(res.message ?? 'Falha no login.');
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <div className="bg-grid absolute inset-0 h-full opacity-60" />
      <div className="absolute left-1/2 top-0 h-64 w-[640px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[110px]" />

      <div className="relative mx-auto max-w-5xl px-5">
        <div className="flex items-center justify-between py-5">
          <Logo dark />
          <Link to="/app" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao app
          </Link>
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          {loading || (Boolean(user) && admin === null) ? (
            <div className="grid place-items-center py-20">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            </div>
          ) : !user ? (
            /* ---------- login do super admin ---------- */
            <div className="max-w-md mx-auto">
              <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/30" style={{ height: 52, width: 52 }}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">Área do Super Admin</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Acesso restrito. Entre com a conta do super administrador para configurar a LLM que gera cardápios e planos de atividade.
              </p>

              {loginError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{loginError}</div>
              )}

              <div className="mt-5 space-y-4">
                <Field label="E-mail do super admin" required>
                  <TextInput type="email" placeholder="admin@minhacaneta.app" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Senha" required>
                  <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <Button full className="!py-3" onClick={handleLogin} disabled={loginBusy || !email || !password}>
                  {loginBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Entrar como super admin
                </Button>
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50 p-4 text-xs leading-relaxed text-brand-900">
                <p className="font-extrabold">🧪 Credenciais de demonstração</p>
                <p className="mt-1">
                  E-mail: <b>{DEMO_ADMIN_CREDENTIALS.email}</b> · Senha: <b>{DEMO_ADMIN_CREDENTIALS.password}</b>
                </p>
                <p className="mt-1 text-[11px] text-brand-700">
                  No modo demonstração esta conta já vem criada. Em produção, marque <code>role: "admin"</code> no perfil do
                  usuário no Supabase.
                </p>
              </div>
            </div>
          ) : !admin ? (
            /* ---------- sem permissão ---------- */
            <div className="mx-auto max-w-md py-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-xl font-extrabold text-slate-900">Acesso restrito</h1>
              <p className="mt-2 text-sm text-slate-500">
                Sua conta (<b>{user.email}</b>) não possui privilégios de super administrador. Esta área é exclusiva para a
                configuração da LLM do aplicativo.
              </p>
            </div>
          ) : (
            <AdminTools />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= Ferramentas do admin ================= */

const PROVIDERS = [
  { id: 'openai',     label: 'OpenAI (GPT)',       models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'o1-mini'],                                                           placeholder: 'sk-...' },
  { id: 'groq',       label: 'Groq',                models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'gemma2-9b-it'],                  placeholder: 'gsk_...' },
  { id: 'openrouter', label: 'OpenRouter',          models: ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-flash-1.5', 'mistralai/mixtral-8x7b-instruct'], placeholder: 'sk-or-...' },
  { id: 'deepinfra',  label: 'DeepInfra',           models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'meta-llama/Meta-Llama-3-8B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'], placeholder: 'sua chave DeepInfra' },
  { id: 'gemini',     label: 'Google Gemini',       models: ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite'],                             placeholder: 'AIza...' },
  { id: 'anthropic',  label: 'Anthropic (Claude)',  models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],                           placeholder: 'sk-ant-...' },
];

function AdminTools() {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loadedHint, setLoadedHint] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [cfg, setCfg] = useState<LLMConfig>(() => getLLMConfig() ?? { provider: 'openai', apiKey: '', model: LLM_DEFAULTS.openai.model, enabled: true, systemPrompt: DEFAULT_SYSTEM_PROMPT, exercisePrompt: DEFAULT_EXERCISE_PROMPT });

  function patch(p: Partial<LLMConfig>) {
    setCfg((c) => ({ ...c, ...p }));
  }

  const currentProvider = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

  // Carrega configuração salva no backend ao abrir
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data?.provider) {
          setProvider(data.provider);
          setModel(data.model ?? '');
          setEnabled(data.enabled !== false);
          setLoadedHint(data.apiKeyHint ?? null);
        }
      })
      .catch(() => {});
  }, []);

  function handleProviderChange(p: string) {
    setProvider(p);
    const prov = PROVIDERS.find(x => x.id === p);
    setModel(prov?.models[0] ?? '');
    setApiKey('');
    setLoadedHint(null);
  }

  async function handleSave() {
    if (!apiKey && !loadedHint) {
      setSaveResult({ ok: false, msg: 'Informe a chave da API.' });
      return;
    }
    setSaving(true);
    setSaveResult(null);
    try {
      const body: any = { provider, model, enabled };
      // Só envia a chave se o usuário digitou uma nova
      if (apiKey) body.apiKey = apiKey;
      else body.apiKey = '__keep__'; // sinal para o backend manter a chave atual
      
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      setSaveResult({ ok: true, msg: '✅ Configuração salva com sucesso no banco de dados!' });
      if (apiKey) { setLoadedHint(`...${apiKey.slice(-4)}`); setApiKey(''); }
    } catch (e) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : 'Erro desconhecido' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestBusy(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Responda apenas: OK', maxTokens: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setTestResult({ ok: true, msg: `Conexão OK — resposta: "${(data.text || '').slice(0, 40)}"` });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Erro desconhecido' });
    } finally {
      setTestBusy(false);
    }
  }

  const sampleTargets = computeTargets({ weightKg: 78, heightCm: 165, sex: 'feminino', age: 45, doseMg: 0.5, medMaxDose: 1 });

  async function handleGenerateSample() {
    setGenBusy(true);
    setGenResult(null);
    saveLLMConfig(cfg);
    try {
      const days = await generateAIMenu(
        cfg,
        { medId: 'ozempic', doseMg: 0.5, frequency: 'semanal', weekday: 1, time: '08:00', startDate: new Date().toISOString().slice(0, 10) },
        { name: 'Maria Exemplo', sex: 'feminino', birthDate: '1980-05-10', email: 'exemplo@x.com', phone: '', whatsapp: '', startWeightKg: 78, heightCm: 165 },
        78,
        sampleTargets,
        0.5,
        [],
      );
      setGenResult(`✅ Cardápio gerado pela LLM! ${days.length} dias, exemplo — ${days[0].dayName}: ${days[0].meals[0].items.map((i) => i.name).slice(0, 3).join(', ')}…`);
    } catch (e) {
      setGenResult(`❌ Falha: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge className="bg-brand-100 text-brand-700">
          <ShieldCheck className="h-3 w-3" /> Super Admin autenticado
        </Badge>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Configuração da IA — SaaS Admin</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          Escolha o provedor e insira a chave. As configurações ficam salvas <b>com segurança no banco de dados</b> (Supabase) e são lidas pelo servidor da Vercel — nenhum paciente tem acesso a isso.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle icon={<Bot className="h-4 w-4 text-brand-600" />} title="Provedor de IA" subtitle="escolha e configure sua chave" />

          {/* Seletor de provedores */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                  provider === p.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Modelo */}
          <div className="mt-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modelo</label>
            <div className="mt-1 flex gap-2">
              <input
                list={`models-${provider}`}
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Ex: gpt-4o-mini"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <datalist id={`models-${provider}`}>
                {currentProvider.models.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {currentProvider.models.map(m => (
                <button key={m} onClick={() => setModel(m)} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${model === m ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Chave da API */}
          <div className="mt-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Chave da API
              {loadedHint && <span className="ml-2 font-normal normal-case text-emerald-600">Chave atual: {loadedHint}</span>}
            </label>
            <div className="relative mt-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={loadedHint ? 'Deixe em branco para manter a atual' : currentProvider.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Habilitar IA */}
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">IA ativa — pacientes podem gerar cardápios e recomendações</span>
          </label>

          {/* Botões */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar no banco
            </Button>
            <Button variant="secondary" onClick={handleTest} disabled={testBusy}>
              {testBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              Testar conexão
            </Button>
          </div>

          {saveResult && (
            <div className={`mt-3 rounded-xl border px-4 py-2.5 text-xs font-semibold ${saveResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'}`}>
              {saveResult.msg}
            </div>
          )}
          {testResult && (
            <div className={`mt-2 rounded-xl border px-4 py-2.5 text-xs font-semibold ${testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'}`}>
              {testResult.msg}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <SectionTitle icon={<FlaskConical className="h-4 w-4 text-brand-600" />} title="Instruções da IA (prompt)" subtitle="variáveis: {contexto} · {metas} · {meta_refeicao}" />
            <textarea
              value={cfg.systemPrompt ?? ''}
              onChange={(e) => patch({ systemPrompt: e.target.value })}
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-[11px] leading-relaxed text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              A IA recebe automaticamente: medicamento, <b>dose da semana atual</b>, semana de tratamento, peso, altura, IMC, sexo
              e metas (proteína g/kg, kcal, macros). Ela deve retornar JSON com 7 dias × 6 refeições.
            </p>
          </Card>

          <Card className="p-6">
            <SectionTitle icon={<Dumbbell className="h-4 w-4 text-cyan-600" />} title="Prompt de exercícios" subtitle="variáveis: {contexto} · {avaliacao}" />
            <textarea
              value={cfg.exercisePrompt ?? DEFAULT_EXERCISE_PROMPT}
              onChange={(e) => patch({ exercisePrompt: e.target.value })}
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-[11px] leading-relaxed text-slate-700 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              A IA recebe nível de atividade, experiência, dias e minutos disponíveis, local, equipamentos, objetivos, limitações,
              sintomas de alerta, peso mais recente e contexto do tratamento. Sintomas de alerta bloqueiam a geração automática.
            </p>
          </Card>

          <Card className="p-6">
            <SectionTitle icon={<Sparkles className="h-4 w-4 text-brand-600" />} title="Teste de geração" subtitle="paciente exemplo: Ozempic 0,5 mg · 78 kg · 165 cm" />
            <Button onClick={handleGenerateSample} disabled={genBusy || !cfg.apiKey} className="!px-4 !py-2.5 text-xs">
              {genBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {genBusy ? 'Gerando cardápio de exemplo…' : 'Gerar cardápio de exemplo'}
            </Button>
            {genResult && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {genResult}
              </div>
            )}
          </Card>

          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-extrabold">🔒 Sobre a chave da API</p>
            <p className="mt-1">
              Neste protótipo a configuração fica no navegador (localStorage) para permitir testes. <b>Em produção</b>, a chave
              deve ficar no servidor (Supabase Edge Function ou secreta) — nunca no cliente — e o acesso ao painel deve ser
              protegido pela role <code>admin</code> no banco, com a RLS restringindo a tabela de configuração.
            </p>
          </div>
        </div>
      </div>
      <VideoManager />
    </div>
  );
}
