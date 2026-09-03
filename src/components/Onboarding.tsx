import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, FlaskConical, ListChecks, Plus, Save, Search, Sparkles, Syringe, Trash2, TrendingUp } from 'lucide-react';
import { Button, Field, SelectInput, TextInput } from './ui';
import { ACTIVE_INGREDIENT_LABEL, getTitration, MEDICATIONS, type Medication } from '../data/medications';
import type { DosePhase, Frequency, Treatment } from '../lib/types';
import { fmtMg, parseLocalDate, WEEKDAY_NAMES } from '../lib/schedule';
import { cn } from '../utils/cn';

interface Props {
  initial?: Treatment | null;
  onSubmit: (t: Treatment) => void;
  onCancel?: () => void;
}

const POPULAR = ['ozempic', 'wegovy', 'saxenda', 'mounjaro', 'victoza', 'ozivy', 'poviztra'];

type DosageMode = 'fixed' | 'schedule';

interface PhaseRow {
  key: string;
  startWeek: string;
  endWeek: string; // vazio = "em diante" (última fase)
  doseMg: string;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowsFromPhases(phases?: DosePhase[] | null): PhaseRow[] {
  if (!phases || phases.length === 0) return [];
  return phases.map((p) => ({
    key: uid(),
    startWeek: String(p.startWeek),
    endWeek: p.endWeek == null ? '' : String(p.endWeek),
    doseMg: String(p.doseMg).replace('.', ','),
  }));
}

function rowsFromTitration(med?: Medication): PhaseRow[] {
  if (!med) return [];
  return rowsFromPhases(getTitration(med));
}

export default function Onboarding({ initial, onSubmit, onCancel }: Props) {
  const [medId, setMedId] = useState(initial?.medId ?? '');
  const [dosageMode, setDosageMode] = useState<DosageMode>(initial?.phases?.length ? 'schedule' : 'fixed');
  const [dose, setDose] = useState<number | ''>(initial?.doseMg ?? '');
  const [customDose, setCustomDose] = useState('');
  const [rows, setRows] = useState<PhaseRow[]>(() => rowsFromPhases(initial?.phases));
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'semanal');
  const [weekday, setWeekday] = useState(initial?.weekday ?? 1);
  const [time, setTime] = useState(initial?.time ?? '08:00');
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const med: Medication | undefined = useMemo(() => MEDICATIONS.find((m) => m.id === medId), [medId]);

  useEffect(() => {
    if (med) {
      setFrequency(med.frequency);
      if (dosageMode === 'fixed') setDose(med.defaultDose);
    }
  }, [medId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MEDICATIONS;
    return MEDICATIONS.filter(
      (m) => m.brand.toLowerCase().includes(q) || m.activeIngredient.toLowerCase().includes(q) || m.manufacturer.toLowerCase().includes(q),
    );
  }, [search]);

  function selectMed(id: string) {
    setMedId(id);
    setSearch('');
    const m = MEDICATIONS.find((x) => x.id === id);
    if (dosageMode === 'schedule') setRows(rowsFromTitration(m));
  }

