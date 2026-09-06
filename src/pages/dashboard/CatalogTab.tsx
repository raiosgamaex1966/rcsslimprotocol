import { useState } from 'react';
import {
  AlertOctagon,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  ChevronDown,
  CreditCard,
  FlaskConical,
  Info,
  Search,
  Star,
  Stethoscope,
} from 'lucide-react';
import { Badge, Button, Card, DisclaimerBox, SectionTitle, TextInput } from '../../components/ui';
import {
  ACTIVE_INGREDIENT_LABEL,
  COMMON_SIDE_EFFECTS,
  MEDICATIONS,
  RED_FLAGS,
  type ActiveIngredient,
  type Medication,
} from '../../data/medications';
import { fmtMg } from '../../lib/schedule';
import { cn } from '../../utils/cn';

const GROUPS: ActiveIngredient[] = ['Semaglutida', 'Liraglutida', 'Tirzepatida'];

interface Props {
  savedMedicationIds?: string[];
  onToggleSaveMed?: (medId: string) => void;
}

export function MedicationsTabBody({ savedMedicationIds = [], onToggleSaveMed }: Props) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'saved'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = MEDICATIONS.filter((m) => {
    if (filterMode === 'saved' && !savedMedicationIds.includes(m.id)) {
      return false;
    }
    return (
      !q ||
      m.brand.toLowerCase().includes(q) ||
      m.activeIngredient.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  });

  const totalSaved = savedMedicationIds.length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Catálogo de canetas e medicamentos
            </h2>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Marcas de referência, similares e genéricos aprovados pela Anvisa para emagrecimento e diabetes.
            </p>
          </div>

          {/* Abas de Filtro: Todos vs Salvos para Consulta */}
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400',
              )}
            >
              Todos ({MEDICATIONS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('saved')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                filterMode === 'saved'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400',
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>Salvos para consulta ({totalSaved})</span>
            </button>
          </div>
        </div>

        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            placeholder="Buscar marca, princípio ativo, laboratório…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filterMode === 'saved' && totalSaved === 0 && (
        <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          <Bookmark className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="font-extrabold text-slate-700 dark:text-slate-200">
            Nenhum medicamento salvo para consulta ainda
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Clique no botão <b>“Salvar para consulta”</b> em qualquer medicamento do catálogo para tê-lo em sua lista de referência médica rápida.
          </p>
          <Button
            variant="secondary"
            className="mt-4 !px-4 !py-2 text-xs"
            onClick={() => setFilterMode('all')}
          >
            Ver todos os medicamentos
          </Button>
        </Card>
      )}

      {GROUPS.map((ing) => {
        const meds = filtered.filter((m) => m.activeIngredient === ing);
        if (meds.length === 0) return null;
        return (
          <section key={ing}>
            <SectionTitle
              icon={<FlaskConical className="h-4 w-4 text-brand-600" />}
              title={ACTIVE_INGREDIENT_LABEL[ing]}
              subtitle={`${meds.length} opç${meds.length === 1 ? 'ão' : 'ões'} disponíve${meds.length === 1 ? 'l' : 'is'} no Brasil`}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {meds.map((m) => (
                <MedCard
                  key={m.id}
                  med={m}
                  open={open === m.id}
                  onToggle={() => setOpen(open === m.id ? null : m.id)}
                  isSaved={savedMedicationIds.includes(m.id)}
                  onToggleSave={() => onToggleSaveMed?.(m.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && filterMode === 'all' && (
        <Card className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">
          Nenhum medicamento encontrado para “{search}”.
        </Card>
      )}

      {filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">Nenhum medicamento encontrado para “{search}”.</Card>
      )}

      {/* Efeitos colaterais */}
      <section>
        <SectionTitle icon={<Info className="h-4 w-4 text-brand-600" />} title="Efeitos colaterais comuns da classe GLP-1 / GIP" subtitle="informações gerais — converse sempre com seu médico" />
        <Card className="p-6">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {COMMON_SIDE_EFFECTS.map((e, i) => (
              <div key={e.label} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/70">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">{e.label}</p>
                  <p className="text-[11px] font-semibold text-slate-400">{e.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950">
            <p className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
              <AlertOctagon className="h-4 w-4" /> Procure ajuda médica se apresentar:
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {RED_FLAGS.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-rose-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      <DisclaimerBox />
    </div>
  );
}

function MedCard({
  med,
  open,
  onToggle,
  isSaved,
  onToggleSave,
}: {
  med: Medication;
  open: boolean;
  onToggle: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-white shadow-sm transition-all dark:bg-slate-900', open ? 'border-brand-300 shadow-lg shadow-brand-100 dark:border-brand-500/40 dark:shadow-brand-950' : 'border-slate-200/80 shadow-slate-200/50 hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:hover:border-brand-500/40')}>
      <div className={cn('flex items-center justify-between gap-2 bg-gradient-to-r px-5 py-3 text-white', med.color)}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-[9px] font-extrabold backdrop-blur">
            {med.brand.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-extrabold leading-tight">{med.brand}</p>
            <p className="text-[10px] font-semibold text-white/80">{med.presentation}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSave}
            className={cn(
              'grid h-7 w-7 place-items-center rounded-lg transition backdrop-blur',
              isSaved
                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white/50'
                : 'bg-white/20 text-white hover:bg-white/30',
            )}
            title={isSaved ? 'Remover dos medicamentos salvos' : 'Salvar medicamento para consultas posteriores'}
          >
            <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
          </button>
          <Badge className="bg-white/20 text-white backdrop-blur">{med.category}</Badge>
        </div>
      </div>

      <div className="space-y-2.5 p-5 text-[12px]">
        <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
          <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
          {med.indication}
        </p>
        <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
          {med.manufacturer}
        </p>
        <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
          Frequência: <b className="text-slate-800 dark:text-slate-100">{med.frequency === 'semanal' ? 'semanal' : 'diária'}</b>
        </p>
        <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
          <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
          Doses disponíveis:{' '}
          <span className="font-bold text-slate-800 dark:text-slate-100">{med.doses.map((d) => fmtMg(d)).join(' · ')}</span>
        </p>
        <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
          <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
          <span>
            Preço médio: <b className="text-slate-800 dark:text-slate-100">{med.priceRange}</b>
          </span>
        </p>

        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSave}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-all',
              isSaved
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500/50',
            )}
          >
            <Bookmark className={cn('h-3.5 w-3.5 text-amber-500', isSaved && 'fill-current')} />
            <span>{isSaved ? 'Salvo para consulta' : 'Salvar para consulta'}</span>
          </button>

          <button onClick={onToggle} className="flex items-center justify-center rounded-lg bg-slate-50 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700" title="Ver detalhes e descrição completa">
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>

        {open && (
          <p className="animate-fade-in rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-slate-300">
            {med.description}
          </p>
        )}
      </div>
    </div>
  );
}


