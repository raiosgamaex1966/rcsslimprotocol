import { useState } from 'react';
import { CheckCircle2, ClipboardPlus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, SectionTitle, TextInput } from './ui';
import type { PatientData, SymptomLog as SymptomLogEntry } from '../lib/types';
import { COMMON_SIDE_EFFECTS } from '../data/medications';
import { cn } from '../utils/cn';

interface Props {
  data: PatientData;
  update: (updater: (prev: PatientData) => PatientData) => void;
}

const SEVERITY_OPTIONS: { id: SymptomLogEntry['severity']; label: string; color: string }[] = [
  { id: 'leve', label: 'Leve', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'moderada', label: 'Moderada', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { id: 'intensa', label: 'Intensa', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
];

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SymptomLog({ data, update }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState<SymptomLogEntry['severity']>('leve');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const logs = [...(data.symptomLogs ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  function toggleSymptom(label: string) {
    setSelected((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));
  }

  function handleSave() {
    if (selected.length === 0 && !note.trim()) return;
    const entry: SymptomLogEntry = {
      id: uid(),
      date: new Date().toISOString(),
      symptoms: selected,
      severity,
      note: note.trim(),
    };
    update((prev) => ({ ...prev, symptomLogs: [entry, ...(prev.symptomLogs ?? [])] }));
    setSelected([]);
    setNote('');
    setSeverity('leve');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  function removeLog(id: string) {
    update((prev) => ({ ...prev, symptomLogs: (prev.symptomLogs ?? []).filter((l) => l.id !== id) }));
  }

  return (
    <Card className="p-6">
      <SectionTitle
        icon={<ClipboardPlus className="h-4 w-4 text-brand-600" />}
        title="Como você está se sentindo?"
        subtitle="Este diário é visível para o médico vinculado à sua conta — ajuda a identificar efeitos colaterais cedo"
      />

      <div className="flex flex-wrap gap-1.5">
        {COMMON_SIDE_EFFECTS.map((e) => (
          <button
            key={e.label}
            type="button"
            onClick={() => toggleSymptom(e.label)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all',
              selected.includes(e.label)
                ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/25'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Intensidade:</span>
        {SEVERITY_OPTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeverity(s.id)}
            className={cn('rounded-full px-3 py-1 text-[11px] font-bold transition-all', severity === s.id ? s.color : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}
          >
            {s.label}
          </button>
        ))}
      </div>

      <TextInput
        placeholder="Observações (opcional): quando começou, o que ajudou, etc."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-3"
      />

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={handleSave} disabled={selected.length === 0 && !note.trim()} className="!px-4 !py-2 text-xs">
          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ClipboardPlus className="h-3.5 w-3.5" />}
          {saved ? 'Registrado!' : 'Salvar registro de hoje'}
        </Button>
        <p className="text-[10px] text-slate-400">Se tiver sintomas intensos ou persistentes, procure seu médico imediatamente.</p>
      </div>

      {logs.length > 0 && (
        <div className="mt-5 max-h-52 space-y-2 overflow-y-auto border-t border-slate-100 pt-4 dark:border-slate-800">
          {logs.slice(0, 10).map((l) => (
            <div key={l.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className={SEVERITY_OPTIONS.find((s) => s.id === l.severity)?.color ?? ''}>{l.severity}</Badge>
                  {l.symptoms.map((s) => (
                    <span key={s} className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>
                {l.note && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{l.note}</p>}
                <p className="mt-1 text-[10px] font-semibold text-slate-400">{new Date(l.date).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => removeLog(l.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