  function updateRow(key: string, patch: Partial<PhaseRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      const nextStart = last && last.endWeek.trim() !== '' ? String(Number(last.endWeek) + 1) : last ? String(Number(last.startWeek) + 1) : '1';
      const nextDose = last?.doseMg ?? med?.defaultDose.toString().replace('.', ',') ?? '';
      return [...prev, { key: uid(), startWeek: nextStart, endWeek: '', doseMg: nextDose }];
    });
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  /* ---------- validação do esquema ---------- */

  function validateSchedule(): DosePhase[] | string {
    if (rows.length === 0) return 'Adicione ao menos uma fase ao esquema.';
    const phases: DosePhase[] = [];
    const maxDose = med ? Math.max(...med.doses) : Infinity;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const start = Number(r.startWeek);
      const doseMg = parseFloat(r.doseMg.replace(',', '.'));
      if (!Number.isInteger(start) || start < 1) return `Fase ${i + 1}: informe uma semana de início válida (número inteiro ≥ 1).`;
      if (!Number.isFinite(doseMg) || doseMg <= 0) return `Fase ${i + 1}: informe a dose em mg (ex.: 0,25).`;
      if (doseMg > maxDose) return `Fase ${i + 1}: dose acima do máximo de ${med?.brand} (${fmtMg(maxDose)}). Confirme com seu médico.`;
      if (i === 0 && start !== 1) return 'A primeira fase deve começar na semana 1 (data da primeira aplicação).';
      const prev = phases[i - 1];
      if (prev && prev.endWeek == null) return `Fase ${i}: a fase anterior (semana ${prev.startWeek}+) não tem fim definido — ela deve ser a última.`;
      if (prev && start <= prev.endWeek!) return `Fase ${i + 1}: semanas sobrepostas com a fase anterior (que termina na semana ${prev.endWeek}).`;
      const endRaw = r.endWeek.trim();
      if (endRaw === '') {
        if (i !== rows.length - 1) return `Fase ${i + 1}: informe a semana final (deixe em branco somente na última fase).`;
        phases.push({ startWeek: start, endWeek: null, doseMg });
      } else {
        const end = Number(endRaw);
        if (!Number.isInteger(end) || end < start) return `Fase ${i + 1}: semana final inválida (deve ser ≥ ${start}).`;
        phases.push({ startWeek: start, endWeek: end, doseMg });
      }
    }
    return phases;
  }

  function handleSubmit() {
    setError(null);
    if (!med) return setError('Escolha a medicação que você está usando.');
    if (!time) return setError('Informe o horário da aplicação.');
    if (!startDate) return setError('Informe a data de início.');
    const start = parseLocalDate(startDate);
    if (isNaN(start.getTime())) return setError('Data de início inválida.');

    if (dosageMode === 'schedule') {
      const phases = validateSchedule();
      if (typeof phases === 'string') return setError(phases);
      onSubmit({ medId: med.id, doseMg: phases[0].doseMg, frequency, weekday, time, startDate, phases });
      return;
    }

    let doseMg = typeof dose === 'number' ? dose : parseFloat(customDose.replace(',', '.'));
    if (customDose.trim()) doseMg = parseFloat(customDose.replace(',', '.'));
    if (!Number.isFinite(doseMg) || doseMg <= 0) return setError('Informe a dose em miligramas.');
    const maxDose = Math.max(...med.doses);
    if (doseMg > maxDose) return setError(`A dose máxima de ${med.brand} é ${fmtMg(maxDose)}. Confirme com seu médico.`);
    onSubmit({ medId: med.id, doseMg, frequency, weekday, time, startDate });
  }

  /* ---------- prévia do esquema ---------- */

  const preview = useMemo(() => {
    return rows
      .map((r, i) => {
        const s = Number(r.startWeek);
        const d = parseFloat(r.doseMg.replace(',', '.'));
        if (!Number.isInteger(s) || s < 1 || !Number.isFinite(d)) return null;
        const e = r.endWeek.trim() === '' ? (i === rows.length - 1 ? '+' : '?') : Number(r.endWeek);
        return { key: r.key, label: `Sem ${s}${typeof e === 'number' ? `–${e}` : e}: ${fmtMg(d)}` };
      })
      .filter(Boolean) as { key: string; label: string }[];
  }, [rows]);

  const doseOptions: number[] = med ? med.doses : [];

  return (
    <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-teal-50/50 p-6 shadow-lg shadow-brand-100 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900 dark:shadow-black/30 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-md shadow-brand-500/30">
              <Syringe className="h-4.5 w-4.5" />
            </span>
            {initial ? 'Editar meu tratamento' : 'Configure seu tratamento'}
          </h2>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            Escolha a caneta e informe como o médico prescreveu: dose única ou <b>esquema progressivo</b> (ex.: 1ª–4ª semanas 0,25 mg → 5ª–8ª 0,5 mg → 9ª+ 1,0 mg).
          </p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
            Cancelar
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</div>
      )}

      {/* Passo 1: medicação */}
      <div className="mt-5">
        <p className="text-[13px] font-extrabold text-slate-700 dark:text-slate-200">
          1. Qual medicamento você está usando? <span className="text-rose-500">*</span>
        </p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput placeholder="Buscar por marca, princípio ativo ou laboratório…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {POPULAR.map((id) => {
            const m = MEDICATIONS.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectMed(id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                  medId === id ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500/50',
                )}
              >
                {m.brand}
              </button>
            );
          })}
        </div>

        <div className="mt-2 grid max-h-44 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => selectMed(m.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
                medId === m.id
                  ? 'border-brand-500 bg-white shadow-md shadow-brand-500/10 ring-2 ring-brand-500/30 dark:bg-slate-800 dark:ring-brand-400/30'
                  : 'border-slate-200 bg-white/70 hover:border-brand-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-brand-500/50',
              )}
            >
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[10px] font-extrabold text-white', m.color)}>
                {m.brand.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-slate-800 dark:text-slate-100">{m.brand}</span>
                <span className="block truncate text-[10px] font-semibold text-slate-400">
                  {ACTIVE_INGREDIENT_LABEL[m.activeIngredient]} · {m.category}
                </span>
              </span>
              {medId === m.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Passo 2: dose */}
      {med && (
        <div className="mt-6 animate-fade-in">
          <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-700 dark:text-slate-200">
            <FlaskConical className="h-4 w-4 text-brand-600" /> 2. Como o médico prescreveu a dose?
          </p>

          {/* Alternador de modo */}
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDosageMode('fixed');
                setError(null);
              }}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                dosageMode === 'fixed' ? 'border-brand-500 bg-white shadow-md shadow-brand-500/10 ring-2 ring-brand-500/25 dark:bg-slate-800 dark:ring-brand-400/25' : 'border-slate-200 bg-white/70 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-brand-500/50',
              )}
            >
              <p className="flex items-center gap-2 text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', dosageMode === 'fixed' ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
                  {dosageMode === 'fixed' && <Check className="h-3.5 w-3.5" />}
                </span>
                Dose única
              </p>
              <p className="mt-1.5 pl-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Mesma miligrama em todas as aplicações (ex.: 0,5 mg sempre).</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setDosageMode('schedule');
                setRows((prev) => {
                  if (prev.length > 0) return prev;
                  // Preserva a dose já escolhida em "Dose única" como 1ª fase,
                  // em vez de sobrepor com a titulação padrão da bula.
                  const currentDose = typeof dose === 'number' ? dose : parseFloat(customDose.replace(',', '.'));
                  if (Number.isFinite(currentDose) && currentDose > 0) {
                    return [{ key: uid(), startWeek: '1', endWeek: '', doseMg: String(currentDose).replace('.', ',') }];
                  }
                  return rowsFromTitration(med);
                });
                setError(null);
              }}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                dosageMode === 'schedule' ? 'border-brand-500 bg-white shadow-md shadow-brand-500/10 ring-2 ring-brand-500/25 dark:bg-slate-800 dark:ring-brand-400/25' : 'border-slate-200 bg-white/70 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-brand-500/50',
              )}
            >
              <p className="flex items-center gap-2 text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', dosageMode === 'schedule' ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
                  {dosageMode === 'schedule' && <Check className="h-3.5 w-3.5" />}
                </span>
                Esquema do médico <TrendingUp className="h-3.5 w-3.5 text-brand-600" />
              </p>
              <p className="mt-1.5 pl-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">A dose aumenta em fases por semana (ex.: 0,25 → 0,5 → 1,0 mg).</p>
            </button>
          </div>

          <div className="mt-4">
            {dosageMode === 'fixed' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dose por aplicação (mg)" required>
                  <SelectInput value={typeof dose === 'number' ? dose : 'custom'} onChange={(e) => setDose(e.target.value === 'custom' ? '' : Number(e.target.value))}>
                    {doseOptions.map((d) => (
                      <option key={d} value={d}>
                        {fmtMg(d)}
                      </option>
                    ))}
                    <option value="custom">Outro valor…</option>
                  </SelectInput>
                </Field>
                {dose === '' && (
                  <Field label="Dose personalizada (mg)" required>
                    <TextInput type="number" step="0.01" min="0.01" placeholder="Ex.: 0,75" value={customDose} onChange={(e) => setCustomDose(e.target.value)} />
                  </Field>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-brand-100 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  <ListChecks className="h-4 w-4 text-brand-600" /> Fases do esquema
                  <span className="ml-auto hidden text-[10px] font-semibold text-slate-400 sm:block">semana 1 = primeira aplicação</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Ex.: 1ª–4ª semanas → 0,25 mg · 5ª–8ª semanas → 0,5 mg · 9ª semana em diante → 1,0 mg. Deixe a <b>semana final em branco</b> na última fase.
                </p>

                <div className="mt-3 hidden grid-cols-[92px_92px_1fr_36px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:grid">
                  <span>Semana início</span>
                  <span>Semana final</span>
                  <span>Dose (mg)</span>
                  <span />
                </div>

                <div className="mt-2 space-y-2">
                  {rows.map((r, i) => (
                    <div key={r.key} className="grid grid-cols-[1fr_1fr_1.2fr_36px] items-center gap-2 sm:grid-cols-[92px_92px_1fr_36px]">
                      <TextInput inputMode="numeric" placeholder="1" value={r.startWeek} onChange={(e) => updateRow(r.key, { startWeek: e.target.value })} className="!py-2 text-center text-xs font-bold" />
                      <TextInput
                        inputMode="numeric"
                        placeholder={i === rows.length - 1 ? 'em diante' : `ex.: ${i + 1 === 1 ? 4 : i + 4}`}
                        value={r.endWeek}
                        onChange={(e) => updateRow(r.key, { endWeek: e.target.value })}
                        className="!py-2 text-center text-xs font-bold"
                        title="Deixe em branco para 'em diante' (última fase)"
                      />
                      <TextInput inputMode="decimal" placeholder="0,25" value={r.doseMg} onChange={(e) => updateRow(r.key, { doseMg: e.target.value })} className="!py-2 text-center text-xs font-bold" />
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        disabled={rows.length === 1}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Remover fase"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={addRow}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar fase
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-2 text-xs"
                    onClick={() => setRows(rowsFromTitration(med))}
                    title="Isso substitui todas as fases atuais pela titulação padrão de bula"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Carregar titulação da bula ({med.brand}) — substitui as fases atuais
                  </Button>
                </div>

                {preview.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50/70 p-3 dark:border-brand-500/25 dark:bg-brand-500/10">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-brand-700 dark:text-brand-300">Resumo do esquema:</span>
                    {preview.map((p) => (
                      <span key={p.key} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-brand-800 shadow-sm dark:bg-slate-900 dark:text-brand-300">
                        {p.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Frequência">
              <SelectInput value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                <option value="semanal">Semanal (1x por semana)</option>
                <option value="diaria">Diária (1x por dia)</option>
              </SelectInput>
            </Field>
            {frequency === 'semanal' && (
              <Field label="Dia da semana">
                <SelectInput value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                  {WEEKDAY_NAMES.map((d, i) => (
                    <option key={d} value={i}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
            <Field label="Horário da aplicação">
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-10" />
              </div>
            </Field>
            <Field label="Data da 1ª dose" hint="início do esquema">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput type="date" value={startDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDate(e.target.value)} className="pl-10" />
              </div>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4" />
              {initial ? 'Salvar alterações' : 'Começar a acompanhar'}
            </Button>
            <p className="text-[11px] text-slate-400">O app calcula a dose certa de cada semana automaticamente. Confirme sempre com seu médico.</p>
          </div>
        </div>
      )}
    </div>
  );
}
