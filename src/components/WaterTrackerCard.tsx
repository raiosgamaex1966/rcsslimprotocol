import { useState } from 'react';
import { Check, Droplets, Plus } from 'lucide-react';
import { Card, SectionTitle } from './ui';
import type { WaterLog } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  currentWeightKg: number | null;
  waterLogs?: WaterLog[];
  onUpdateWater: (mlToday: number) => void;
}

export default function WaterTrackerCard({
  currentWeightKg,
  waterLogs = [],
  onUpdateWater,
}: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const logToday = waterLogs.find((w) => w.date === todayStr);
  const currentMl = logToday?.ml ?? 0;

  // Meta estimada: 35ml por kg corporal (mínimo 2000ml)
  const targetMl = Math.max(2000, Math.round(((currentWeightKg ?? 70) * 35) / 100) * 100);
  const pct = Math.min(100, Math.round((currentMl / targetMl) * 100));

  const [addedAnim, setAddedAnim] = useState<number | null>(null);

  function addWater(amount: number) {
    const next = Math.max(0, currentMl + amount);
    onUpdateWater(next);
    setAddedAnim(amount);
    setTimeout(() => setAddedAnim(null), 1500);
  }

  return (
    <Card className="p-5 sm:p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <SectionTitle
          icon={<Droplets className="h-4 w-4 text-sky-500" />}
          title="Hidratação Diária"
          subtitle="Fundamental para a tolerância ao GLP-1"
        />
        <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
          {currentMl} / {targetMl} ml
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span>Progresso do dia</span>
          <span>{pct}% da meta</span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-400 to-blue-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Botões rápidos */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => addWater(250)}
          className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
        >
          <Plus className="h-3.5 w-3.5" /> 250 ml (copo)
        </button>
        <button
          type="button"
          onClick={() => addWater(500)}
          className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
        >
          <Plus className="h-3.5 w-3.5" /> 500 ml (garrafa)
        </button>
        {currentMl > 0 && (
          <button
            type="button"
            onClick={() => addWater(-250)}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline ml-auto"
          >
            desfazer 250ml
          </button>
        )}
      </div>

      {pct >= 100 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="h-3.5 w-3.5" /> Meta de água batida hoje! Excelente para evitar constipação e náuseas.
        </div>
      )}
    </Card>
  );
}
