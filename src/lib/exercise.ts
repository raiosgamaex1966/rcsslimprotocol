import type { LLMConfig } from './llm';
import { requestLLM, weekKey } from './llm';
import type { PhysicalAssessment, Profile, Treatment } from './types';
import { findMedication } from '../data/medications';
import { doseAtDate, treatmentWeek } from './schedule';

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  instructions: string;
  adaptation?: string;
}

export interface WorkoutSession {
  id: string;
  dayIndex: number;
  dayName: string;
  title: string;
  focus: string;
  durationMinutes: number;
  intensity: string;
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  sessions: WorkoutSession[];
  weeklyMinutes: number;
  source: 'adaptativo' | 'ia';
  safetyNote: string;
}

interface ExerciseTemplate extends PlannedExercise {
  tags: string[];
  avoid: string[];
}

const EXERCISES: ExerciseTemplate[] = [
  { name: 'Tai Chi sentado: abrir e fechar', sets: 2, reps: '6 ciclos lentos', restSeconds: 30, instructions: 'Sentado em cadeira firme, abra os braços ao inspirar e aproxime ao expirar, sem prender a respiração.', adaptation: 'Mantenha os pés apoiados e reduza a amplitude dos ombros.', tags: ['tai_chi', 'mobilidade', 'equilibrio', 'cadeira'], avoid: [] },
  { name: 'Tai Chi sentado: empurrar as nuvens', sets: 2, reps: '1 minuto', restSeconds: 30, instructions: 'Mova as mãos lentamente de um lado para o outro, acompanhando com os olhos e mantendo o tronco confortável.', adaptation: 'Faça um braço por vez se houver limitação no ombro.', tags: ['tai_chi', 'mobilidade', 'equilibrio', 'cadeira'], avoid: [] },
  { name: 'Marcha sentada', sets: 3, reps: '45 segundos', restSeconds: 30, instructions: 'Sentado próximo ao encosto, eleve um pé de cada vez sem gerar dor no joelho.', adaptation: 'Eleve poucos centímetros e use ritmo lento.', tags: ['cardio', 'pernas', 'cadeira'], avoid: [] },
  { name: 'Remada sentada com toalha', sets: 2, reps: '10 a 12', restSeconds: 45, instructions: 'Sentado, segure a toalha à frente e puxe as mãos para os lados, aproximando as escápulas.', tags: ['superior', 'cadeira'], avoid: ['ombro_agudo'] },
  { name: 'Elevação de calcanhares sentado', sets: 3, reps: '12 a 15', restSeconds: 30, instructions: 'Com os pés apoiados, eleve os calcanhares e retorne lentamente.', tags: ['pernas', 'cadeira'], avoid: [] },
  { name: 'Sentar e levantar da cadeira', sets: 2, reps: '8 a 12', restSeconds: 60, instructions: 'Use uma cadeira firme, pés apoiados e movimento controlado.', adaptation: 'Use apoio das mãos se necessário.', tags: ['pernas', 'iniciante', 'casa'], avoid: ['joelho_agudo'] },
  { name: 'Ponte de glúteos', sets: 3, reps: '10 a 15', restSeconds: 60, instructions: 'Deite, flexione os joelhos e eleve o quadril sem arquear a lombar.', tags: ['pernas', 'gluteos', 'casa'], avoid: ['coluna_aguda'] },
  { name: 'Extensão de joelho sentado', sets: 2, reps: '10 por lado', restSeconds: 45, instructions: 'Estenda uma perna por vez, sem travar o joelho.', adaptation: 'Amplitude sem dor.', tags: ['pernas', 'joelho', 'casa'], avoid: [] },
  { name: 'Abdução de quadril em pé', sets: 2, reps: '10 por lado', restSeconds: 45, instructions: 'Segure em apoio e leve a perna para o lado sem inclinar o tronco.', tags: ['pernas', 'equilibrio', 'casa'], avoid: [] },
  { name: 'Elevação de panturrilhas', sets: 3, reps: '12 a 15', restSeconds: 45, instructions: 'Suba na ponta dos pés com apoio próximo.', tags: ['pernas', 'equilibrio', 'casa'], avoid: [] },
  { name: 'Remada com elástico', sets: 3, reps: '10 a 15', restSeconds: 60, instructions: 'Puxe o elástico aproximando as escápulas, sem elevar os ombros.', tags: ['superior', 'elastico', 'casa'], avoid: ['ombro_agudo'] },
  { name: 'Flexão na parede', sets: 3, reps: '8 a 12', restSeconds: 60, instructions: 'Corpo alinhado, mãos na parede e cotovelos confortáveis.', tags: ['superior', 'iniciante', 'casa'], avoid: ['ombro_agudo', 'punho'] },
  { name: 'Rosca com garrafas', sets: 2, reps: '10 a 15', restSeconds: 45, instructions: 'Cotovelos junto ao corpo; use garrafas leves.', tags: ['superior', 'casa'], avoid: ['cotovelo'] },
  { name: 'Bird-dog apoiado', sets: 2, reps: '8 por lado', restSeconds: 45, instructions: 'Em quatro apoios, estenda braço e perna opostos mantendo o tronco estável.', adaptation: 'Movimente só braços ou só pernas.', tags: ['core', 'equilibrio', 'casa'], avoid: ['joelho_agudo', 'punho'] },
  { name: 'Dead bug', sets: 2, reps: '8 por lado', restSeconds: 45, instructions: 'Mantenha a lombar confortável e mova braços e pernas lentamente.', tags: ['core', 'casa'], avoid: ['coluna_aguda'] },
  { name: 'Marcha parada com apoio', sets: 3, reps: '1 minuto', restSeconds: 45, instructions: 'Marche em ritmo confortável ao lado de apoio firme.', tags: ['cardio', 'iniciante', 'casa'], avoid: [] },
  { name: 'Caminhada confortável', sets: 1, reps: '10 a 30 minutos', restSeconds: 0, instructions: 'Ritmo em que ainda seja possível conversar frases completas.', adaptation: 'Divida em blocos de 5 a 10 minutos.', tags: ['cardio', 'ar_livre'], avoid: [] },
  { name: 'Mobilidade de tornozelos e quadris', sets: 1, reps: '5 minutos', restSeconds: 0, instructions: 'Movimentos lentos e sem dor, sem forçar amplitudes.', tags: ['mobilidade', 'casa'], avoid: [] },
  { name: 'Alongamento leve e respiração', sets: 1, reps: '5 minutos', restSeconds: 0, instructions: 'Respire sem prender o ar e mantenha cada posição confortável.', tags: ['mobilidade', 'casa'], avoid: [] },
];

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

