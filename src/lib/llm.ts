import { food, scaledPortion, type FoodItem } from '../data/foods';
import { findMedication } from '../data/medications';
import type { DoseLog, Profile, Treatment } from './types';
import { ageFromBirth, doseAtDate, treatmentWeek, WEEKDAY_NAMES } from './schedule';

/* ============================================================
 * CONTROLE NUTRICIONAL — metas recalculadas pelo peso atual
 *
 * Em uso de GLP-1/GIP com déficit calórico, o risco de perda de
 * massa magra aumenta. A dose é contexto para tolerância alimentar,
 * mas não define sozinha a necessidade proteica.
 * ============================================================ */

export interface NutritionInput {
  weightKg: number;
  heightCm: number;
  sex: string;
  age: number;
  doseMg: number;
  medMaxDose: number;
  activityLevel?: 'sedentario' | 'leve' | 'moderado' | 'ativo';
  weeklyWeightChangePercent?: number;
}

export interface NutritionTargets {
  proteinG: number;
  proteinPerKg: number;
  kcal: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  fiberG: number;
  rapidLoss: boolean;
}

export function computeTargets(input: NutritionInput): NutritionTargets {
  const { weightKg, heightCm, sex, age, activityLevel = 'leve', weeklyWeightChangePercent = 0 } = input;
  const proteinByActivity = { sedentario: 1.2, leve: 1.3, moderado: 1.5, ativo: 1.6 } as const;
  const rapidLoss = weeklyWeightChangePercent <= -0.75;
  const proteinPerKg = Math.min(1.7, proteinByActivity[activityLevel] + (rapidLoss ? 0.1 : 0));
  const proteinG = Math.round(proteinPerKg * weightKg);

  // Mifflin-St Jeor para gasto basal
  const bmr =
    sex === 'feminino'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const activityFactor = { sedentario: 1.2, leve: 1.35, moderado: 1.5, ativo: 1.65 }[activityLevel];
  // Estimativa conservadora; a prescrição final deve ser validada por nutricionista.
  const kcal = Math.max(1200, Math.round((bmr * activityFactor - (rapidLoss ? 200 : 350)) / 10) * 10);

  // distribuição: 30% proteína / 40% carboidrato / 30% gordura
  const carbsG = Math.round((kcal * 0.4) / 4);
  const fatG = Math.round((kcal * 0.3) / 9);
  const waterMl = Math.round(weightKg * (activityLevel === 'ativo' ? 35 : 30));
  const fiberG = 28;

  return { proteinG, proteinPerKg, kcal, carbsG, fatG, waterMl, fiberG, rapidLoss };
}

/* ============================================================
 * CARDÁPIOS — modelo
 * ============================================================ */

export type MealId = 'cafe' | 'colacao' | 'almoco' | 'lanche' | 'jantar' | 'ceia';

export interface MenuItemOut {
  name: string;
  portion: string;
  proteinG: number;
  kcal: number;
}

export interface MenuMeal {
  mealId: MealId;
  name: string;
  time: string;
  items: MenuItemOut[];
  proteinG: number;
  proteinTarget: number;
  kcal: number;
}

export interface DayMenu {
  dayIndex: number; // 0 = segunda-feira
  dayName: string;
  meals: MenuMeal[];
  proteinG: number;
  kcal: number;
}

export interface WeekMenu {
  days: DayMenu[];
  targets: NutritionTargets;
}

export const MEAL_META: { id: MealId; name: string; time: string; share: number }[] = [
  { id: 'cafe', name: 'Café da manhã', time: '07:30', share: 0.25 },
  { id: 'colacao', name: 'Colação', time: '10:00', share: 0.08 },
  { id: 'almoco', name: 'Almoço', time: '12:30', share: 0.3 },
  { id: 'lanche', name: 'Lanche da tarde', time: '15:30', share: 0.12 },
  { id: 'jantar', name: 'Jantar', time: '19:30', share: 0.2 },
  { id: 'ceia', name: 'Ceia', time: '21:30', share: 0.05 },
];

export function mealProteinTargets(total: number): Record<MealId, number> {
  const out = {} as Record<MealId, number>;
  MEAL_META.forEach((m) => (out[m.id] = Math.round(total * m.share)));
  return out;
}

