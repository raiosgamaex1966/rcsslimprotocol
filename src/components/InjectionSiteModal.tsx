import { useState } from 'react';
import { Check, Info, MapPin, X } from 'lucide-react';
import { Button } from './ui';
import type { InjectionSite } from '../lib/types';
import { INJECTION_SITE_LABELS } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (site: InjectionSite, notes?: string) => void;
  lastSite?: InjectionSite;
  suggestedSite?: InjectionSite;
  doseMg: number;
}

const SITES: { id: InjectionSite; label: string; region: 'abdomen' | 'coxa' | 'braco' }[] = [
  { id: 'abdomen_superior_direito', label: 'Abdômen Sup. Direito', region: 'abdomen' },
  { id: 'abdomen_superior_esquerdo', label: 'Abdômen Sup. Esquerdo', region: 'abdomen' },
  { id: 'abdomen_inferior_direito', label: 'Abdômen Inf. Direito', region: 'abdomen' },
  { id: 'abdomen_inferior_esquerdo', label: 'Abdômen Inf. Esquerdo', region: 'abdomen' },
  { id: 'coxa_direita', label: 'Coxa Direita', region: 'coxa' },
  { id: 'coxa_esquerda', label: 'Coxa Esquerda', region: 'coxa' },
  { id: 'braco_direito', label: 'Braço Direito', region: 'braco' },
  { id: 'braco_esquerdo', label: 'Braço Esquerdo', region: 'braco' },
];

export default function InjectionSiteModal({
  isOpen,
  onClose,
  onConfirm,
  lastSite,
  suggestedSite,
  doseMg,
}: Props) {
  const [selected, setSelected] = useState<InjectionSite>(
    suggestedSite || 'abdomen_inferior_direito',
  );
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Local da Aplicação</span>
        </div>

        <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
          Onde você aplicou a dose de {doseMg} mg?
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          O rodízio previne nódulos e garante a absorção uniforme da medicação.
        </p>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-[11px] leading-relaxed">
            {lastSite ? (
              <>
                Última aplicação feita em:{' '}
                <strong className="underline">{INJECTION_SITE_LABELS[lastSite]}</strong>.
                {suggestedSite && (
                  <span>
                    {' '}
                    Recomendação de hoje:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      {INJECTION_SITE_LABELS[suggestedSite]}
                    </strong>
                    .
                  </span>
                )}
              </>
            ) : (
              'Alterne entre os quadrantes do abdômen, coxas ou parte posterior dos braços a cada injeção.'
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Selecione a região:
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {SITES.map((s) => {
              const isSelected = selected === s.id;
              const isLast = lastSite === s.id;
              const isSuggested = suggestedSite === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    'relative flex flex-col items-start rounded-2xl border p-3 text-left transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-950/40'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80',
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {s.label}
                    </span>
                    {isSelected && (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {isLast && (
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        Última usada
                      </span>
                    )}
                    {isSuggested && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Sugerida ✨
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Observação / Sintoma local (opcional):
          </label>
          <input
            type="text"
            placeholder="Ex: leve vermelhidão, sem dor, fácil aplicação..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} className="!py-2.5 !text-xs">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(selected, notes)}
            className="!py-2.5 !px-5 !text-xs"
          >
            Confirmar e Registrar
          </Button>
        </div>
      </div>
    </div>
  );
}
