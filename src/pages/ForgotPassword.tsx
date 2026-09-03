import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, LoaderCircle, Mail, Send } from 'lucide-react';
import { Button, Field, Logo, ModeBadge, TextInput } from '../components/ui';
import { isDemoMode, requestPasswordReset } from '../lib/backend';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setBusy(true);
    const res = await requestPasswordReset(email);
    setBusy(false);
    setDone(res.message ?? 'Solicitação enviada.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-5">
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/30" style={{ height: 52, width: 52 }}>
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">Recuperar senha</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
          </p>

          {done && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold leading-relaxed text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              ✅ {done}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="E-mail cadastrado" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
              </div>
            </Field>
            <Button type="submit" full disabled={busy || !email} className="!py-3">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar link de redefinição
            </Button>
          </form>

          <div className="mt-4 flex justify-center">{isDemoMode() && <ModeBadge />}</div>
        </div>

        <p className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