/* ============================================================
 * GERADOR DE CARDÁPIOS (fallback inteligente, sem LLM)
 * Cada prato tem um alimento protéico escalável para bater a
 * meta de proteína da refeição (fator 0,7x – 1,45x).
 * ============================================================ */

interface Plate {
  name: string;
  mainId: string; // alimento protéico escalável
  sides: string[]; // ids fixos
  fatId?: string;
}

const CAFES: Plate[] = [
  { name: 'Ovos + pão integral', mainId: 'ovo', sides: ['pao_integral', 'mamao'] },
  { name: 'Iogurte grego com aveia', mainId: 'iogurte_grego', sides: ['aveia', 'morango'], fatId: 'chia' },
  { name: 'Whey + fruta + pão', mainId: 'whey', sides: ['pao_integral', 'banana'] },
  { name: 'Cottage + tapioca', mainId: 'cottage', sides: ['tapioca', 'laranja'], fatId: 'pasta_amendoim' },
];

const COLACAO: Plate[] = [
  { name: 'Iogurte proteico', mainId: 'iogurte_grego', sides: ['banana'], fatId: 'chia' },
  { name: 'Whey shake', mainId: 'whey', sides: ['maca'] },
  { name: 'Cottage + fruta', mainId: 'cottage', sides: ['mamao'] },
  { name: 'Castanhas + fruta', mainId: 'castanhas', sides: ['maca'] },
];

const ALMOCOS: Plate[] = [
  { name: 'Frango grelhado + arroz integral', mainId: 'frango', sides: ['arroz', 'brocolis'], fatId: 'azeite' },
  { name: 'Carne magra + mandioquinha', mainId: 'carne', sides: ['mandioquinha', 'salada'], fatId: 'azeite' },
  { name: 'Tilápia + batata-doce', mainId: 'tilapia', sides: ['batata_doce', 'couve'], fatId: 'azeite' },
  { name: 'Salmão + legumes', mainId: 'salmao', sides: ['legumes_assados', 'salada'], fatId: 'azeite' },
  { name: 'Tofu + macarrão integral', mainId: 'tofu', sides: ['macarrao', 'brocolis'], fatId: 'azeite' },
  { name: 'Frango + feijão + salada', mainId: 'frango', sides: ['feijao', 'arroz', 'salada'], fatId: 'azeite' },
];

const LANCHES: Plate[] = [
  { name: 'Whey + fruta', mainId: 'whey', sides: ['banana'] },
  { name: 'Iogurte grego + castanhas', mainId: 'iogurte_grego', sides: ['castanhas'] },
  { name: 'Cottage + aveia', mainId: 'cottage', sides: ['aveia', 'morango'] },
  { name: 'Peru + pão integral', mainId: 'peru', sides: ['pao_integral'] },
];

const JANTARES: Plate[] = [
  { name: 'Omelete + salada', mainId: 'ovo', sides: ['salada', 'pao_integral'], fatId: 'azeite' },
  { name: 'Frango desfiado + legumes', mainId: 'frango', sides: ['legumes_assados', 'arroz'] },
  { name: 'Tilápia + abobrinha', mainId: 'tilapia', sides: ['abobrinha', 'batata_doce'], fatId: 'azeite' },
  { name: 'Tofu + cuscuz', mainId: 'tofu', sides: ['cuscuz', 'couve'] },
  { name: 'Carne + purê de mandioquinha', mainId: 'carne', sides: ['mandioquinha', 'brocolis'], fatId: 'azeite' },
  { name: 'Lentilha + arroz + ovo', mainId: 'lentilha', sides: ['arroz', 'ovo', 'salada'] },
];

const CEIAS: Plate[] = [
  { name: 'Iogurte + chia', mainId: 'iogurte_grego', sides: ['chia'] },
  { name: 'Queijo minas + fruta', mainId: 'minas', sides: ['mamao'] },
  { name: 'Ovo cozido', mainId: 'ovo', sides: [] },
  { name: 'Whey + castanhas', mainId: 'whey', sides: ['castanhas'] },
];

const PLATES_BY_MEAL: Record<MealId, Plate[]> = {
  cafe: CAFES,
  colacao: COLACAO,
  almoco: ALMOCOS,
  lanche: LANCHES,
  jantar: JANTARES,
  ceia: CEIAS,
};

