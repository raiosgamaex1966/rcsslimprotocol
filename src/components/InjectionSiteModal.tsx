import { useEffect, useMemo, useState } from 'react';
import { Check, Info, MapPin, Minus, PackagePlus, Plus, Sparkles, X } from 'lucide-react';
import { Button } from './ui';
import type { InjectionSite, PenStock } from '../lib/types';
import { INJECTION_SITE_LABELS } from '../lib/types';
import { cn } from '../utils/cn';

export interface ConfirmDosePayload {
  site: InjectionSite;
  date: string;
  doseMg: number;
  notes?: string;
  isNewPen?: boolean;
  newPenTotalDoses?: number;
  newPenExpiryDays?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: ConfirmDosePayload) => void;
  lastSite?: InjectionSite;
  suggestedSite?: InjectionSite;
  doseMg: number;
  availableDoses?: number[];
  medBrand?: string;
  currentPenStock?: PenStock | null;
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
  availableDoses,
  medBrand,
  currentPenStock,
}: Props) {
  const [selected, setSelected] = useState<InjectionSite>(
    suggestedSite || 'abdomen_inferior_direito',
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [appliedDose, setAppliedDose] = useState<number>(doseMg || 0.25);
  const [isNewPen, setIsNewPen] = useState(false);
  const [newPenTotalDoses, setNewPenTotalDoses] = useState(currentPenStock?.totalDoses || 4);
  const [newPenExpiryDays, setNewPenExpiryDays] = useState(
    medBrand?.toLowerCase().includes('saxenda') || medBrand?.toLowerCase().includes('mounjaro')
      ? 30
      : 56,
  );

  // Sincroniza a dose sempre que abrir ou mudar o valor recomendado
  useEffect(() => {
    if (isOpen) {
      setAppliedDose(doseMg || 0.25);
      setSelected(suggestedSite || 'abdomen_inferior_direito');
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setIsNewPen(false);
      setNewPenTotalDoses(currentPenStock?.totalDoses || 4);
    }
  }, [isOpen, doseMg, suggestedSite, currentPenStock]);

  // Lista de chips de doses rápidas
  const doseChips = useMemo(() => {
    const list = new Set<number>();
    if (availableDoses && availableDoses.length > 0) {
      availableDoses.forEach((d) => list.add(d));
    } else {
      [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.4].forEach((d) => list.add(d));
    }
    if (doseMg > 0) list.add(doseMg);
    return Array.from(list).sort((a, b) => a - b);
  }, [availableDoses, doseMg]);

  if (!isOpen) return null;

  function handleAdjustDose(delta: number) {
    setAppliedDose((prev) => {
      const step = delta > 0 ? 0.25 : -0.25;
      const next = Math.max(0.05, Math.round((prev + step) * 100) / 100);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm({
      site: selected,
      date,
      doseMg: Number(appliedDose) || doseMg || 0.25,
      notes: notes.trim() ? notes.trim() : undefined,
      isNewPen,
      newPenTotalDoses: isNewPen ? newPenTotalDoses : undefined,
      newPenExpiryDays: isNewPen ? newPenExpiryDays : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Registro de Aplicação · {medBrand ?? 'Medicação'}
          </span>
        </div>

        <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
          Onde você aplicou a dose de {appliedDose} mg?
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          O rodízio previne nódulos e garante a absorção correta do medicamento.
        </p>

        {/* 1. SELEÇÃO E AJUSTE DA DOSE (NOVO!) */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dose Aplicada (mg):
            </label>
            {appliedDose !== doseMg && doseMg > 0 ? (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                Dose alterada (prevista: {doseMg} mg)
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">
                Prevista para o plano atual
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustDose(-1)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all shadow-sm"
              title="Diminuir 0.25 mg"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative flex-1">
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="30"
                value={appliedDose}
                onChange={(e) => setAppliedDose(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-base font-extrabold text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                mg
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleAdjustDose(1)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all shadow-sm"
              title="Aumentar 0.25 mg"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Doses rápidas da medicação */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Rápido:</span>
            {doseChips.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAppliedDose(d)}
                className={cn(
                  'rounded-lg px-2 py-1 text-[11px] font-extrabold transition-all',
                  appliedDose === d
                    ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-500'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {d} mg
              </button>
            ))}
          </div>
        </div>

        {/* Alerta de recomendação de rodízio */}
        <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
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

        {/* 2. SELEÇÃO DA REGIÃO */}
        <div className="mt-4 space-y-2">
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
                    'relative flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-950/40'
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

        {/* 3. DATA E OBSERVAÇÃO */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Data da Aplicação:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Observação (opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: sem desconforto, leve vermelhidão..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* 4. NOVA CANETA / NOVO CICLO (NOVO!) */}
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5 dark:border-teal-900/40 dark:bg-teal-950/30">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isNewPen}
              onChange={(e) => setIsNewPen(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1">
              <span className="text-xs font-extrabold text-teal-950 dark:text-teal-100 flex items-center gap-1.5">
                <PackagePlus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Esta aplicação inicia uma NOVA CANETA / NOVO CICLO?
              </span>
              <p className="mt-0.5 text-[11px] text-teal-700 dark:text-teal-300/80">
                Marque se você abriu uma caneta nova hoje. Isso vai reiniciar o acompanhamento de doses restantes e a validade de uso.
              </p>
            </div>
          </label>

          {isNewPen && (
            <div className="mt-3 pt-3 border-t border-teal-200/80 dark:border-teal-900/60 grid grid-cols-2 gap-2.5 animate-fade-in">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Doses nesta caneta:
                </label>
                <select
                  value={newPenTotalDoses}
                  onChange={(e) => setNewPenTotalDoses(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-teal-300 bg-white p-2 text-xs font-bold text-slate-800 dark:border-teal-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={4}>4 doses (Padrão 1 mês)</option>
                  <option value={6}>6 doses</option>
                  <option value={8}>8 doses</option>
                  <option value={30}>30 doses (Diária - Saxenda)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Validade após aberta:
                </label>
                <select
                  value={newPenExpiryDays}
                  onChange={(e) => setNewPenExpiryDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-teal-300 bg-white p-2 text-xs font-bold text-slate-800 dark:border-teal-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={56}>56 dias (Ozempic / Wegovy)</option>
                  <option value={30}>30 dias (Saxenda / Mounjaro)</option>
                  <option value={42}>42 dias</option>
                </select>
              </div>

              <div className="col-span-2 rounded-xl bg-teal-100/70 p-2 text-[11px] font-semibold text-teal-900 dark:bg-teal-900/40 dark:text-teal-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-300" />
                Esta aplicação será registrada como a <strong>Dose 1 de {newPenTotalDoses}</strong> da sua nova caneta.
              </div>
            </div>
          )}
        </div>

        {/* 5. BOTÕES DE AÇÃO */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} className="!py-2.5 !text-xs">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="!py-2.5 !px-5 !text-xs">
            Confirmar e Registrar ({appliedDose} mg)
          </Button>
        </div>
      </div>
    </div>
  );
}
