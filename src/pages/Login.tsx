import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, LogIn, Mail } from 'lucide-react';
import { Button, DisclaimerBox, Field, Logo, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.ok) {
      // Verifica se o usuário é profissional para direcionar para o portal correto
      const user = await import('../lib/backend').then((m) => m.getSessionUser());
      if (user?.id) {
        const pData = await import('../lib/backend').then((m) => m.loadPatientData(user.id));
        if (pData?.profile.professional) {
          navigate('/profissional');
          return;
        }
      }
      navigate('/app');
    } else if (res.needsVerification) {
      navigate('/verificar-email', { state: { email } });
    } else {
      setError(res.message ?? 'Não foi possível entrar.');
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo (imagem) */}
      <div className="relative hidden w-[44%] overflow-hidden bg-slate-950 lg:block">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-brand-500/25 blur-[110px]" />
        <img src="images/hero-pen.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo dark />
          <div>
            <p className="text-2xl font-extrabold leading-snug tracking-tight text-white">
              “Acompanhar a dose da semana nunca foi tão simples.”
            </p>
            <p className="mt-3 max-w-sm text-sm text-slate-400">
              Próxima dose, histórico de aplicações, peso e IMC em um único painel.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className="w-full max-w-md animate-fade-up">
            <div className="lg:hidden"><Logo /></div>
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-0">Entrar na sua conta</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Acesse seu painel de acompanhamento do tratamento.</p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Field label="E-mail" required>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Senha" required>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex justify-end">
                <Link to="/recuperar-senha" className="text-xs font-bold text-brand-700 hover:underline dark:text-brand-400">
                  Esqueci minha senha
                </Link>
              </div>

              <Button type="submit" full disabled={loading} className="!py-3">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Entrar
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Ainda não tem conta?{' '}
              <Link to="/cadastro" className="font-extrabold text-brand-700 hover:underline dark:text-brand-400">
                Criar cadastro
              </Link>
            </p>

            <p className="mt-2 text-center text-xs text-slate-400">
              É médico, nutricionista ou personal?{' '}
              <Link to="/profissional/cadastro" className="font-extrabold text-cyan-700 hover:underline dark:text-cyan-400">
                Acesse o Portal do Profissional
              </Link>
            </p>

            <DisclaimerBox compact className="mt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