function plateProtein(plate: Plate): number {
  const main = food(plate.mainId);
  let p = main?.proteinG ?? 0;
  plate.sides.forEach((s) => {
    const f = food(s);
    if (f && f.id !== plate.mainId) p += f.proteinG;
  });
  if (plate.fatId) p += food(plate.fatId)?.proteinG ?? 0;
  return p;
}

function buildDay(dayIndex: number, targets: NutritionTargets): DayMenu {
  const mealTargets = mealProteinTargets(targets.proteinG);
  const meals: MenuMeal[] = MEAL_META.map((meta, mi) => {
    const variants = PLATES_BY_MEAL[meta.id];
    const plate = variants[(dayIndex * 2 + mi) % variants.length];
    const target = mealTargets[meta.id];
    const base = plateProtein(plate);
    const factor = Math.min(1.45, Math.max(0.7, target / Math.max(1, base)));
    const main = food(plate.mainId)!;

    const items: MenuItemOut[] = [];
    const mainG = Math.round((main.proteinG * factor) * 10) / 10;
    items.push({ name: main.name, portion: scaledPortion(main, factor), proteinG: mainG, kcal: Math.round(main.kcal * factor) });
    plate.sides.forEach((sid) => {
      const f = food(sid);
      if (!f) return;
      items.push({ name: f.name, portion: f.portion, proteinG: f.proteinG, kcal: f.kcal });
    });
    if (plate.fatId) {
      const f = food(plate.fatId)!;
      items.push({ name: f.name, portion: f.portion, proteinG: f.proteinG, kcal: f.kcal });
    }

    const proteinG = Math.round(items.reduce((s, i) => s + i.proteinG, 0));
    const kcal = items.reduce((s, i) => s + i.kcal, 0);
    return { mealId: meta.id, name: meta.name, time: meta.time, items, proteinG, proteinTarget: target, kcal };
  });

  return {
    dayIndex,
    dayName: WEEKDAY_NAMES[(dayIndex + 1) % 7], // segunda = índice 0
    meals,
    proteinG: meals.reduce((s, m) => s + m.proteinG, 0),
    kcal: meals.reduce((s, m) => s + m.kcal, 0),
  };
}

export function buildFallbackWeekMenu(targets: NutritionTargets): WeekMenu {
  return { days: Array.from({ length: 7 }, (_, i) => buildDay(i, targets)), targets };
}

/* ============================================================
 * LLM — configuração do super admin + geração dos cardápios
 * ============================================================ */

export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // apenas custom
  systemPrompt?: string;
  exercisePrompt?: string;
  enabled: boolean;
}

export const LLM_DEFAULTS: Record<LLMProvider, { model: string; hint: string }> = {
  openai: { model: 'gpt-4o-mini', hint: 'https://api.openai.com/v1/chat/completions' },
  anthropic: { model: 'claude-sonnet-4-5', hint: 'https://api.anthropic.com/v1/messages' },
  gemini: { model: 'gemini-2.5-flash', hint: 'https://generativelanguage.googleapis.com' },
  custom: { model: '', hint: 'URL base compatível com OpenAI (ex.: https://.../v1)' },
};

const CONFIG_KEY = 'minhacaneta_llm_config';

export function getLLMConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as LLMConfig) : null;
  } catch {
    return null;
  }
}

