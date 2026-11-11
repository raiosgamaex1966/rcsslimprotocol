import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { EXERCISE_CATALOG, normalizeExerciseText, type ExerciseCatalogItem } from '../lib/exercise';
import { cn } from '../utils/cn';

interface Props {
  selectedNames: string[];
  onChange: (nextNames: string[]) => void;
  onSelectItemMeta?: (item: ExerciseCatalogItem) => void;
  extraText: string;
  onExtraTextChange: (val: string) => void;
}

const CATEGORY_LABELS: Record<ExerciseCatalogItem['category'], string> = {
  tai_chi: 'Tai Chi',
  forca: 'Força',
  mobilidade: 'Mobilidade',
  equilibrio: 'Equilíbrio',
  caminhada: 'Caminhada',
  alongamento: 'Alongamento',
};

/**
 * Seletor visual de exercícios do sistema para ligar diretamente um vídeo enviado (do computador ou link)
 * aos exercícios exibidos no treino do paciente.
 */
export default function ExerciseLinker({
  selectedNames,
  onChange,
  onSelectItemMeta,
  extraText,
  onExtraTextChange,
}: Props) {
  const [filter, setFilter] = useState('');
  const normFilter = normalizeExerciseText(filter);

  const selectedSet = new Set(selectedNames.map((n) => normalizeExerciseText(n)));
  const filteredCatalog = EXERCISE_CATALOG.filter(
    (item) =>
      !normFilter ||
      normalizeExerciseText(item.name).includes(normFilter) ||
      normalizeExerciseText(CATEGORY_LABELS[item.category]).includes(normFilter),
  );

  function toggleCatalogItem(item: ExerciseCatalogItem) {
    const key = normalizeExerciseText(item.name);
    const exists = selectedSet.has(key);
    const next = exists
      ? selectedNames.filter((n) => normalizeExerciseText(n) !== key)
      : [...selectedNames, item.name];
    onChange(next);
    if (!exists && onSelectItemMeta) {
      onSelectItemMeta(item);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/30 p-3.5 dark:border-cyan-800/50 dark:bg-cyan-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
            Vincular aos exercícios do app ({selectedNames.length} selecionado{selectedNames.length === 1 ? '' : 's'})
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Clique nos exercícios abaixo para ligar este vídeo diretamente a eles na ficha do paciente.
          </p>
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar exercício..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-[11px] text-slate-700 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="mt-2.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {filteredCatalog.map((item) => {
          const active = selectedSet.has(normalizeExerciseText(item.name));
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => toggleCatalogItem(item)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all',
                active
                  ? 'border-cyan-600 bg-cyan-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {active && <Check className="h-3 w-3 shrink-0" />}
              <span>{item.name}</span>
              <span className={cn('text-[9px]', active ? 'text-cyan-100' : 'text-slate-400')}>
                · {CATEGORY_LABELS[item.category]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5">
        <input
          type="text"
          value={extraText}
          onChange={(e) => onExtraTextChange(e.target.value)}
          placeholder="Outros nomes personalizados extras (separe por vírgulas, opcional)"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  );
}