function hasLimitation(a: PhysicalAssessment, key: string): boolean {
  return a.limitations.includes(key);
}

function safePool(a: PhysicalAssessment, focus: string): ExerciseTemplate[] {
  const blocked = new Set<string>();
  if (hasLimitation(a, 'joelho')) blocked.add('joelho_agudo');
  if (hasLimitation(a, 'coluna')) blocked.add('coluna_aguda');
  if (hasLimitation(a, 'ombro')) blocked.add('ombro_agudo');
  if (hasLimitation(a, 'punho')) blocked.add('punho');
  return EXERCISES.filter((e) => e.tags.includes(focus) && !e.avoid.some((x) => blocked.has(x)));
}

function pick(pool: ExerciseTemplate[], count: number, offset: number): PlannedExercise[] {
  if (!pool.length) return [];
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => {
    const { tags: _tags, avoid: _avoid, ...exercise } = pool[(i + offset) % pool.length];
    return exercise;
  });
}

/** Plano conservador usado quando a LLM não está configurada. */
export function buildAdaptiveWorkout(a: PhysicalAssessment, weeklyLossPercent = 0): WorkoutPlan {
  const days = Math.max(2, Math.min(5, a.daysPerWeek));
  const rapidLoss = weeklyLossPercent <= -0.75;
  const duration = Math.max(15, Math.min(60, rapidLoss ? Math.round(a.minutesPerSession * 0.8) : a.minutesPerSession));
  const beginner = rapidLoss || a.activityLevel === 'sedentario' || a.experience === 'iniciante';
  const sessions: WorkoutSession[] = [];
  const chairFocused = hasLimitation(a, 'joelho') || hasLimitation(a, 'equilibrio') || a.equipment.includes('cadeira');

  for (let i = 0; i < days; i++) {
    const strengthDay = i % 2 === 0;
    const focus = strengthDay ? 'Força de corpo inteiro' : 'Caminhada, mobilidade e equilíbrio';
    const chairExercises = chairFocused ? pick(safePool(a, 'cadeira'), strengthDay ? 3 : 2, i) : [];
    const exercises = strengthDay
      ? [
          ...chairExercises,
          ...pick(safePool(a, 'pernas'), beginner ? 2 : 3, i),
          ...pick(safePool(a, 'superior'), 2, i),
          ...pick(safePool(a, 'core'), 1, i),
          ...pick(safePool(a, 'mobilidade'), 1, i),
        ]
      : [...chairExercises, ...pick(safePool(a, 'tai_chi'), chairFocused ? 2 : 1, i), ...pick(safePool(a, 'cardio'), 1, i), ...pick(safePool(a, 'mobilidade'), 1, i)];

    sessions.push({
      id: `adapt-${i}`,
      dayIndex: Math.round((i * 6) / Math.max(1, days - 1)),
      dayName: DAYS[Math.round((i * 6) / Math.max(1, days - 1))],
      title: `Sessão ${i + 1}`,
      focus,
      durationMinutes: duration,
      intensity: beginner ? 'Leve: esforço percebido 3 a 4 de 10' : 'Moderada: esforço percebido 5 a 6 de 10',
      exercises,
    });
  }

  return {
    sessions,
    weeklyMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    source: 'adaptativo',
    safetyNote: `${rapidLoss ? 'Como a perda de peso recente está acelerada, o volume foi reduzido nesta semana. ' : ''}Interrompa em caso de dor, tontura, falta de ar incomum, dor no peito ou mal-estar. Não treine em jejum se houver orientação contrária da equipe de saúde.`,
  };
}