export function saveLLMConfig(cfg: LLMConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export const DEFAULT_SYSTEM_PROMPT = `Você é um nutricionista especializado em pacientes em tratamento com análogos de GLP-1/GIP (canetas emagrecedoras e para diabetes). Seu objetivo: montar cardápios que preservem a MASSA MAGRA do paciente durante o emagrecimento, priorizando proteínas de alto valor biológico e distribuindo-as em 6 refeições diárias.

Contexto do paciente: {contexto}

Metas nutricionais do dia: {metas}

REGRAS:
1. Apenas alimentos e preparações comuns no Brasil, com quantidades em gramas, unidades ou medidas caseiras (colheres, conchas, fatias).
2. Cada refeição deve somar aproximadamente a meta de proteína indicada {meta_refeicao}.
3. Variedade entre os dias, sem repetir o mesmo prato principal em dias consecutivos.
4. Inclua fonte protéica em TODAS as refeições (café, colação, almoço, lanche, jantar e ceia).
5. Evite ultraprocessados, frituras e açúcar. Sugira temperos naturais.
6. Responda APENAS com JSON válido, sem texto antes ou depois, neste formato exato:
{"dias":[{"dia":1,"dia_nome":"Segunda-feira","refeicoes":[{"refeicao":"Café da manhã","horario":"07:30","itens":[{"alimento":"Ovo cozido","quantidade":"100 g (2 un)","proteina_g":12}],"proteina_g":25,"kcal":280}]}]}
- "dias" sempre com 7 entradas (dia 1 = segunda-feira).
- "refeicoes" sempre com 6 entradas nas ordens: Café da manhã, Colação, Almoço, Lanche da tarde, Jantar, Ceia.
- "proteina_g" e "kcal" são números (sem unidade).`;

export function buildContext(treatment: Treatment | null, profile: Profile, weightKg: number, doseMg: number, logs: DoseLog[]): string {
  const med = treatment ? findMedication(treatment.medId) : undefined;
  const week = treatment ? treatmentWeek(treatment) : 0;
  const bmi = profile.heightCm ? Math.round((weightKg / Math.pow(profile.heightCm / 100, 2)) * 10) / 10 : 0;
  const age = ageFromBirth(profile.birthDate);
  return `Paciente: ${profile.name || '—'} | Sexo: ${profile.sex || 'não informado'} | Idade: ${age ?? 'não informada'} | Peso atual: ${weightKg} kg | Altura: ${profile.heightCm ?? '—'} cm | IMC: ${bmi}
Tratamento: ${med ? `${med.brand} (${med.activeIngredient})` : 'nenhum'} | Dose da semana atual: ${doseMg} mg | Semana de tratamento: ${week} | Doses aplicadas: ${logs.length}`;
}

export function buildUserPrompt(treatment: Treatment | null, profile: Profile, weightKg: number, targets: NutritionTargets, doseMg: number, logs: DoseLog[], template = DEFAULT_SYSTEM_PROMPT): string {
  const ctx = buildContext(treatment, profile, weightKg, doseMg, logs);
  const metas = `Proteína: ${targets.proteinG} g/dia (${targets.proteinPerKg.toLocaleString('pt-BR')} g/kg) | Kcal: ${targets.kcal} | Carboidratos: ${targets.carbsG} g | Gorduras: ${targets.fatG} g | Água: ${targets.waterMl} ml | Fibras: ${targets.fiberG} g | Perda recente acelerada: ${targets.rapidLoss ? 'sim; priorizar tolerância e avaliação profissional' : 'não identificada'}`;
  const metaRefeicao = MEAL_META.map((m) => `${m.name}=${Math.round(targets.proteinG * m.share)}g`).join(' | ');
  return template.replace('{contexto}', ctx).replace('{metas}', metas).replace('{meta_refeicao}', metaRefeicao);
}

/* ---------- chamadas aos provedores ---------- */

export async function requestLLM(cfg: LLMConfig, prompt: string, maxTokens: number): Promise<string> {
  const key = cfg.apiKey.trim();
  if (!key) throw new Error('Chave da API não configurada.');
  const model = cfg.model.trim();
  if (!model) throw new Error('Modelo não configurado.');

  if (cfg.provider === 'openai' || cfg.provider === 'custom') {
    const base = cfg.provider === 'custom' ? (cfg.baseUrl ?? '').replace(/\/+$/, '') : 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: maxTokens }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error?.message ?? `Erro HTTP ${res.status}`);
    return data?.choices?.[0]?.message?.content ?? '';
  }

  if (cfg.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error?.message ?? `Erro HTTP ${res.status}`);
    return data?.content?.[0]?.text ?? '';
  }

  // gemini
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message ?? `Erro HTTP ${res.status}`);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/* ---------- parse/validação do JSON da LLM ---------- */

