import { useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Beef,
  CheckCircle2,
  Droplets,
  Flame,
  LoaderCircle,
  Plus,
  Salad,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { Badge, Button, Card, DisclaimerBox, SectionTitle, TextInput } from './ui';
import { ageFromBirth, fmtMg, weeklyWeightTrend } from '../lib/schedule';
import { findMedication } from '../data/medications';
import {
  analyzeMealText,
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
import type { CustomMealLog, PatientData, Profile } from '../lib/types';
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

  // Estado para registro livre de alimentos consumidos (com IA)
  const [customFoodText, setCustomFoodText] = useState('');
  const [analyzingFood, setAnalyzingFood] = useState(false);
  const [foodAnalysisResult, setFoodAnalysisResult] = useState<{
    description: string;
    proteinG: number;
    fiberG: number;
    kcal: number;
    analyzedByAI: boolean;
  } | null>(null);

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

  // Um nutricionista vinculado pode ajustar manualmente proteína/kcal/fibras — isso substitui o cálculo automático.
  const nutritionOverride = data.nutritionOverride;
  const targets: NutritionTargets | null = useMemo(() => {
    if (!baseTargets) return null;
    if (!nutritionOverride) return baseTargets;
    return {
      ...baseTargets,
      proteinG: nutritionOverride.proteinG ?? baseTargets.proteinG,
      kcal: nutritionOverride.kcal ?? baseTargets.kcal,
      fiberG: nutritionOverride.fiberG ?? baseTargets.fiberG,
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
  const todayLog = nutritionLogs.find((n) => n.date === today);
  const consumedStandardMealIds = todayLog?.meals ?? [];
  const customMealsToday = todayLog?.customMeals ?? [];

  const dayName = days[dayIdx]?.dayName ?? '';

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

  async function handleAnalyzeCustomFood(e: React.FormEvent) {
    e.preventDefault();
    if (!customFoodText.trim()) return;
    setAnalyzingFood(true);
    try {
      const res = await analyzeMealText(customFoodText, llmCfg);
      setFoodAnalysisResult(res);
    } catch {
      // fallback manual
      setFoodAnalysisResult({
        description: customFoodText.trim(),
        proteinG: 15,
        fiberG: 3,
        kcal: 180,
        analyzedByAI: false,
      });
    } finally {
      setAnalyzingFood(false);
    }
  }

  function handleConfirmCustomMeal() {
    if (!foodAnalysisResult) return;
    const newEntry: CustomMealLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      description: foodAnalysisResult.description,
      proteinG: foodAnalysisResult.proteinG,
      fiberG: foodAnalysisResult.fiberG,
      kcal: foodAnalysisResult.kcal,
      analyzedByAI: foodAnalysisResult.analyzedByAI,
    };

    update((prev) => {
      const logsArr = prev.nutritionLogs ?? [];
      const existing = logsArr.find((n) => n.date === today);
      const nextCustom = [...(existing?.customMeals ?? []), newEntry];
      const nextLog = {
        date: today,
        meals: existing?.meals ?? [],
        customMeals: nextCustom,
      };
      return {
        ...prev,
        nutritionLogs: [...logsArr.filter((n) => n.date !== today), nextLog],
      };
    });

    setCustomFoodText('');
    setFoodAnalysisResult(null);
  }

  function handleDeleteCustomMeal(id: string) {
    update((prev) => {
      const logsArr = prev.nutritionLogs ?? [];
      const existing = logsArr.find((n) => n.date === today);
      if (!existing) return prev;
      const nextCustom = (existing.customMeals ?? []).filter((m) => m.id !== id);
      const nextLog = {
        ...existing,
        customMeals: nextCustom,
      };
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

  // CÁLCULO TOTAL DE PROTEÍNAS E FIBRAS: Refeições planejadas consumidas + Refeições livres registradas
  const eatenStandardMeals = days[dayIdx]?.meals.filter((m) => consumedStandardMealIds.includes(m.mealId)) ?? [];
  const standardProteinEaten = eatenStandardMeals.reduce((s, m) => s + m.proteinG, 0);
  const customProteinEaten = customMealsToday.reduce((s, m) => s + m.proteinG, 0);
  const customFiberEaten = customMealsToday.reduce((s, m) => s + (m.fiberG ?? 0), 0);

  const totalProteinEaten = Math.round(standardProteinEaten + customProteinEaten);
  const proteinPct = Math.min(100, Math.round((totalProteinEaten / targets.proteinG) * 100));

  const totalFiberEaten = Math.round(customFiberEaten + (eatenStandardMeals.length > 0 ? (targets.fiberG / 5) * eatenStandardMeals.length : 0));
  const fiberPct = Math.min(100, Math.round((totalFiberEaten / targets.fiberG) * 100));

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

      {/* Banner de Dieta Prescrita pelo Nutricionista (se houver) */}
      {nutritionOverride?.mealPlanText && (
        <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-6 shadow-lg shadow-emerald-100 dark:border-emerald-500/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-3 dark:border-emerald-800">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <UtensilsCrossed className="h-4 w-4" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  ★ Plano Prescrito pelo Profissional
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {nutritionOverride.mealPlanTitle || 'Dieta Personalizada'}
                </h3>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Nutricionista: <b>{nutritionOverride.authorName}</b> · Atualizado em{' '}
              {new Date(nutritionOverride.updatedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="mt-4 whitespace-pre-line text-xs leading-relaxed text-slate-800 dark:text-slate-200">
            {nutritionOverride.mealPlanText}
          </div>
        </Card>
      )}

      {/* Progresso do dia — Proteínas e Fibras */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Termômetro de Proteína */}
        <Card className="p-5">
          <SectionTitle
            icon={<Beef className="h-4 w-4 text-emerald-600" />}
            title="Proteína consumida hoje"
            subtitle={`${totalProteinEaten} g de ${targets.proteinG} g (${proteinPct}%)`}
            action={
              <Badge className={cn(proteinPct >= 90 ? 'bg-emerald-100 text-emerald-700' : proteinPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>
                {proteinPct >= 90 ? 'Meta atingida! 💪' : proteinPct >= 50 ? 'Bom ritmo' : 'Em andamento'}
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
            <span className="text-emerald-600">{targets.proteinG} g meta diária</span>
          </div>
        </Card>

        {/* Termômetro de Fibras */}
        <Card className="p-5">
          <SectionTitle
            icon={<Salad className="h-4 w-4 text-teal-600" />}
            title="Fibras consumidas hoje"
            subtitle={`${totalFiberEaten} g de ${targets.fiberG} g (${fiberPct}%)`}
            action={
              <Badge className={cn(fiberPct >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700')}>
                {fiberPct >= 80 ? 'Excelente saciedade 🥗' : 'Prevenção de constipação'}
              </Badge>
            }
          />
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${fiberPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
            <span>0 g</span>
            <span className="text-teal-600">{targets.fiberG} g meta diária</span>
          </div>
        </Card>
      </div>

      {/* REGISTRO LIVRE COM IA ("O que você conseguiu comer hoje?") */}
      <Card className="p-6 border-brand-200 dark:border-brand-900 bg-gradient-to-br from-white via-brand-50/20 to-white dark:from-slate-900 dark:via-brand-950/20 dark:to-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle
            icon={<Sparkles className="h-4 w-4 text-violet-600" />}
            title="Não conseguiu seguir o cardápio à risca? Registre aqui!"
            subtitle="Digite com suas palavras o que você conseguiu comer. A IA calcula as proteínas e fibras na hora e soma no seu total do dia."
          />
        </div>

        <form onSubmit={handleAnalyzeCustomFood} className="mt-3 flex flex-col sm:flex-row items-stretch gap-2">
          <TextInput
            placeholder="Ex: 1 filé de frango com 3 colheres de arroz, feijão e salada de alface"
            value={customFoodText}
            onChange={(e) => setCustomFoodText(e.target.value)}
            className="flex-1 text-xs !py-2.5"
            disabled={analyzingFood}
          />
          <Button
            type="submit"
            className="shrink-0 !py-2.5 !px-5 text-xs font-bold"
            disabled={analyzingFood || !customFoodText.trim()}
          >
            {analyzingFood ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> Calculando com IA…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-violet-200" /> Analisar e Somar
              </>
            )}
          </Button>
        </form>

        {/* Prévia do cálculo antes de confirmar */}
        {foodAnalysisResult && (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 animate-fade-in dark:border-violet-800 dark:bg-violet-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  🍽️ "{foodAnalysisResult.description}"
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {foodAnalysisResult.analyzedByAI
                    ? '✨ Estimativa detalhada gerada por IA'
                    : 'Estimativa baseada na tabela nutricional brasileira'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="!py-1.5 !px-3 text-xs"
                  onClick={() => setFoodAnalysisResult(null)}
                >
                  Descartar
                </Button>
                <Button
                  className="!py-1.5 !px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleConfirmCustomMeal}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar ao Somatório de Hoje
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-2.5 text-center shadow-sm dark:bg-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Proteína</p>
                <p className="text-base font-extrabold text-emerald-600">+{foodAnalysisResult.proteinG} g</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 text-center shadow-sm dark:bg-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Fibras</p>
                <p className="text-base font-extrabold text-teal-600">+{foodAnalysisResult.fiberG} g</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 text-center shadow-sm dark:bg-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Calorias</p>
                <p className="text-base font-extrabold text-slate-700 dark:text-slate-200">≈ {foodAnalysisResult.kcal} kcal</p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Refeições Livres Consumidas Hoje */}
        {customMealsToday.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
              Refeições livres registradas hoje ({customMealsToday.length}):
            </p>
            <div className="mt-2 space-y-2">
              {customMealsToday.map((cm) => (
                <div
                  key={cm.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{cm.description}</p>
                      <p className="text-[10px] text-slate-400">Registrado às {cm.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-emerald-600">+{cm.proteinG}g prot</span>
                    {cm.fiberG != null && cm.fiberG > 0 && (
                      <span className="font-extrabold text-teal-600">+{cm.fiberG}g fibras</span>
                    )}
                    <button
                      onClick={() => handleDeleteCustomMeal(cm.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="Excluir refeição"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
