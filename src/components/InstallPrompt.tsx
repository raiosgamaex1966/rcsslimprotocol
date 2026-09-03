import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from './ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [visible, setVisible] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (installed) return;
    const dismissed = localStorage.getItem('minhacaneta_pwa_dismissed');
    if (!dismissed) {
      const t = window.setTimeout(() => setVisible(true), 3000);
      const onPrompt = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setDeferred(e);
        setVisible(true);
        window.clearTimeout(t);
      };
      const onInstalled = () => {
        setInstalled(true);
        setVisible(false);
      };
      window.addEventListener('beforeinstallprompt', onPrompt);
      window.addEventListener('appinstalled', onInstalled);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onPrompt);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
  }, [installed]);

  if (!visible || installed) return null;

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
        setDeferred(null);
        localStorage.setItem('minhacaneta_pwa_dismissed', '1');
      }
    } else if (ios) {
      setVisible(false);
      localStorage.setItem('minhacaneta_pwa_dismissed', '1');
    }
  }

  function dismiss() {
    setVisible(false);
    localStorage.setItem('minhacaneta_pwa_dismissed', '1');
  }

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 animate-fade-up lg:bottom-6 lg:left-auto lg:right-6 lg:w-96">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-5 text-white shadow-2xl shadow-black/40 backdrop-blur">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/25 blur-[50px]" />
        <button onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-4">
          <img src="icons/icon-512.png" alt="MinhaCaneta" className="h-12 w-12 shrink-0 rounded-xl shadow-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Instalar MinhaCaneta</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {ios
                ? 'Toque no botão Compartilhar e em "Adicionar à Tela de Início" para abrir como app.'
                : 'Adicione à tela inicial para abrir como aplicativo, até offline.'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {ios ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-300">
                  <Share className="h-3.5 w-3.5" /> Compartilhar → Tela de Início
                </span>
              ) : (
                <Button onClick={handleInstall} className="!px-4 !py-2 text-xs">
                  <Download className="h-3.5 w-3.5" /> Instalar aplicativo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