function parseAIMenu(text: string, targets: NutritionTargets): DayMenu[] {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('A LLM não retornou JSON válido.');
  const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
    dias?: { dia?: number; dia_nome?: string; refeicoes?: { refeicao?: string; horario?: string; itens?: { alimento?: string; quantidade?: string; proteina_g?: number | string; kcal?: number | string }[]; proteina_g?: number | string; kcal?: number | string }[] }[];
  };
  if (!Array.isArray(obj.dias) || obj.dias.length < 7) throw new Error('A LLM não retornou os 7 dias.');

  const mealOrder: MealId[] = ['cafe', 'colacao', 'almoco', 'lanche', 'jantar', 'ceia'];
  const mealNames: Record<string, MealId> = {
    'café da manhã': 'cafe', 'cafe da manha': 'cafe', 'colação': 'colacao', 'colacao': 'colacao', 'almoço': 'almoco', 'almoco': 'almoco',
    'lanche da tarde': 'lanche', 'lanche': 'lanche', 'jantar': 'jantar', 'ceia': 'ceia',
  };

  const targetsPerMeal = mealProteinTargets(targets.proteinG);

  return obj.dias.slice(0, 7).map((d, di) => {
    let mealIdx = 0;
    const meals: MenuMeal[] = (d.refeicoes ?? []).slice(0, 6).map((r) => {
      const mealId = mealNames[(r.refeicao ?? '').toLowerCase().trim()] ?? mealOrder[mealIdx++] ?? 'cafe';
      const meta = MEAL_META.find((m) => m.id === mealId)!;
      const items: MenuItemOut[] = (r.itens ?? []).map((i) => ({
        name: String(i.alimento ?? '—'),
        portion: String(i.quantidade ?? ''),
        proteinG: Number(i.proteina_g ?? 0) || 0,
        kcal: Number(i.kcal ?? 0) || 0,
      }));
      const proteinG = Number(r.proteina_g ?? 0) || Math.round(items.reduce((s, i) => s + i.proteinG, 0));
      const kcal = Number(r.kcal ?? 0) || items.reduce((s, i) => s + i.kcal, 0);
      return { mealId, name: meta.name, time: r.horario ?? meta.time, items, proteinG, proteinTarget: targetsPerMeal[mealId], kcal };
    });
    return {
      dayIndex: di,
      dayName: d.dia_nome ?? WEEKDAY_NAMES[(di + 1) % 7],
      meals,
      proteinG: meals.reduce((s, m) => s + m.proteinG, 0),
      kcal: meals.reduce((s, m) => s + m.kcal, 0),
    };
  });
}

export async function generateAIMenu(
  cfg: LLMConfig,
  treatment: Treatment | null,
  profile: Profile,
  weightKg: number,
  targets: NutritionTargets,
  doseMg: number,
  logs: DoseLog[],
): Promise<DayMenu[]> {
  const prompt = buildUserPrompt(treatment, profile, weightKg, targets, doseMg, logs, cfg.systemPrompt || DEFAULT_SYSTEM_PROMPT);
  const text = await requestLLM(cfg, prompt, 4000);
  if (!text.trim()) throw new Error('Resposta vazia da LLM.');
  return parseAIMenu(text, targets);
}

/** Testa a conexão com um prompt mínimo. */
export async function testLLM(cfg: LLMConfig): Promise<string> {
  return requestLLM(cfg, 'Responda apenas com a palavra: OK', 10);
}

/* ---------- cache do cardápio gerado por IA (por paciente/semana) ---------- */

export function weekKey(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `sem-${monday.toISOString().slice(0, 10)}`;
}

export function getCachedAIMenu(userId: string, signature = ''): DayMenu[] | null {
  try {
    const raw = localStorage.getItem(`minhacaneta_ai_menu_${userId}_${weekKey()}_${signature}`);
    return raw ? (JSON.parse(raw) as DayMenu[]) : null;
  } catch {
    return null;
  }
}

export function cacheAIMenu(userId: string, menu: DayMenu[], signature = ''): void {
  localStorage.setItem(`minhacaneta_ai_menu_${userId}_${weekKey()}_${signature}`, JSON.stringify(menu));
}

export function currentDoseMg(treatment: Treatment | null): number {
  if (!treatment) return 0;
  return doseAtDate(treatment, new Date());
}

/* ---------- Análise de Alimento Livre (IA + Heurística de Fallback) ---------- */

export interface AnalyzedMealResult {
  description: string;
  proteinG: number;
  fiberG: number;
  kcal: number;
  analyzedByAI: boolean;
}

