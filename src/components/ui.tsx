import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import { AlertTriangle, ShieldCheck, Syringe } from 'lucide-react';
import { DISCLAIMER } from '../data/medications';

/* ---------------- Brand ---------------- */

export function Logo({ dark = false, size = 'md', hideSubtitleOnMobile = false }: { dark?: boolean; size?: 'md' | 'lg'; hideSubtitleOnMobile?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2 select-none sm:gap-2.5">
      <div className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 shadow-md shadow-brand-500/30 text-white">
        <Syringe className={size === 'lg' ? 'h-6 w-6' : 'h-4 w-4 sm:h-5 sm:w-5'} />
      </div>
      <div className="leading-tight">
        <span className={cn('block font-extrabold tracking-tight', size === 'lg' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base', dark ? 'text-white' : 'text-slate-900')}>
          Minha<span className="text-brand-600">Caneta</span>
        </span>
        <span className={cn('text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em]', hideSubtitleOnMobile ? 'hidden sm:block' : 'block', dark ? 'text-brand-200/80' : 'text-slate-400')}>
          GLP-1 · acompanhamento
        </span>
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20', className)}>
      {children}
    </div>
  );
}

/* ---------------- Botões ---------------- */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'white';
  full?: boolean;
}

export function Button({ variant = 'primary', full, className, children, ...rest }: BtnProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg shadow-brand-600/25 hover:from-brand-700 hover:to-teal-700 hover:shadow-brand-600/35 active:scale-[0.98]',
        variant === 'secondary' && 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500/50 dark:hover:text-brand-300 dark:hover:bg-slate-700/60',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
        variant === 'danger' && 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/20',
        variant === 'white' && 'bg-white text-brand-700 shadow-lg shadow-black/10 hover:bg-brand-50',
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Inputs ---------------- */

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, hint, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-bold text-slate-700 dark:text-slate-200">
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {hint && <span className="text-[11px] font-medium text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cn(inputBase, className)} {...rest} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select className={cn(inputBase, 'cursor-pointer appearance-none', className)} {...rest}>
      {children}
    </select>
  );
}

/* ---------------- Badges / avisos ---------------- */

export function Badge({ className, title, children }: { className?: string; title?: string; children: ReactNode }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', className)}>
      {children}
    </span>
  );
}

export function DisclaimerBox({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100', className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
        <p className={cn('text-amber-800 dark:text-amber-200', compact ? 'text-[11px] leading-relaxed' : 'text-xs leading-relaxed')}>{DISCLAIMER}</p>
      </div>
    </div>
  );
}

export function ModeBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      Conectado e seguro
    </div>
  );
}

/* ---------------- Header de seção ---------------- */

export function SectionTitle({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Avatar ---------------- */

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <div
      className={cn(
        'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-sm font-extrabold text-white shadow-md shadow-brand-500/30',
        className,
      )}
    >
      {initials || 'P'}
    </div>
  );
}
