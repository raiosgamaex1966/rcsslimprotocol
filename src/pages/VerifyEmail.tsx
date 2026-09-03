import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCheck, Inbox, LoaderCircle, LogIn, MailCheck, MousePointerClick, Send } from 'lucide-react';
import { Button, Logo, ModeBadge } from '../components/ui';
import { isDemoMode, resendVerification, verifyDemoEmail } from '../lib/backend';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const email = (location.state as { email?: string } | null)?.email ?? '';
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoDone, setDemoDone] = useState(false);

  async function handleResend() {
    setBusy(true);
    await resendVerification(email);
    setBusy(false);
    setSent(true);
  }

  async function handleDemoVerify() {
    setBusy(true);
    const res = await verifyDemoEmail();
    setBusy(false);
    if (res.ok) {
      setDemoDone(true);
      await refreshSession();
      window.setTimeout(() => navigate('/app'), 900);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-900 via-brand-950 to-slate-950 px-5 py-10">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="absolute top-0 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="flex justify-center">
          <Logo dark size="lg" />
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/40">
            <Inbox className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">Verifique seu e-mail 📬</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Enviamos um link de confirmação para{' '}
            <b className="text-slate-800">{email || 'seu e-mail'}</b>. Clique no link para ativar sua conta e depois faça login.
          </p>

          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 shrink-0 text-brand-600" /> Confira também a caixa de spam / promoções.
            </p>
            <p className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4 shrink-0 text-brand-600" /> O link expira em algumas horas — reenvie se necessário.
            </p>
          </div>

          {isDemoMode() && (
            <div className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50 p-4">
              <p className="text-xs font-extrabold text-brand-900">🧪 Modo demonstração</p>
              <p className="mt-1 text-[11px] leading-relaxed text-brand-800">
                Como o Supabase não está conectado neste build, simule o clique no link de verificação abaixo.
              </p>
              <Button type="button" full className="mt-3 !py-2.5 text-xs" onClick={handleDemoVerify} disabled={busy || demoDone}>
                {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MousePointerClick className="h-3.5 w-3.5" />}
                {demoDone ? 'E-mail verificado! Entrando…' : 'Simular clique no link de verificação'}
              </Button>
            </div>
          )}

          <div className="mt-5 grid gap-2.5">
            <Button variant="secondary" onClick={handleResend} disabled={busy}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sent ? 'Reenviado com sucesso!' : 'Reenviar e-mail de verificação'}
            </Button>
            <Link to="/login">
              <Button full className="!py-3">
                <LogIn className="h-4 w-4" /> Já verifiquei — fazer login
              </Button>
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            {isDemoMode() && <ModeBadge />}
          </div>
        </div>
      </div>
    </div>
  );
}