export const DEFAULT_EXERCISE_PROMPT = `Você é um profissional de exercício físico. Crie um plano semanal CONSERVADOR para preservar massa muscular durante emagrecimento. A triagem abaixo é autorrelatada e não substitui avaliação médica ou de fisioterapeuta.

Paciente: {contexto}
Avaliação funcional: {avaliacao}

REGRAS DE SEGURANÇA:
1. Respeite rigorosamente limitações e local/equipamentos disponíveis.
2. Para sedentários, comece leve, com progressão gradual e pelo menos 2 sessões de força não consecutivas.
3. Não prescreva saltos, corrida, cargas máximas, falha muscular ou exercícios de alto impacto.
4. Para joelho doloroso, evite agachamento profundo, avanço, salto e corrida; use opções sem dor e amplitude confortável.
5. Se houver sintomas de alerta ou ausência de liberação quando necessária, responda com sessões vazias.
6. Inclua aquecimento, força, mobilidade e caminhada conforme tolerado.
7. Responda APENAS JSON válido:
{"sessoes":[{"id":"s1","dia_indice":0,"dia_nome":"Segunda-feira","titulo":"Força A","foco":"Corpo inteiro","duracao_min":30,"intensidade":"Leve, 3/10","exercicios":[{"nome":"Sentar e levantar","series":2,"repeticoes":"8 a 10","descanso_seg":60,"instrucoes":"Movimento controlado","adaptacao":"Use apoio das mãos"}]}],"nota_seguranca":"..."}
Use exatamente a quantidade de dias disponível informada pelo paciente.`;

function assessmentText(a: PhysicalAssessment): string {
  return `Nível: ${a.activityLevel}; atividade atual: ${a.currentActivities || 'nenhuma'}; experiência: ${a.experience}; disponibilidade: ${a.daysPerWeek} dias/semana, ${a.minutesPerSession} min/sessão; local: ${a.location}; equipamentos: ${a.equipment.join(', ') || 'nenhum'}; limitações: ${a.limitations.join(', ') || 'nenhuma'}; detalhes: ${a.limitationDetails || 'nenhum'}; objetivos: ${a.goals.join(', ') || 'saúde'}; condições médicas: ${a.medicalConditions || 'não informadas'}; sintomas de alerta: ${a.hasWarningSymptoms ? 'SIM' : 'não'}; liberação profissional: ${a.professionalClearance ? 'sim' : 'não'}.`;
}