export async function analyzeMealText(text: string, cfg: LLMConfig | null): Promise<AnalyzedMealResult> {
  const clean = text.trim();
  if (!clean) return { description: '', proteinG: 0, fiberG: 0, kcal: 0, analyzedByAI: false };

  // Se tiver LLM configurada, tenta obter análise precisa via prompt
  if (cfg?.enabled && cfg.apiKey && cfg.model) {
    try {
      const prompt = `Você é um nutricionista especialista em cálculo de macronutrientes de alimentos da culinária brasileira.
O paciente relatou que comeu: "${clean}".

Calcule com base em porções habituais do Brasil:
1) Proteínas totais em gramas (proteinG)
2) Fibras alimentares totais em gramas (fiberG)
3) Calorias totais estimadas (kcal)

Responda ESTRITAMENTE em formato JSON puro, sem markdown nem explicações adicionais, no seguinte formato:
{"proteinG": 28, "fiberG": 4, "kcal": 350}`;

      const resp = await requestLLM(cfg, prompt, 200);
      const jsonStr = resp.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          description: clean,
          proteinG: Math.max(0, Math.round(Number(parsed.proteinG) || 0)),
          fiberG: Math.max(0, Math.round(Number(parsed.fiberG) || 0)),
          kcal: Math.max(0, Math.round(Number(parsed.kcal) || 0)),
          analyzedByAI: true,
        };
      }
    } catch (e) {
      console.warn('Falha na estimativa por IA, usando fallback heurístico:', e);
    }
  }

  // Fallback heurístico inteligente baseado no vocabulário de alimentos comuns
  const lower = clean.toLowerCase();
  let prot = 0;
  let fiber = 0;
  let cal = 0;

  // Proteínas
  if (lower.includes('ovo') || lower.includes('omelete')) {
    const qty = lower.includes('2') ? 2 : lower.includes('3') ? 3 : 1;
    prot += qty * 6;
    cal += qty * 75;
  }
  if (lower.includes('frango') || lower.includes('galinha')) {
    prot += 30;
    cal += 165;
  }
  if (lower.includes('carne') || lower.includes('bife') || lower.includes('hambúrguer') || lower.includes('patinho')) {
    prot += 32;
    cal += 210;
  }
  if (lower.includes('peixe') || lower.includes('tilapia') || lower.includes('tilápia') || lower.includes('salmão')) {
    prot += 26;
    cal += 180;
  }
  if (lower.includes('whey') || lower.includes('proteína') || lower.includes('shake')) {
    prot += 24;
    cal += 120;
  }
  if (lower.includes('iogurte')) {
    prot += 10;
    cal += 110;
  }
  if (lower.includes('queijo') || lower.includes('cottage') || lower.includes('ricota')) {
    prot += 12;
    cal += 140;
  }
  if (lower.includes('tofu')) {
    prot += 15;
    cal += 120;
  }

  // Fibras e carboidratos
  if (lower.includes('feijão') || lower.includes('lentilha') || lower.includes('grão de bico')) {
    prot += 7;
    fiber += 6;
    cal += 110;
  }
  if (lower.includes('arroz')) {
    prot += 3;
    fiber += 1.5;
    cal += 130;
  }
  if (lower.includes('batata') || lower.includes('mandioca') || lower.includes('aipim')) {
    prot += 2;
    fiber += 3;
    cal += 140;
  }
  if (lower.includes('aveia')) {
    prot += 4;
    fiber += 4;
    cal += 110;
  }
  if (lower.includes('pão') || lower.includes('torrada')) {
    prot += 4;
    fiber += 2;
    cal += 130;
  }
  if (lower.includes('salada') || lower.includes('alface') || lower.includes('tomate') || lower.includes('legume') || lower.includes('brócolis') || lower.includes('couve')) {
    prot += 2;
    fiber += 4;
    cal += 50;
  }
  if (lower.includes('banana') || lower.includes('maçã') || lower.includes('fruta') || lower.includes('laranja') || lower.includes('mamão')) {
    prot += 1;
    fiber += 3;
    cal += 90;
  }
  if (lower.includes('chia') || lower.includes('linhaça') || lower.includes('castanha')) {
    prot += 3;
    fiber += 4;
    cal += 90;
  }

  // Se nenhum alimento conhecido foi detectado mas o usuário digitou algo
  if (prot === 0 && fiber === 0 && cal === 0) {
    prot = 10;
    fiber = 2;
    cal = 150;
  }

  return {
    description: clean,
    proteinG: Math.round(prot),
    fiberG: Math.round(fiber),
    kcal: Math.round(cal),
    analyzedByAI: false,
  };
}

export type { FoodItem };
