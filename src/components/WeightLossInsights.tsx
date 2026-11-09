import { useMemo } from 'react';
import { Gauge, Scale, Sparkles, Target, TrendingDown } from 'lucide-react';
import type { WeightEntry } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  weights: WeightEntry[];
  startWeightKg?: number | null;
  targetWeightKg?: number | null;
  heightCm?: number | null;
  onEditTarget?: () => void;
}

export default function WeightLossInsights({
  weights,
  startWeightKg,
  targetWeightKg,
  heightCm,
  onEditTarget,
}: Props) {
  const currentWeight = weights.length > 0 ? weights[weights.length - 1].kg : startWeightKg;
  const initialWeight = startWeightKg ?? (weights.length > 0 ? weights[0].kg : null);

  // Cálculos de tempo e perda média semanal
  const stats = useMemo(() => {
    if (!initialWeight || !currentWeight || weights.length === 0) return null;

    const firstDate = new Date(weights[0].date);
    const lastDate = new Date(weights[weights.length - 1].date);
    const diffDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalWeeks = Math.max(1, Math.round((diffDays / 7) * 10) / 10);
    const totalLostKg = Math.round((initialWeight - currentWeight) * 10) / 10;
    const totalLostPct = Math.round((totalLostKg / initialWeight) * 1000) / 10;
    const avgLossPerWeek = totalWeeks > 0 ? Math.round((totalLostKg / totalWeeks) * 100) / 100 : 0;

    // Faltam para a meta
    const kgRemaining = targetWeightKg && currentWeight > targetWeightKg
      ? Math.round((currentWeight - targetWeightKg) * 10) / 10
      : null;

    // Estimativa de semanas para a meta
    let estimatedWeeksToTarget: number | null = null;
    let targetDateForecast: string | null = null;
    let probabilityText = 'Moderada';
    let probabilityColor = 'text-amber-600 bg-amber-50 border-amber-200';

    if (kgRemaining && kgRemaining > 0 && avgLossPerWeek > 0.1) {
      // Usamos uma média ponderada entre o ritmo atual e o ritmo padrão seguro (0.8 kg/sem)
      const effectivePace = (avgLossPerWeek + 0.8) / 2;
      estimatedWeeksToTarget = Math.ceil(kgRemaining / effectivePace);
      
      const forecast = new Date();
      forecast.setDate(forecast.getDate() + estimatedWeeksToTarget * 7);
      targetDateForecast = forecast.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      if (avgLossPerWeek >= 0.5 && avgLossPerWeek <= 1.8) {
        probabilityText = 'Alta (88% a 94%)';
        probabilityColor = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      } else if (avgLossPerWeek > 1.8) {
        probabilityText = 'Muito Rápida (Requer atenção à massa magra)';
        probabilityColor = 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      }
    }

    return {
      totalLostKg,
      totalLostPct,
      totalWeeks,
      avgLossPerWeek,
      kgRemaining,
      estimatedWeeksToTarget,
      targetDateForecast,
      probabilityText,
      probabilityColor,
    };
  }, [weights, initialWeight, currentWeight, targetWeightKg]);

  // Cálculo de IMC
  const imcInfo = useMemo(() => {
    if (!currentWeight || !heightCm) return null;
    const hM = heightCm / 100;
    const currentImc = Math.round((currentWeight / (hM * hM)) * 10) / 10;
    const targetImc = targetWeightKg ? Math.round((targetWeightKg / (hM * hM)) * 10) / 10 : null;

    // Faixas OMS
    const ranges = [
      { id: 'under', label: 'Abaixo do peso', min: 0, max: 18.4, color: 'bg-blue-400', textColor: 'text-blue-700' },
      { id: 'normal', label: 'Eutrófico (Normal)', min: 18.5, max: 24.9, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
      { id: 'over', label: 'Sobrepeso', min: 25.0, max: 29.9, color: 'bg-amber-400', textColor: 'text-amber-700' },
      { id: 'ob1', label: 'Obesidade Grau I', min: 30.0, max: 34.9, color: 'bg-orange-400', textColor: 'text-orange-700' },
      { id: 'ob2', label: 'Obesidade Grau II', min: 35.0, max: 39.9, color: 'bg-rose-500', textColor: 'text-rose-700' },
      { id: 'ob3', label: 'Obesidade Grau III', min: 40.0, max: 60.0, color: 'bg-red-700', textColor: 'text-red-700' },
    ];

    const currentRange = ranges.find((r) => currentImc >= r.min && currentImc <= r.max) || ranges[ranges.length - 1];
    const targetRange = targetImc ? ranges.find((r) => targetImc >= r.min && targetImc <= r.max) : null;

    // Posição percentual para o slider (0 a 50 de IMC)
    const currentPosPct = Math.min(100, Math.max(0, ((currentImc - 15) / (45 - 15)) * 100));
    const targetPosPct = targetImc ? Math.min(100, Math.max(0, ((targetImc - 15) / (45 - 15)) * 100)) : null;

    return {
      currentImc,
      targetImc,
      currentRange,
      targetRange,
      ranges,
      currentPosPct,
      targetPosPct,
    };
  }, [currentWeight, heightCm, targetWeightKg]);

  return (
    <div className="mt-4 space-y-4">
      {/* 1. CARD DE MÉDIA SEMANAL E RITMO */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Média Semanal */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600" /> Perda Média Semanal
            </span>
            <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.avgLossPerWeek > 0 ? `-${stats.avgLossPerWeek.toLocaleString('pt-BR')} kg` : '0 kg'}
              <span className="text-xs font-semibold text-slate-400"> / sem</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Em {stats.totalWeeks} semanas monitoradas
            </p>
          </div>

          {/* Total Perdido */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Scale className="h-3.5 w-3.5 text-brand-600" /> Total Eliminado
            </span>
            <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalLostKg > 0 ? `-${stats.totalLostKg.toLocaleString('pt-BR')} kg` : '0 kg'}
              <span className="text-xs font-bold text-emerald-600 ml-1">(-{stats.totalLostPct}%)</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              De {initialWeight?.toLocaleString('pt-BR')} kg para {currentWeight?.toLocaleString('pt-BR')} kg
            </p>
          </div>

          {/* Previsão para a Meta */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-teal-600" /> Previsão da Meta
              </span>
              {onEditTarget && (
                <button onClick={onEditTarget} className="text-brand-600 hover:underline">
                  {targetWeightKg ? `${targetWeightKg} kg` : '+ Definir'}
                </button>
              )}
            </span>

            {targetWeightKg && stats.kgRemaining ? (
              <div>
                <p className="mt-1 text-xl font-extrabold text-teal-600 dark:text-teal-400">
                  {stats.targetDateForecast ?? `~${stats.estimatedWeeksToTarget} semanas`}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Faltam <strong>{stats.kgRemaining} kg</strong> no ritmo sustentável
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400 italic">Defina sua meta de peso</p>
            )}
          </div>
        </div>
      )}

      {/* 2. PROBABILIDADE CLÍNICA DE ATINGIR O PESO IDEAL */}
      {stats && stats.kgRemaining && stats.kgRemaining > 0 && (
        <div className={cn("rounded-2xl border p-3.5 flex items-start gap-3", stats.probabilityColor)}>
          <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <strong className="text-sm font-extrabold">Probabilidade de Sucesso: {stats.probabilityText}</strong>
            </div>
            <p className="mt-1 leading-relaxed">
              Com o uso de análogos de GLP-1/GIP associado à sua taxa consistente de <strong>{stats.avgLossPerWeek} kg/semana</strong>, sua probabilidade de alcançar o objetivo de <strong>{targetWeightKg} kg</strong> é excelente. A chave para a sustentabilidade é manter a meta de ingestão proteica e musculação para blindar o metabolismo.
            </p>
          </div>
        </div>
      )}

      {/* 3. MAPA VISUAL DE IMC E FAIXAS DA OMS */}
      {imcInfo && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Mapa de IMC · Índices da OMS
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Altura: {heightCm} cm
            </span>
          </div>

          {/* Régua visual de faixas */}
          <div className="mt-4 relative">
            <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner">
              <div className="w-[12%] bg-sky-400" title="Abaixo do peso (< 18.5)" />
              <div className="w-[21%] bg-emerald-500" title="Normal (18.5 - 24.9)" />
              <div className="w-[17%] bg-amber-400" title="Sobrepeso (25.0 - 29.9)" />
              <div className="w-[17%] bg-orange-400" title="Obesidade I (30.0 - 34.9)" />
              <div className="w-[17%] bg-rose-500" title="Obesidade II (35.0 - 39.9)" />
              <div className="w-[16%] bg-red-700" title="Obesidade III (≥ 40)" />
            </div>

            {/* Marcador do IMC Atual */}
            <div
              className="absolute -top-7 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
              style={{ left: `${imcInfo.currentPosPct}%` }}
            >
              <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-md dark:bg-white dark:text-slate-900 whitespace-nowrap">
                Atual: {imcInfo.currentImc}
              </span>
              <div className="h-2 w-0.5 bg-slate-900 dark:bg-white" />
            </div>

            {/* Marcador da Meta (se houver) */}
            {imcInfo.targetPosPct != null && (
              <div
                className="absolute -bottom-6 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
                style={{ left: `${imcInfo.targetPosPct}%` }}
              >
                <div className="h-2 w-0.5 bg-teal-600" />
                <span className="rounded-md bg-teal-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-md whitespace-nowrap">
                  Meta: {imcInfo.targetImc} ({targetWeightKg}kg)
                </span>
              </div>
            )}
          </div>

          {/* Legenda das faixas */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
            {imcInfo.ranges.map((r) => {
              const isCurrent = imcInfo.currentRange.id === r.id;
              const isTarget = imcInfo.targetRange?.id === r.id;
              return (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-xl p-2 text-center transition-all border',
                    isCurrent
                      ? 'border-brand-500 bg-brand-50/70 font-extrabold ring-1 ring-brand-500 dark:bg-brand-950/40'
                      : isTarget
                        ? 'border-teal-400 bg-teal-50/70 font-bold dark:bg-teal-950/40'
                        : 'border-slate-100 bg-slate-50/50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/30',
                  )}
                >
                  <div className={cn('mx-auto h-2 w-2 rounded-full mb-1', r.color)} />
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                    {r.label}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {r.min}–{r.max === 60 ? '40+' : r.max}
                  </p>
                  {isCurrent && (
                    <span className="inline-block mt-1 text-[8px] font-extrabold text-brand-600 dark:text-brand-400 uppercase">
                      Você aqui ★
                    </span>
                  )}
                  {isTarget && !isCurrent && (
                    <span className="inline-block mt-1 text-[8px] font-extrabold text-teal-600 dark:text-teal-400 uppercase">
                      Meta 🎯
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
