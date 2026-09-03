import { useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Beef,
  CheckCircle2,
  Droplets,
  Flame,
  LoaderCircle,
  Salad,
  Sparkles,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { Badge, Button, Card, DisclaimerBox, SectionTitle } from './ui';
import { ageFromBirth, fmtMg, weeklyWeightTrend } from '../lib/schedule';
import { findMedication } from '../data/medications';
import {
  buildFallbackWeekMenu,
  cacheAIMenu,
  computeTargets,
  currentDoseMg,
  getCachedAIMenu,
  getLLMConfig,
  generateAIMenu,
  MEAL_META,
  type DayMenu,
  type MealId,
  type NutritionTargets,
  type WeekMenu,
} from '../lib/llm';
import type { PatientData, Profile } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  userId: string;
  data: PatientData;
  update: (updater: (prev: PatientData) => PatientData) => void;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export default function NutritionTab({ userId, data, update }: Props) {
  const profile: Profile | undefined = data.profile;
  const treatment = data.treatment;
  const logs = data.logs ?? [];
  const nutritionLogs = data.nutritionLogs ?? [];
  const [dayIdx, setDayIdx] = useState(todayIndex());
  const [aiDays, setAiDays] = useState<DayMenu[] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const weightKg = (() => {
    if (data.weights.length) return data.weights[data.weights.length - 1].kg;
    return profile?.startWeightKg ?? null;
  })();
  const doseMg = currentDoseMg(treatment);
  const med = treatment ? findMedication(treatment.medId) : undefined;
  const age = profile?.birthDate ? ageFromBirth(profile.birthDate) : null;
  const activityLevel = data.physicalAssessment?.activityLevel ?? 'leve';
  const weightTrend = weeklyWeightTrend(data.weights);
  const menuSignature = `${Math.round((weightKg ?? 0) * 10)}-${doseMg}-${activityLevel}-${weightTrend?.percentPerWeek ?? 0}`;

  useEffect(() => {
    setAiDays(getCachedAIMenu(userId, menuSignature));
  }, [userId, menuSignature]);

  const baseTargets: NutritionTargets | null = useMemo(() => {
    if (!weightKg || !profile?.heightCm || !treatment) return null;
    return computeTargets({
      weightKg,
      heightCm: profile.heightCm,
      sex: profile.sex || 'masculino',
      age: age ?? 40,
      doseMg,
      medMaxDose: med ? Math.max(...med.doses) : 1,
      activityLevel,
      weeklyWeightChangePercent: weightTrend?.percentPerWeek,
    });
  }, [weightKg, profile?.heightCm, profile?.sex, age, doseMg, med, treatment, activityLevel, weightTrend?.percentPerWeek]);

  // Um nutricionista vinculado pode ajustar manualmente proteína/kcal — isso substitui o cálculo automático.
  const nutritionOverride = data.nutritionOverride;
  const targets: NutritionTargets | null = useMemo(() => {
    if (!baseTargets) return null;
    if (!nutritionOverride) return baseTargets;
    return {
      ...baseTargets,
      proteinG: nutritionOverride.proteinG ?? baseTargets.proteinG,
      kcal: nutritionOverride.kcal ?? baseTargets.kcal,
    };
  }, [baseTargets, nutritionOverride]);

  const fallbackMenu: WeekMenu | null = useMemo(
    () => (targets ? buildFallbackWeekMenu(targets) : null),
    [targets],
  );

  const days: DayMenu[] = useMemo(() => aiDays ?? fallbackMenu?.days ?? [], [aiDays, fallbackMenu]);

  const llmCfg = getLLMConfig();
  const aiConfigured = Boolean(llmCfg?.enabled && llmCfg.apiKey && llmCfg.model);

  const today = new Date().toISOString().slice(0, 10);
  const consumedToday = nutritionLogs.find((n) => n.date === today)?.meals ?? [];

  const dayName = days[dayIdx]?.dayName ?? '';

  function toggleMeal(mealId: MealId) {
    update((prev) => {
      const logsArr = prev.nutritionLogs ?? [];
      const existing = logsArr.find((n) => n.date === today);
      const meals = new Set(existing?.meals ?? []);
      if (meals.has(mealId)) meals.delete(mealId);
      else meals.add(mealId);
      const nextLog = { date: today, meals: Array.from(meals) };
      return {
        ...prev,
        nutritionLogs: [...logsArr.filter((n) => n.date !== today), nextLog],
      };
    });
  }

  async function generateWithAI() {
    if (!targets || !treatment || !llmCfg) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const generated = await generateAIMenu(llmCfg, treatment, profile!, weightKg!, targets, doseMg, logs);
      cacheAIMenu(userId, generated, menuSignature);
      setAiDays(generated);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Falha ao gerar com IA. Usando cardápio padrão.');
      setAiDays(null);
    } finally {
      setAiBusy(false);
    }
  }

  if (!targets) {
    return (
      <div className="mt-6 space-y-5">
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <Apple className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Controle nutricional</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Para calcular sua meta diária de proteína e montar seu cardápio, precisamos do seu <b>peso</b>, <b>altura</b> e do
            tratamento configurado (caneta + dose da semana). Complete essas informações para ativar a nutrição.
          </p>
          {!treatment && (
            <p className="mt-3 text-xs font-bold text-amber-600">⚠️ Configure seu tratamento na aba Início.</p>
          )}
        </Card>
      </div>
    );
  }

  const eatenToday = days[dayIdx]?.meals.filter((m) => consumedToday.includes(m.mealId)) ?? [];
  const proteinEaten = Math.round(eatenToday.reduce((s, m) => s + m.proteinG, 0));
  const proteinPct = Math.min(100, Math.round((proteinEaten / targets.proteinG) * 100));

  return (
    <div className="mt-6 space-y-6">
      {/* Hero nutricional */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-brand-700 p-6 text-white shadow-xl shadow-emerald-200 sm:p-7">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10 blur-[60px]" />
        <div className="relative">
          <Badge className="bg-white/15 text-emerald-50">
            <Beef className="h-3 w-3" /> Preserve sua massa magra
          </Badge>
          <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
            Nutrição de precisão para a semana {treatment ? `${Math.max(1, Math.floor((Date.now() - new Date(treatment.startDate + 'T12:00:00').getTime()) / 604800000) + 1)}` : ''} {med ? `de ${med.brand}` : ''}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-emerald-50/90">
            Com peso atual de <b>{weightKg?.toLocaleString('pt-BR')} kg</b> e nível <b>{activityLevel}</b>, a referência é de{' '}
            <b>{targets.proteinG} g/dia ({targets.proteinPerKg.toLocaleString('pt-BR')} g por kg)</b>. A dose de {fmtMg(doseMg)}{' '}
            entra como contexto de apetite e tolerância alimentar, não como prescrição nutricional isolada.
          </p>
          {nutritionOverride && (
            <Badge className="mt-3 bg-white/20 text-emerald-50">
              <Sparkles className="h-3 w-3" /> Metas ajustadas pelo seu nutricionista
            </Badge>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Beef, label: 'Proteína/dia', value: `${targets.proteinG} g` },
              { icon: Flame, label: 'Energia', value: `≈ ${targets.kcal} kcal` },
              { icon: Droplets, label: 'Água', value: `≈ ${(targets.waterMl / 1000).toLocaleString('pt-BR')} L` },
              { icon: Salad, label: 'Fibras', value: `${targets.fiberG} g` },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <c.icon className="h-4 w-4 text-emerald-200" />
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100/80">{c.label}</p>
                <p className="text-sm font-extrabold">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {targets.rapidLoss && weightTrend && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed">
            <b>Perda mais rápida no último intervalo:</b> cerca de {Math.abs(weightTrend.kgPerWeek).toLocaleString('pt-BR')} kg/semana
            ({Math.abs(weightTrend.percentPerWeek).toLocaleString('pt-BR')}%). O app reduziu o déficit estimado e reforçou a
            referência proteica. Converse com médico ou nutricionista para avaliar massa muscular, ingestão e tolerância.
          </p>
        </div>
      )}

      {/* Progresso do dia */}
      <Card className="p-6">
        <SectionTitle
          icon={<CheckCircle2 className="h-4 w-4 text-brand-600" />}
          title={`Proteína consumida hoje`}
          subtitle={`${proteinEaten} g de ${targets.proteinG} g (${proteinPct}%) — recalculado com ${weightKg?.toLocaleString('pt-BR')} kg`}
          action={
            <Badge className={cn(proteinPct >= 90 ? 'bg-emerald-100 text-emerald-700' : proteinPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>
              {proteinPct >= 90 ? 'Meta atingida! 💪' : proteinPct >= 50 ? 'Bom ritmo' : 'Marque as refeições'}
            </Badge>
          }
        />
        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${proteinPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
          <span>0 g</span>
          <span className="text-brand-700">{targets.proteinG} g</span>
        </div>
      </Card>

      {/* Seletor de dia */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Cardápio da semana</h3>
          <div className="flex items-center gap-2">
            {aiDays ? (
              <Badge className="bg-violet-100 text-violet-700">
                <Sparkles className="h-3 w-3" /> Gerado por IA
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-500">Cardápio padrão inteligente</Badge>
            )}
            {aiConfigured && (
              <Button variant="secondary" className="!px-3 !py-1.5 text-[11px]" onClick={generateWithAI} disabled={aiBusy}>
                {aiBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-violet-500" />}
                {aiBusy ? 'Gerando…' : aiDays ? 'Regenerar com IA' : 'Gerar com IA'}
              </Button>
            )}
            {!aiConfigured && (
              <span className="text-[10px] font-semibold text-slate-400" title="O super admin configura a LLM no Painel Admin">
                ✨ IA disponível após configuração do admin
              </span>
            )}
          </div>
        </div>
        {aiError && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
            ⚠️ {aiError}
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((l, i) => (
            <button
              key={l}
              onClick={() => setDayIdx(i)}
              className={cn(
                'rounded-xl py-2.5 text-center transition-all',
                i === todayIndex() && 'ring-1 ring-brand-300',
                dayIdx === i
                  ? 'bg-gradient-to-br from-brand-600 to-teal-600 text-white shadow-md shadow-brand-500/25'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500/50',
              )}
            >
              <span className="block text-[11px] font-extrabold">{l}</span>
              <span className={cn('block text-[9px] font-semibold', dayIdx === i ? 'text-brand-100' : 'text-slate-400')}>
                {i === todayIndex() ? 'hoje' : `dia ${i + 1}`}
              </span>
            </button>
          ))}
        </div>

        {/* Refeições do dia selecionado */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {days[dayIdx]?.meals.map((meal) => {
            const eaten = consumedToday.includes(meal.mealId);
            return (
              <div
                key={meal.mealId}
                className={cn(
                  'rounded-2xl border bg-white p-4 transition-all dark:bg-slate-900',
                  eaten ? 'border-emerald-300 bg-emerald-50/40 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-slate-200/80 shadow-sm dark:border-slate-800',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                    {meal.name}
                    <span className="ml-2 text-[10px] font-bold text-slate-400">{meal.time}</span>
                  </p>
                  <Badge className={cn(eaten ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700')}>
                    🥩 {meal.proteinG} g / {meal.proteinTarget} g
                  </Badge>
                </div>

                <ul className="mt-2.5 space-y-1.5">
                  {meal.items.map((it, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                      <span className="text-slate-700 dark:text-slate-300">
                        <b className="text-slate-800 dark:text-slate-100">{it.name}</b>
                        <span className="ml-1.5 text-slate-400">· {it.portion}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">
                        {it.proteinG} g prot · {it.kcal} kcal
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => toggleMeal(meal.mealId)}
                  className={cn(
                    'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition-all',
                    eaten
                      ? 'border-emerald-300 bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300',
                  )}
                >
                  {eaten ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Refeição consumida!
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="h-3.5 w-3.5" /> Marcar como consumida
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          {dayName} · Proteína do dia: <b>{days[dayIdx]?.proteinG ?? 0} g</b> · Energia estimada:{' '}
          <b>{(days[dayIdx]?.kcal ?? 0).toLocaleString('pt-BR')} kcal</b> · Distribuição por refeição:{' '}
          {MEAL_META.map((m) => `${Math.round(targets.proteinG * m.share)}g`).join(' / ')}
        </p>
      </div>

      {/* Aviso dose */}
      {doseMg > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            <b>Ajuste semanal:</b> ao registrar um novo peso no painel, proteína, água, energia e o cardápio padrão são recalculados
            automaticamente. A dose atual ({fmtMg(doseMg)}) ajuda a IA a adaptar volume e tolerância das refeições. A meta final
            deve ser confirmada por nutricionista, especialmente em doença renal, hepática ou cardíaca.
          </p>
        </div>
      )}

      {data.professionalNotes?.nutricionista && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            Observação do seu nutricionista · {new Date(data.professionalNotes.nutricionista.updatedAt).toLocaleDateString('pt-BR')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">{data.professionalNotes.nutricionista.text}</p>
        </div>
      )}

      <DisclaimerBox compact />
    </div>
  );
}
