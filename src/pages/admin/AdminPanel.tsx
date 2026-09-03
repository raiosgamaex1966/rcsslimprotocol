import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Dumbbell,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  LoaderCircle,
  LogIn,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
} from 'lucide-react';
import { Badge, Button, Card, Field, Logo, SectionTitle, SelectInput, TextInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { checkSuperAdmin, DEMO_ADMIN_CREDENTIALS } from '../../lib/backend';
import {
  DEFAULT_SYSTEM_PROMPT,
  generateAIMenu,
  getLLMConfig,
  LLM_DEFAULTS,
  saveLLMConfig,
  testLLM,
  type LLMConfig,
  type LLMProvider,
} from '../../lib/llm';
import { computeTargets } from '../../lib/llm';
import { DEFAULT_EXERCISE_PROMPT } from '../../lib/exercise';
import { cn } from '../../utils/cn';
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
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
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

function AdminTools() {
  const [cfg, setCfg] = useState<LLMConfig>(() => getLLMConfig() ?? { provider: 'openai', apiKey: '', model: LLM_DEFAULTS.openai.model, enabled: true, systemPrompt: DEFAULT_SYSTEM_PROMPT, exercisePrompt: DEFAULT_EXERCISE_PROMPT });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  function patch(p: Partial<LLMConfig>) {
    setCfg((c) => ({ ...c, ...p }));
    setSaved(false);
    setTestResult(null);
  }

  function handleProvider(p: LLMProvider) {
    setCfg((c) => ({ ...c, provider: p, model: LLM_DEFAULTS[p].model, baseUrl: p === 'custom' ? c.baseUrl ?? '' : undefined }));
    setSaved(false);
  }

  function handleSave() {
    saveLLMConfig(cfg);
    setSaved(true);
  }

  async function handleTest() {
    setTestBusy(true);
    setTestResult(null);
    saveLLMConfig(cfg);
    try {
      const answer = await testLLM({ ...cfg, systemPrompt: undefined });
      setTestResult({ ok: true, msg: `Conexão OK — resposta: "${answer.slice(0, 40)}"` });
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
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Configuração da LLM: nutrição e exercícios</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          A inteligência artificial elabora o cardápio diário e semanal do paciente com base na <b>dose tomada na semana</b>{' '}
          (semaglutida, liraglutida ou tirzepatida), peso, altura e metas de proteína para preservar a massa magra. Sem LLM
          configurada, o app usa cardápios e treinos adaptativos locais.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Configuração */}
        <Card className="p-6">
          <SectionTitle icon={<Bot className="h-4 w-4 text-brand-600" />} title="Conectar provedor" subtitle="chave, modelo e endpoint" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provedor" required>
              <SelectInput value={cfg.provider} onChange={(e) => handleProvider(e.target.value as LLMProvider)}>
                <option value="openai">OpenAI (GPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google (Gemini)</option>
                <option value="custom">Custom (OpenAI-compatível)</option>
              </SelectInput>
            </Field>
            <Field label="Modelo" required hint={LLM_DEFAULTS[cfg.provider].hint}>
              <TextInput placeholder={LLM_DEFAULTS[cfg.provider].model || 'ex.: gpt-4o-mini'} value={cfg.model} onChange={(e) => patch({ model: e.target.value })} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Chave da API" required hint="fica no navegador (protótipo)">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-…"
                  value={cfg.apiKey}
                  onChange={(e) => patch({ apiKey: e.target.value })}
                  className="pl-10 pr-11"
                />
                <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          {cfg.provider === 'custom' && (
            <div className="mt-4">
              <Field label="URL base" required hint="ex.: https://meu-servidor.com/v1">
                <TextInput placeholder="https://…/v1" value={cfg.baseUrl ?? ''} onChange={(e) => patch({ baseUrl: e.target.value })} />
              </Field>
            </div>
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="h-4 w-4 accent-brand-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">LLM ativa: pacientes podem gerar cardápios e planos de atividade com IA</span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4" /> Salvar configuração
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Configuração salva!
              </span>
            )}
            <Button variant="secondary" onClick={handleTest} disabled={testBusy || !cfg.apiKey}>
              {testBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              Testar conexão
            </Button>
          </div>
          {testResult && (
            <div className={cn('mt-3 rounded-xl border px-4 py-2.5 text-xs font-semibold', testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200')}>
              {testResult.msg}
            </div>
          )}
        </Card>

        {/* Prompt + geração */}
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
