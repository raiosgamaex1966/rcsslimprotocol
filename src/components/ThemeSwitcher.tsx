import { MonitorSmartphone, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { cn } from '../utils/cn';

const OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'claro', label: 'Claro', icon: Sun },
  { id: 'sistema', label: 'Sistema', icon: MonitorSmartphone },
  { id: 'escuro', label: 'Escuro', icon: Moon },
];

export default function ThemeSwitcher({ segment = false }: { segment?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (segment) {
    return (
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setTheme(o.id)}
            aria-pressed={theme === o.id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition-all',
              theme === o.id
                ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-950 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        ))}
      </div>
    );
  }

  const current = OPTIONS.find((o) => o.id === theme)!;
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => setTheme(next.id)}
      title={`Esquema atual: ${current.label} — toque para alternar`}
      className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      aria-label={`Esquema de cores: ${current.label}. Alternar para ${next.label}`}
    >
      <current.icon className="h-4 w-4" />
    </button>
  );
}
