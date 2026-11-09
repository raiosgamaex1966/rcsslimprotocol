import { useState } from 'react';
import { Calendar, Check, Clock, History, MapPin, Minus, Plus, X } from 'lucide-react';
import { Button } from './ui';
import { MEDICATIONS } from '../data/medications';
import type { InjectionSite } from '../lib/types';
import { cn } from '../utils/cn';

export interface PastDosePayload {
  date: string; // ISO ou yyyy-mm-dd
  medId: string;
  doseMg: number;
  site?: InjectionSite;
  notes?: string;
  cycleNumber?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMedId?: string;
  onAddPastDose: (payload: PastDosePayload) => void;
}

const SITES: { id: InjectionSite; label: string }[] = [
  { id: 'abdomen_superior_direito', label: 'Abdômen Sup. Direito' },
  { id: 'abdomen_superior_esquerdo', label: 'Abdômen Sup. Esquerdo' },
  { id: 'abdomen_inferior_direito', label: 'Abdômen Inf. Direito' },
  { id: 'abdomen_inferior_esquerdo', label: 'Abdômen Inf. Esquerdo' },
  { id: 'coxa_direita', label: 'Coxa Direita' },
  { id: 'coxa_esquerda', label: 'Coxa Esquerda' },
  { id: 'braco_direito', label: 'Braço Direito' },
  { id: 'braco_esquerdo', label: 'Braço Esquerdo' },
];

export default function AddPastDoseModal({
  isOpen,
  onClose,
  defaultMedId = 'ozempic',
  onAddPastDose,
}: Props) {
  const [selectedMedId, setSelectedMedId] = useState(defaultMedId);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('08:00');
  const [doseMg, setDoseMg] = useState(0.25);
  const [site, setSite] = useState<InjectionSite | undefined>('abdomen_inferior_direito');
  const [cycleNumber, setCycleNumber] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const selectedMed = MEDICATIONS.find((m) => m.id === selectedMedId) || MEDICATIONS[0];

  if (!isOpen) return null;

  function handleSubmit() {
    const dateTime = new Date(`${date}T${time || '12:00'}:00`).toISOString();
    onAddPastDose({
      date: dateTime,
      medId: selectedMedId,
      doseMg: Number(doseMg) || 0.25,
      site,
      notes: notes.trim() ? notes.trim() : undefined,
      cycleNumber: Number(cycleNumber) || 1,
    });
    onClose();
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
          <History className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Histórico de Aplicações</span>
        </div>

        <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
          Registrar Aplicação Passada / Retroativa
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Adicione aplicações anteriores desde o início do seu tratamento para manter seu gráfico e histórico 100% completos.
        </p>

        {/* Data e Horário */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-brand-600" /> Data da Aplicação:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-brand-600" /> Horário aproximado:
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Medicação e Ciclo */}
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Medicamento Usado:
            </label>
            <select
              value={selectedMedId}
              onChange={(e) => {
                setSelectedMedId(e.target.value);
                const m = MEDICATIONS.find((x) => x.id === e.target.value);
                if (m && m.doses.length > 0) setDoseMg(m.doses[0]);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {MEDICATIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} ({m.activeIngredient})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Caneta / Ciclo:
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={cycleNumber}
              onChange={(e) => setCycleNumber(Number(e.target.value))}
              placeholder="Ciclo #"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Dose Aplicada */}
        <div className="mt-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dose Aplicada (mg):
            </label>
            <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
              {doseMg} mg
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDoseMg((d) => Math.max(0.05, Math.round((d - 0.25) * 100) / 100))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative flex-1">
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={doseMg}
                onChange={(e) => setDoseMg(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-center text-sm font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs font-bold text-slate-400">
                mg
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDoseMg((d) => Math.round((d + 0.25) * 100) / 100)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {selectedMed && selectedMed.doses.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {selectedMed.doses.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDoseMg(d)}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[11px] font-extrabold transition-all',
                    doseMg === d
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {d} mg
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Local da Aplicação */}
        <div className="mt-3.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-brand-600" /> Local da Aplicação:
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {SITES.map((s) => {
              const isSelected = site === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSite(s.id)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-2 text-left text-[11px] transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-50 font-bold text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 ring-1 ring-brand-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  <span className="truncate">{s.label}</span>
                  {isSelected && <Check className="h-3 w-3 text-brand-600 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Observações */}
        <div className="mt-3.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Observação (opcional):
          </label>
          <input
            type="text"
            placeholder="Ex: caneta anterior, dose inicial..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} className="!py-2.5 !text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="!py-2.5 !px-5 !text-xs">
            Salvar no Histórico
          </Button>
        </div>
      </div>
    </div>
  );
}