function parsePlan(text: string): WorkoutPlan {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const obj = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)) as Record<string, unknown>;
  const rawSessions = Array.isArray(obj.sessoes) ? obj.sessoes : [];
  const sessions: WorkoutSession[] = rawSessions.slice(0, 6).map((raw, index) => {
    const s = raw as Record<string, unknown>;
    const rawExercises = Array.isArray(s.exercicios) ? s.exercicios : [];
    return {
      id: String(s.id ?? `ia-${index}`),
      dayIndex: Math.min(6, Math.max(0, Number(s.dia_indice ?? index))),
      dayName: String(s.dia_nome ?? DAYS[index]),
      title: String(s.titulo ?? `Sessão ${index + 1}`),
      focus: String(s.foco ?? 'Corpo inteiro'),
      durationMinutes: Math.min(90, Math.max(10, Number(s.duracao_min ?? 30))),
      intensity: String(s.intensidade ?? 'Leve a moderada'),
      exercises: rawExercises.slice(0, 10).map((rawExercise) => {
        const e = rawExercise as Record<string, unknown>;
        return {
          name: String(e.nome ?? 'Exercício'),
          sets: Math.min(5, Math.max(1, Number(e.series ?? 2))),
          reps: String(e.repeticoes ?? '8 a 12'),
          restSeconds: Math.min(180, Math.max(0, Number(e.descanso_seg ?? 60))),
          instructions: String(e.instrucoes ?? 'Movimento lento e sem dor.'),
          adaptation: e.adaptacao ? String(e.adaptacao) : undefined,
        };
      }),
    };
  });
  return {
    sessions,
    weeklyMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    source: 'ia',
    safetyNote: String(obj.nota_seguranca ?? 'Interrompa se houver dor ou mal-estar e procure orientação profissional.'),
  };
}

export async function generateAIWorkout(cfg: LLMConfig, profile: Profile, treatment: Treatment | null, weightKg: number, assessment: PhysicalAssessment, weeklyLossPercent = 0): Promise<WorkoutPlan> {
  const med = treatment ? findMedication(treatment.medId) : undefined;
  const context = `Idade: ${profile.birthDate}; sexo: ${profile.sex}; peso atual: ${weightKg} kg; variação semanal recente: ${weeklyLossPercent}% do peso; altura: ${profile.heightCm ?? 'não informada'} cm; tratamento: ${med?.brand ?? 'não informado'}; dose atual: ${treatment ? doseAtDate(treatment) : 0} mg; semana: ${treatment ? treatmentWeek(treatment) : 0}.`;
  const template = cfg.exercisePrompt || DEFAULT_EXERCISE_PROMPT;
  const prompt = template.replace('{contexto}', context).replace('{avaliacao}', assessmentText(assessment));
  const response = await requestLLM(cfg, prompt, 3500);
  return parsePlan(response);
}

function assessmentSignature(a: PhysicalAssessment, weightKg: number): string {
  return `${Math.round(weightKg * 10)}-${a.updatedAt.slice(0, 10)}-${a.activityLevel}-${a.limitations.join('.')}`;
}

export function getCachedWorkout(userId: string, a: PhysicalAssessment, weightKg: number): WorkoutPlan | null {
  try {
    const raw = localStorage.getItem(`minhacaneta_workout_${userId}_${weekKey()}_${assessmentSignature(a, weightKg)}`);
    return raw ? (JSON.parse(raw) as WorkoutPlan) : null;
  } catch {
    return null;
  }
}

export function cacheWorkout(userId: string, a: PhysicalAssessment, weightKg: number, plan: WorkoutPlan): void {
  localStorage.setItem(`minhacaneta_workout_${userId}_${weekKey()}_${assessmentSignature(a, weightKg)}`, JSON.stringify(plan));
}