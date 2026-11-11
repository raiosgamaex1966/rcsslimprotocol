import { useMemo } from 'react';
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge, Button, Card } from './ui';
import {
  buildFallbackWeekMenu,
  computeTargets,
  currentDoseMg,
  getCachedAIMenu,
  parsePrescribedPlanFallback,
  type MealId,
} from '../lib/llm';
import { findMedication } from '../data/medications';
import { ageFromBirth, weeklyWeightTrend } from '../lib/schedule';
import type { DayMenu, PatientData } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  userId: string;
  data: PatientData;
  update: (updater: (prev: PatientData) => PatientData) => void;
  onOpenNutritionTab: () => void;
}

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export default function TodayMealPlanCard({ userId, data, update, onOpenNutritionTab }: Props) {
  const profile = data.profile;
  const treatment = data.treatment;
  const weights = data.weights ?? [];
  const weightKg = weights.length ? weights[weights.length - 1].kg : (profile?.startWeightKg ?? null);
  const doseMg = currentDoseMg(treatment);
  const med = treatment ? findMedication(treatment.medId) : undefined;
  const age = profile?.birthDate ? ageFromBirth(profile.birthDate) : null;
  const activityLevel = data.physicalAssessment?.activityLevel ?? 'leve';
  const weightTrend = weeklyWeightTrend(weights);
  const menuSignature = `${Math.round((weightKg ?? 0) * 10)}-${doseMg}-${activityLevel}-${weightTrend?.percentPerWeek ?? 0}`;

  const targets = useMemo(() => {
    if (!weightKg || !profile?.heightCm || !treatment) return null;
    const base = computeTargets({
      weightKg,
      heightCm: profile.heightCm,
      sex: profile.sex || 'masculino',
      age: age ?? 40,
      doseMg,
      medMaxDose: med ? Math.max(...med.doses) : 1,
      activityLevel,
      weeklyWeightChangePercent: weightTrend?.percentPerWeek,
    });
    if (!data.nutritionOverride) return base;
    return {
      ...base,
      proteinG: data.nutritionOverride.proteinG ?? base.proteinG,
      kcal: data.nutritionOverride.kcal ?? base.kcal,
      fiberG: data.nutritionOverride.fiberG ?? base.fiberG,
    };
  }, [weightKg, profile?.heightCm, profile?.sex, age, doseMg, med, treatment, activityLevel, weightTrend?.percentPerWeek, data.nutritionOverride]);

  const override = data.nutritionOverride;
  const hasPrescribed = Boolean(override?.mealPlanText);

  const todayMenu: DayMenu | null = useMemo(() => {
    const idx = todayIndex();
    if (override?.structuredDays && override.structuredDays.length > 0) {
      return override.structuredDays[idx] ?? override.structuredDays[0];
    }
    if (override?.mealPlanText) {
      const effectiveTargets = targets ?? {
        proteinG: override.proteinG ?? 120,
        proteinPerKg: 1.4,
        kcal: override.kcal ?? 1600,
        carbsG: 140,
        fatG: 50,
        waterMl: 2500,
        fiberG: override.fiberG ?? 28,
        rapidLoss: false,
      };
      const days = parsePrescribedPlanFallback(override.mealPlanText, effectiveTargets);
      return days[idx] ?? days[0];
    }
    const cachedAI = getCachedAIMenu(userId, menuSignature);
    if (cachedAI && cachedAI.length > 0) {
      return cachedAI[idx] ?? cachedAI[0];
    }
    if (targets) {
      const fb = buildFallbackWeekMenu(targets);
      return fb.days[idx] ?? fb.days[0];
    }
    return null;
  }, [override, targets, userId, menuSignature]);

  if (!todayMenu) return null;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nutritionLogs = data.nutritionLogs ?? [];
  const todayLog = nutritionLogs.find((n) => n.date === today);
  const consumedIds = todayLog?.meals ?? [];
  const customMealsToday = todayLog?.customMeals ?? [];

  const eatenStandard = todayMenu.meals.filter((m) => consumedIds.includes(m.mealId));
  const proteinEaten = Math.round(
    eatenStandard.reduce((s, m) => s + m.proteinG, 0) +
      customMealsToday.reduce((s, m) => s + m.proteinG, 0),
  );
  const targetProtein = targets?.proteinG ?? override?.proteinG ?? todayMenu.proteinG ?? 120;
  const proteinPct = Math.min(100, Math.round((proteinEaten / targetProtein) * 100));

  function toggleMeal(mealId: MealId) {
    update((prev) => {
      const logsArr = prev.nutritionLogs ?? [];
      const existing = logsArr.find((n) => n.date === today);
      const meals = new Set(existing?.meals ?? []);
      if (meals.has(mealId)) meals.delete(mealId);
      else meals.add(mealId);
      const nextLog = {
        date: today,
        meals: Array.from(meals),
        customMeals: existing?.customMeals ?? [],
      };
      return {
        ...prev,
        nutritionLogs: [...logsArr.filter((n) => n.date !== today), nextLog],
      };
    });
  }

  return (
    <Card
      className={cn(
        'p-5 sm:p-6 transition-all',
        hasPrescribed
          ? 'border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:border-emerald-600/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900'
          : 'border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md',
              hasPrescribed
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-brand-600 shadow-brand-600/30',
            )}
          >
            {hasPrescribed ? <UtensilsCrossed className="h-5 w-5" /> : <Apple className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {hasPrescribed ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-extrabold">
                  ★ Plano do Nutricionista ({override?.authorName})
                </Badge>
              ) : (
                <Badge className="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 text-[10px] font-extrabold">
                  <Sparkles className="h-3 w-3" /> Sugestão Inteligente
                </Badge>
              )}
              <span className="text-[11px] font-bold text-slate-400">
                {todayMenu.dayName} (Hoje)
              </span>
            </div>
            <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              {hasPrescribed
                ? override?.mealPlanTitle || 'Seu Cardápio Prescrito de Hoje'
                : 'Seu Cardápio de Hoje'}
            </h3>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-200">
            <span>Proteína hoje:</span>
            <span className={cn(proteinPct >= 90 ? 'text-emerald-600' : 'text-brand-600')}>
              {proteinEaten}g / {targetProtein}g ({proteinPct}%)
            </span>
          </div>
          <div className="h-2 w-full sm:w-44 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${proteinPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Refeições do Dia */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {todayMenu.meals.map((meal) => {
          const eaten = consumedIds.includes(meal.mealId);
          return (
            <div
              key={meal.mealId}
              className={cn(
                'flex flex-col justify-between rounded-2xl border p-3.5 text-xs transition-all',
                eaten
                  ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-950/30'
                  : 'border-slate-200/80 bg-white/90 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-800/60',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-extrabold text-slate-900 dark:text-white">
                    {meal.name}
                    <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                      {meal.time}
                    </span>
                  </p>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                    {meal.proteinG}g prot
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {meal.items.map((it) => `${it.name}${it.portion && it.portion !== 'Conforme prescrição' ? ` (${it.portion})` : ''}`).join(' + ')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleMeal(meal.mealId)}
                className={cn(
                  'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition-all',
                  eaten
                    ? 'border-emerald-400 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {eaten ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Consumida
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="h-3 w-3" /> Marcar como feita
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {hasPrescribed
            ? 'Cardápio oficial adaptado com base na prescrição do seu nutricionista.'
            : 'Conecte-se a um nutricionista no perfil ou veja opções detalhadas na aba Nutrição.'}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={onOpenNutritionTab}
          className="!py-1.5 !px-3 text-xs font-bold"
        >
          Ver Semana Completa e Registrar Alimentos <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
