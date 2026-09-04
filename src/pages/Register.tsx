import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
  User,
  UserRound,
} from 'lucide-react';
import { Button, Field, Logo, ModeBadge, SelectInput, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../lib/backend';
import type { Sexo } from '../lib/types';
import { imcInfo } from '../lib/schedule';

const STEPS = ['Dados pessoais', 'Métricas e acesso'];

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step 1
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sexo | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // step 2
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState(false);

  const imc = useMemo(() => {
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    return imcInfo(Number.isFinite(w) ? w : null, Number.isFinite(h) ? h : null);
  }, [weight, height]);

  function validateStep1(): string | null {
    if (name.trim().length < 3) return 'Informe seu nome completo.';
    if (!sex) return 'Selecione o sexo.';
    if (!birthDate) return 'Informe sua data de nascimento.';
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
    if (age < 12 || age > 120) return 'Data de nascimento inválida.';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Informe um e-mail válido.';
    if (phone.replace(/\D/g, '').length < 10) return 'Informe um telefone válido com DDD.';
    if (whatsapp.replace(/\D/g, '').length < 10) return 'Informe um WhatsApp válido com DDD.';
    return null;
  }

  function validateStep2(): string | null {
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    if (!Number.isFinite(w) || w < 30 || w > 400) return 'Informe um peso válido (kg).';
    if (!Number.isFinite(h) || h < 100 || h > 250) return 'Informe uma altura válida (cm).';
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (password !== confirmPw) return 'As senhas não coincidem.';
    if (!captcha) return 'Confirme que você não é um robô.';
    return null;
  }

  async function handleNext() {
    setError(null);
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setStep(1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    const res = await signUp({
      name,
      sex: sex as Sexo,
      birthDate,
      email,
      phone,
      whatsapp,
      startWeightKg: parseFloat(weight.replace(',', '.')),
      heightCm: parseFloat(height.replace(',', '.')),
      password,
    });
    setLoading(false);
    if (res.ok) {
      navigate('/verificar-email', { state: { email } });
    } else {
      setError(res.message ?? 'Não foi possível criar a conta.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-slate-50 to-slate-50 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-xl px-5">
        <div className="flex items-center justify-between">
          <Logo />
          {isDemoMode() && <ModeBadge />}
        </div>

        <div className="mt-8 animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 sm:p-8">
          {/* Stepper */}
          <div className="mb-7 flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold transition-all ${
                    i < step
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                       : i === step
                         ? 'bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-500/15'
                         : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                   }`}
                 >
                   {i < step ? <Check className="h-4 w-4" /> : i + 1}
                 </button>
                 <span className={`hidden text-[11px] font-bold sm:block ${i === step ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  {label}
                </span>
                {i === 0 && <div className={`h-0.5 flex-1 rounded ${step > 0 ? 'bg-brand-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {step === 0 ? (
            <div className="animate-fade-in">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Vamos começar 🎉</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Conte um pouco sobre você para personalizar seu painel.</p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <Field label="Nome completo" required>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <TextInput placeholder="Ex.: Maria da Silva Santos" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sexo" required>
                    <SelectInput value={sex} onChange={(e) => setSex(e.target.value as Sexo)} className="pl-3.5 font-normal">
                      <option value="">Selecione…</option>
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro / prefiro não informar</option>
                    </SelectInput>
                  </Field>
                  <Field label="Data de nascimento" required>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} className="pl-10" />
                    </div>
                  </Field>
                </div>

                <Field label="E-mail" required hint="será usado para login">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <TextInput type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Telefone" required hint="com DDD">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
                    </div>
                  </Field>
                  <Field label="WhatsApp" required hint="com DDD">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type="tel" placeholder="(11) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="pl-10" />
                    </div>
                  </Field>
                </div>

                <Button type="button" full className="!py-3" onClick={handleNext}>
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Métricas e acesso 🔐</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Seu peso e altura iniciais ajudam a acompanhar a evolução do tratamento.</p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Peso atual (kg)" required>
                    <div className="relative">
                      <Scale className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type="number" step="0.1" min="30" max="400" inputMode="decimal" placeholder="Ex.: 82,5" value={weight} onChange={(e) => setWeight(e.target.value)} className="pl-10" />
                    </div>
                  </Field>
                  <Field label="Altura (cm)" required>
                    <div className="relative">
                      <Ruler className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type="number" step="1" min="100" max="250" inputMode="numeric" placeholder="Ex.: 165" value={height} onChange={(e) => setHeight(e.target.value)} className="pl-10" />
                    </div>
                  </Field>
                </div>

                {imc && (
                  <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-xs font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    IMC estimado: {imc.imc.toLocaleString('pt-BR')} — <span className={imc.color}>{imc.label}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Senha" required hint="mín. 6 caracteres">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-11" />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Mostrar/ocultar senha">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirmar senha" required>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput type={showPw ? 'text' : 'password'} placeholder="••••••••" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="pl-10" />
                    </div>
                  </Field>
                </div>

                {/* Widget "Não sou um robô" */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCaptcha((prev) => !prev)}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition-all duration-200 ${
                        captcha ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/40' : 'border-slate-300 bg-white hover:border-brand-400 dark:border-slate-600 dark:bg-slate-900'
                      }`}
                      aria-label="Não sou um robô"
                      aria-pressed={captcha}
                    >
                      {captcha && <Check className="h-4 w-4 animate-pop" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Não sou um robô</p>
                      <p className="text-[10px] text-slate-400">Proteção contra acesso automatizado</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">reCAPTCHA</span>
                      <UserRound className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400 dark:border-slate-700">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-brand-500" /> Protegido por verificação humana
                    </span>
                    <span>Privacidade · Termos</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setStep(0)} className="!px-4">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button type="submit" full disabled={loading} className="!py-3">
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                    {loading ? 'Criando conta…' : 'Criar conta'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Já tem conta?{' '}
          <Link to="/login" className="font-extrabold text-brand-700 hover:underline dark:text-brand-400">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
