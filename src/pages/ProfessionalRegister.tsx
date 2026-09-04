import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
  UserRound,
} from 'lucide-react';
import { Button, Field, Logo, ModeBadge, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../lib/backend';
import { PROFESSIONAL_ROLE_LABEL, type ProfessionalRole } from '../lib/types';

const ROLE_ICONS: Record<ProfessionalRole, typeof Stethoscope> = {
  medico: Stethoscope,
  nutricionista: HeartPulse,
  personal: BadgeCheck,
};

export default function ProfessionalRegister() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<ProfessionalRole>('medico');
  const [name, setName] = useState('');
  const [credential, setCredential] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) return setError('Informe seu nome completo.');
    if (!credential.trim()) return setError('Informe seu registro profissional (CRM, CRN, CREF etc.).');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.');
    if (phone.replace(/\D/g, '').length < 10) return setError('Informe um telefone válido com DDD.');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirmPw) return setError('As senhas não coincidem.');
    if (!captcha) return setError('Confirme que você não é um robô.');

    setLoading(true);
    const profData = { role, credential: credential.trim() };
    try {
      localStorage.setItem(`prof_${email.trim().toLowerCase()}`, JSON.stringify(profData));
    } catch {
      // ignore
    }
    const res = await signUp({
      name,
      sex: 'outro',
      birthDate: '',
      email,
      phone,
      whatsapp: phone,
      startWeightKg: null,
      heightCm: null,
      password,
      professional: profData,
    });
    setLoading(false);
    if (res.ok) {
      navigate('/verificar-email', { state: { email } });
    } else {
      setError(res.message ?? 'Não foi possível criar a conta.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/60 via-slate-50 to-slate-50 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-xl px-5">
        <div className="flex items-center justify-between">
          <Logo />
          {isDemoMode() && <ModeBadge />}
        </div>

        <div className="mt-8 animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Cadastro de profissional de saúde</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Acompanhe seus pacientes com acesso restrito ao seu escopo: médico, nutricionista ou educador físico.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-5">
            <p className="text-[13px] font-extrabold text-slate-700 dark:text-slate-200">Qual é a sua área?</p>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              {(Object.keys(PROFESSIONAL_ROLE_LABEL) as ProfessionalRole[]).map((r) => {
                const Icon = ROLE_ICONS[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-2xl border p-3.5 text-left transition-all ${
                      role === r
                        ? 'border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/25 dark:bg-cyan-500/10'
                        : 'border-slate-200 bg-white/70 hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-800/70'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${role === r ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`} />
                    <p className="mt-1.5 text-[11px] font-extrabold text-slate-800 dark:text-slate-100">{PROFESSIONAL_ROLE_LABEL[r]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Nome completo" required>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput placeholder="Ex.: Dra. Ana Souza" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registro profissional" required hint="CRM, CRN, CREF...">
                <TextInput placeholder="Ex.: CRM 123456-SP" value={credential} onChange={(e) => setCredential(e.target.value)} />
              </Field>
              <Field label="Telefone" required hint="com DDD">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
                </div>
              </Field>
            </div>

            <Field label="E-mail profissional" required hint="será usado para login">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Senha" required hint="mín. 6 caracteres">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-11" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirmar senha" required>
                <TextInput type={showPw ? 'text' : 'password'} placeholder="••••••••" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCaptcha(true);
                    window.setTimeout(() => setCaptcha(false), 2200);
                  }}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition-all duration-200 ${
                    captcha ? 'border-cyan-600 bg-cyan-600 text-white shadow-md shadow-cyan-500/40' : 'border-slate-300 bg-white hover:border-cyan-400 dark:border-slate-600 dark:bg-slate-900'
                  }`}
                >
                  {captcha && <Check className="h-4 w-4 animate-pop" />}
                </button>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Não sou um robô</p>
              </div>
            </div>

            <Button type="submit" full disabled={loading} className="!py-3">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
              {loading ? 'Criando conta…' : 'Criar conta profissional'}
            </Button>
          </form>

          <p className="mt-5 rounded-xl bg-cyan-50 p-3 text-[11px] leading-relaxed text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-200">
            Após confirmar o e-mail, você acessa o <b>Portal do Profissional</b>, onde poderá solicitar acesso a pacientes usando o
            código pessoal que cada paciente encontra em "Perfil → Profissionais conectados".
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/login" className="inline-flex items-center gap-1.5 font-extrabold text-cyan-700 hover:underline dark:text-cyan-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Já tenho conta profissional — fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
