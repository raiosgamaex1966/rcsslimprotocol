import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Tv,
  Video,
  X,
} from 'lucide-react';
import type { WorkoutSession } from '../lib/exercise';
import { exerciseYoutubeUrl } from '../lib/exercise';
import type { ExerciseVideo } from '../lib/types';
import { videoEmbedUrl } from '../lib/videoLibrary';
import { cn } from '../utils/cn';

interface Props {
  session: WorkoutSession;
  findVideo: (exerciseName: string) => ExerciseVideo | undefined;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onClose: () => void;
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // ignorar se navegador bloquear áudio automático
  }
}

export default function WorkoutTvModal({
  session,
  findVideo,
  isCompleted,
  onToggleComplete,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exIndex, setExIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCastHelp, setShowCastHelp] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const exercises = session.exercises;
  const current = exercises[exIndex] ?? exercises[0];
  const matchedVideo = current ? findVideo(current.name) : undefined;
  const rawVideoUrl = current?.youtubeUrl || matchedVideo?.videoUrl;
  const embedUrl = rawVideoUrl ? videoEmbedUrl(rawVideoUrl) : null;
  const youtubeLink = current ? exerciseYoutubeUrl(current, matchedVideo?.videoUrl) : 'https://www.youtube.com';

  // Cronômetro de pausa
  const initialRest = current?.restSeconds ?? 60;
  const [secondsLeft, setSecondsLeft] = useState(initialRest);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(current?.restSeconds ?? 60);
    setTimerRunning(false);
  }, [exIndex, current?.restSeconds]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setExIndex((i) => Math.min(exercises.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setExIndex((i) => Math.max(0, i - 1));
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [exercises.length, onClose]);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const target = containerRef.current ?? document.documentElement;
        await target.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Alguns iOS Safari não suportam requestFullscreen fora de <video>; segue modal tela inteira
    }
  }

  async function handleShareWorkout() {
    const lines = [
      `📺 Treino: ${session.dayName} — ${session.title}`,
      `Foco: ${session.focus} · ${session.durationMinutes} min`,
      '',
      ...exercises.map((ex, i) => {
        const lib = findVideo(ex.name);
        const link = exerciseYoutubeUrl(ex, lib?.videoUrl);
        return `${i + 1}. ${ex.name} (${ex.sets}x ${ex.reps})\n   ▶ YouTube: ${link}`;
      }),
    ];
    const shareText = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Treino ${session.dayName} — MinhaCaneta`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback para copiar
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 3000);
    } catch {
      setShowCastHelp(true);
    }
  }

  if (!current) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Modo TV do Treino"
    >
      {/* Barra superior estilo Smart TV */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30">
            <Tv className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-400">
              Modo TV · {session.dayName}
            </p>
            <h2 className="truncate text-base sm:text-xl font-extrabold text-white">
              {session.title} <span className="text-slate-400 font-semibold">· {session.focus}</span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCastHelp((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
              showCastHelp
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            )}
          >
            <Tv className="h-4 w-4" /> Como espelhar na TV
          </button>

          <button
            type="button"
            onClick={() => void handleShareWorkout()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/15 transition-colors"
          >
            {copiedShare ? (
              <>
                <Copy className="h-4 w-4 text-emerald-400" /> Treino + links copiados!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Compartilhar c/ links
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-cyan-500 transition-colors"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" /> Sair da Tela Cheia
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" /> Tela Cheia
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition-colors"
            title="Fechar Modo TV"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </header>

      {/* Guia rápido de transmissão para TV */}
      {showCastHelp && (
        <div className="border-b border-cyan-500/30 bg-cyan-950/60 px-4 py-3 sm:px-8 text-xs text-cyan-100">
          <div className="mx-auto max-w-6xl grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="font-extrabold text-cyan-300">1. Pelo aplicativo YouTube (Smart TV)</p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                Toque em <b>&ldquo;Abrir no YouTube&rdquo;</b> no exercício abaixo e aperte o ícone de <b>Transmitir (📺)</b> no topo do vídeo do YouTube para enviar direto à sua Smart TV ou Chromecast.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="font-extrabold text-cyan-300">2. Pelo Google Chrome (Computador/Android)</p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                Clique em <b>Tela Cheia</b> aqui em cima, abra o menu <b>⋮</b> do Chrome → <b>Transmitir, salvar e compartilhar → Transmitir</b> e selecione sua TV.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="font-extrabold text-cyan-300">3. iPhone (AirPlay) ou WhatsApp na TV</p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                Use <b>Espelhar Tela / Smart View</b> no celular, ou clique em <b>Compartilhar c/ links</b> para enviar os exercícios com links do YouTube para abrir na TV ou tablet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Área principal — legível à distância */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-6 p-4 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Detalhes do exercício atual em fonte gigante */}
          <div className={cn('space-y-5', rawVideoUrl ? 'lg:col-span-7' : 'lg:col-span-8')}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-cyan-500 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-slate-950">
                Exercício {exIndex + 1} de {exercises.length}
              </span>
              <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs sm:text-sm font-bold text-slate-200">
                {session.intensity}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {current.name}
            </h1>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Séries</p>
                <p className="mt-1 text-2xl sm:text-4xl font-black text-cyan-300">{current.sets}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Repetições / Tempo</p>
                <p className="mt-1 text-xl sm:text-3xl font-black text-white">{current.reps}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pausa</p>
                <p className="mt-1 text-2xl sm:text-4xl font-black text-amber-300">{current.restSeconds}s</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">Como executar com segurança</p>
              <p className="mt-2 text-base sm:text-xl leading-relaxed text-slate-200">{current.instructions}</p>
              {current.adaptation && (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm sm:text-base font-semibold text-amber-200">
                  ⚠️ Adaptação às suas limitações: {current.adaptation}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition-colors"
              >
                <Video className="h-5 w-5" />
                {rawVideoUrl && /(youtube\.com|youtu\.be)/i.test(rawVideoUrl)
                  ? 'Abrir vídeo no YouTube (Transmitir p/ TV)'
                  : 'Assistir execução no YouTube (Transmitir p/ TV)'}
                <ExternalLink className="h-4 w-4 opacity-80" />
              </a>
            </div>
          </div>

          {/* Painel lateral: Vídeo embutido (se houver) + Cronômetro de Pausa */}
          <div className={cn('space-y-4', rawVideoUrl ? 'lg:col-span-5' : 'lg:col-span-4')}>
            {rawVideoUrl && (
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
                <div className="aspect-video w-full">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={current.name}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={rawVideoUrl} controls playsInline className="h-full w-full bg-black" />
                  )}
                </div>
              </div>
            )}

            {/* Cronômetro de Descanso */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-5 sm:p-6 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                <Clock3 className="h-4 w-4 text-amber-400" /> Cronômetro de descanso
              </p>
              <p
                className={cn(
                  'mt-2 font-mono text-5xl sm:text-6xl font-black tracking-tight',
                  secondsLeft === 0 ? 'text-emerald-400' : 'text-white'
                )}
              >
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (secondsLeft === 0) setSecondsLeft(current.restSeconds || 60);
                    setTimerRunning((r) => !r);
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold transition-colors',
                    timerRunning
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  )}
                >
                  {timerRunning ? (
                    <>
                      <Pause className="h-4 w-4" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> {secondsLeft === 0 ? 'Reiniciar' : 'Iniciar pausa'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(current.restSeconds || 60);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/15"
                  title="Zerar cronômetro"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Lista rápida dos exercícios da sessão */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ordem do treino
              </p>
              <div className="max-h-52 overflow-y-auto space-y-1">
                {exercises.map((ex, i) => (
                  <button
                    key={`${ex.name}-${i}`}
                    type="button"
                    onClick={() => setExIndex(i)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors',
                      i === exIndex
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:bg-white/10'
                    )}
                  >
                    <span className="truncate">
                      {i + 1}. {ex.name}
                    </span>
                    <span className={cn('shrink-0 text-[10px]', i === exIndex ? 'text-slate-900' : 'text-slate-400')}>
                      {ex.sets}x {ex.reps}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior de navegação entre exercícios */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={exIndex === 0}
              onClick={() => setExIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-35 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" /> Exercício Anterior
            </button>
            <button
              type="button"
              disabled={exIndex >= exercises.length - 1}
              onClick={() => setExIndex((i) => Math.min(exercises.length - 1, i + 1))}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-35 hover:bg-cyan-400 transition-colors"
            >
              Próximo Exercício <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleComplete}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-colors',
              isCompleted
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
            )}
          >
            <CheckCircle2 className="h-5 w-5" />
            {isCompleted ? 'Sessão concluída!' : 'Marcar sessão como concluída'}
          </button>
        </footer>
      </main>
    </div>
  );
}
