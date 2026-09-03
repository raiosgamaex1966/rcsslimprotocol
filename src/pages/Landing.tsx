import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarCheck2, ChartNoAxesColumn, ClipboardList, HeartPulse, ShieldCheck, Syringe, TrendingDown } from 'lucide-react';
import { Button, DisclaimerBox, Logo, ModeBadge } from '../components/ui';
import { isDemoMode } from '../lib/backend';

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-5 sm:py-5">
          <Logo dark />
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {isDemoMode() && <ModeBadge />}
            <Link to="/login">
              <Button variant="white" className="!px-3.5 !py-1.5 text-[11px] sm:!px-4 sm:!py-2 sm:text-xs">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[360px] w-[90vw] max-w-[720px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[100px] sm:h-[480px] sm:blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-teal-500/15 blur-[100px] sm:h-72 sm:w-72" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-16 pt-28 sm:px-5 sm:gap-10 sm:pb-20 sm:pt-32 lg:grid-cols-2 lg:pt-36">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-1.5 text-[10px] font-bold text-brand-300 sm:px-3.5 sm:text-xs">
              <HeartPulse className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Acompanhamento de canetas GLP-1 · Semaglutida, Liraglutida e Tirzepatida
            </span>
            <h1 className="mt-4 text-[1.9rem] font-extrabold leading-[1.08] tracking-tight sm:mt-5 sm:text-4xl sm:leading-[1.08] lg:text-[3.4rem]">
              Seu tratamento com caneta, <span className="text-gradient">organizado e sob controle.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-slate-300 sm:mt-5 sm:text-base">
              Registre sua medicação e a miligrama semanal, acompanhe a próxima dose com contagem regressiva, o histórico de aplicações,
              a evolução do peso e o IMC — tudo em um painel simples e bonito.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <Link to="/cadastro">
                <Button className="!px-5 !py-2.5 text-sm sm:!px-6 sm:!py-3">
                  Criar minha conta <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="white" className="!px-5 !py-2.5 text-sm sm:!px-6 sm:!py-3">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[11px] text-slate-400 sm:mt-6 sm:text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400 sm:h-4 sm:w-4" />
              Login seguro com verificação de e-mail (Supabase Auth)
            </p>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-500/30 to-teal-400/20 blur-2xl" />
              <img
                src="images/hero-pen.png"
                alt="Caneta injetora GLP-1"
                className="relative w-full rounded-[2rem] border border-white/10 shadow-2xl shadow-brand-950"
              />
              {/* Cards flutuantes */}
              <div className="absolute -left-4 top-8 hidden animate-pop rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 shadow-xl backdrop-blur sm:block [animation-delay:400ms]">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/20 text-brand-300">
                    <CalendarCheck2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Próxima dose</p>
                    <p className="text-sm font-extrabold">0,50 mg · em 3 dias</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-3 bottom-10 hidden animate-pop rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 shadow-xl backdrop-blur sm:block [animation-delay:550ms]">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <TrendingDown className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Peso desde o início</p>
                    <p className="text-sm font-extrabold">− 4,2 kg</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative border-t border-white/5 bg-slate-900/50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Syringe, t: 'Sua medicação', d: 'Cadastre a caneta e a miligrama exata que você usa por semana, entre 20+ marcas aprovadas no Brasil.' },
              { icon: BellRing, t: 'Próxima dose', d: 'Contagem regressiva em dias, horário e dia da semana configurados por você.' },
              { icon: ClipboardList, t: 'Histórico de aplicações', d: 'Registre cada dose aplicada com um toque e veja sua taxa de adesão ao tratamento.' },
              { icon: ChartNoAxesColumn, t: 'Peso, IMC e metas', d: 'Evolução do peso em gráfico simples, IMC calculado automaticamente e variação desde o início.' },
            ].map((f, i) => (
              <div
                key={f.t}
                className="animate-fade-up rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition-colors hover:border-brand-400/40 hover:bg-white/[0.07]"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/25">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-extrabold">{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{f.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/20 to-teal-500/10 p-7">
              <h3 className="text-xl font-extrabold tracking-tight">Como funciona o fluxo</h3>
              <ol className="mt-5 space-y-4">
                {[
                  ['Cadastro em 2 etapas', 'Dados pessoais (nome, sexo, nascimento, contatos) e depois peso, altura, senha e o botão "Não sou um robô".'],
                  ['Verificação de e-mail', 'Ative sua conta pelo link enviado (Supabase Auth) e depois faça login com e-mail e senha.'],
                  ['Configure o tratamento', 'Escolha a caneta (ex.: Ozempic, Wegovy, Saxenda, Mounjaro), a miligrama semanal, o dia e o horário.'],
                  ['Acompanhe o painel', 'Bem-vindo(a) com seu nome, próxima dose, histórico, IMC e evolução de peso.'],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-extrabold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{t}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-400">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col justify-between gap-5">
              <DisclaimerBox className="border-amber-400/20 bg-amber-400/10 text-amber-100 p-6 [&_p]:text-amber-100/80" />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                <p className="font-extrabold text-white">Pronto para começar?</p>
                <p className="mt-1 text-[13px] text-slate-400">Leva menos de 2 minutos para criar sua conta.</p>
                <Link to="/cadastro" className="mt-4 inline-block">
                  <Button className="!px-5 !py-2.5 text-xs">
                    Criar conta gratuita <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        <p>MinhaCaneta — protótipo informativo. Não substitui orientação médica. 🇧🇷</p>
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/admin" className="font-bold text-slate-400 hover:text-brand-300">
            🛡️ Área do Super Admin
          </Link>
          <span className="text-slate-600">·</span>
          <Link to="/profissional/cadastro" className="font-bold text-slate-400 hover:text-cyan-300">
            👩‍⚕️ Sou médico(a), nutricionista ou personal
          </Link>
        </p>
      </footer>
    </div>
  );
}
