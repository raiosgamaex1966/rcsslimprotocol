import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Film,
  HeartPulse,
  LoaderCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  Footprints,
} from 'lucide-react';
import { Badge, Button, Card, Field, SectionTitle, SelectInput, TextInput } from './ui';
import type { PatientData, PhysicalAssessment } from '../lib/types';
import {
  buildAdaptiveWorkout,
  cacheWorkout,
  generateAIWorkout,
  getCachedWorkout,
  type WorkoutPlan,
} from '../lib/exercise';
import { getLLMConfig } from '../lib/llm';
import { weeklyWeightTrend } from '../lib/schedule';
import { cn } from '../utils/cn';
import type { ExerciseVideo } from '../lib/types';
import { loadExerciseVideos, recommendedVideos, videoEmbedUrl } from '../lib/videoLibrary';

interface Props {
  userId: string;
  data: PatientData;
  update: (updater: (prev: PatientData) => PatientData) => void;
}

const LIMITATIONS = [
  ['joelho', 'Joelhos'],
  ['coluna', 'Coluna/lombar'],
  ['ombro', 'Ombros'],
  ['quadril', 'Quadril'],
  ['punho', 'Punhos/mãos'],
  ['equilibrio', 'Equilíbrio'],
  ['respiratoria', 'Respiração'],
];

const EQUIPMENT = [
  ['nenhum', 'Sem equipamentos'],
  ['elastico', 'Faixa elástica'],
  ['halteres', 'Halteres'],
  ['cadeira', 'Cadeira firme'],
  ['academia', 'Aparelhos de academia'],
];

const GOALS = [
  ['massa_magra', 'Preservar massa muscular'],
  ['forca', 'Ganhar força'],
  ['mobilidade', 'Melhorar mobilidade'],
  ['condicionamento', 'Melhorar condicionamento'],
  ['equilibrio', 'Melhorar equilíbrio'],
];

function defaultAssessment(): PhysicalAssessment {
  return {
    activityLevel: 'sedentario',
    currentActivities: '',
    experience: 'iniciante',
    daysPerWeek: 3,
    minutesPerSession: 30,
    location: 'casa',
    equipment: ['nenhum', 'cadeira'],
    limitations: [],
    limitationDetails: '',
    goals: ['massa_magra', 'forca'],
    medicalConditions: '',
    hasWarningSymptoms: false,
    professionalClearance: false,
    updatedAt: new Date().toISOString(),
  };
}

export default function ExerciseTab({ userId, data, update }: Props) {
  const saved = data.physicalAssessment;
  const [editing, setEditing] = useState(!saved);
  const [assessment, setAssessment] = useState<PhysicalAssessment>(saved ?? defaultAssessment());
  const currentWeight = data.weights.at(-1)?.kg ?? data.profile.startWeightKg ?? 0;
  const weightTrend = weeklyWeightTrend(data.weights);
  const [plan, setPlan] = useState<WorkoutPlan | null>(() =>
    saved && currentWeight ? getCachedWorkout(userId, saved, currentWeight) : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const llm = getLLMConfig();
  const aiReady = Boolean(llm?.enabled && llm.apiKey && llm.model);

  useEffect(() => {
    loadExerciseVideos().then(setVideos).catch(() => setVideos([]));
  }, []);

  const suggestedVideos = useMemo(
    () => recommendedVideos(videos, saved?.limitations ?? [], saved?.activityLevel ?? 'sedentario', userId),
    [videos, saved?.limitations, saved?.activityLevel, userId],
  );

  const trainerPlan = data.workoutOverride;
  const effectivePlan: WorkoutPlan | null = useMemo(
    () => trainerPlan ?? plan ?? (saved && !saved.hasWarningSymptoms ? buildAdaptiveWorkout(saved, weightTrend?.percentPerWeek) : null),
    [trainerPlan, plan, saved, weightTrend?.percentPerWeek],
  );
  const logs = data.workoutLogs ?? [];
  const completed = effectivePlan?.sessions.filter((s) => logs.some((l) => l.sessionId === s.id && l.completed)).length ?? 0;

  function toggleArray(field: 'equipment' | 'limitations' | 'goals', value: string) {
    setAssessment((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((x) => x !== value) : [...prev[field], value],
    }));
  }

  function saveAssessment() {
    const next = { ...assessment, updatedAt: new Date().toISOString() };
    update((prev) => ({ ...prev, physicalAssessment: next, workoutLogs: [] }));
    setAssessment(next);
    setPlan(null);
    setEditing(false);
  }

  async function generatePlan() {
    if (!saved || !currentWeight) return;
    if (saved.hasWarningSymptoms) {
      setError('O plano automático foi bloqueado por sintomas de alerta. Procure avaliação profissional antes de iniciar exercícios.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = aiReady && llm
        ? await generateAIWorkout(llm, data.profile, data.treatment, currentWeight, saved, weightTrend?.percentPerWeek)
        : buildAdaptiveWorkout(saved, weightTrend?.percentPerWeek);
      cacheWorkout(userId, saved, currentWeight, next);
      setPlan(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o plano com IA.');
      setPlan(buildAdaptiveWorkout(saved, weightTrend?.percentPerWeek));
    } finally {
      setBusy(false);
    }
  }

  function toggleSession(sessionId: string) {
    const today = new Date().toISOString().slice(0, 10);
    update((prev) => {
      const old = prev.workoutLogs ?? [];
      const exists = old.some((l) => l.sessionId === sessionId && l.completed);
      return {
        ...prev,
        workoutLogs: exists
          ? old.filter((l) => l.sessionId !== sessionId)
          : [...old.filter((l) => l.sessionId !== sessionId), { date: today, sessionId, completed: true }],
      };
    });
  }

  function findExerciseVideo(exerciseName: string): ExerciseVideo | undefined {
    const normalized = exerciseName.toLocaleLowerCase('pt-BR');
    return suggestedVideos.find((video) =>
      video.exerciseNames.some((name) => {
        const candidate = name.toLocaleLowerCase('pt-BR');
        return normalized.includes(candidate) || candidate.includes(normalized);
      }),
    );
  }

  function showExerciseVideo(videoId: string) {
    setOpenVideo(videoId);
    window.setTimeout(() => document.getElementById(`video-${videoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-7">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/25 blur-[90px]" />
        <div className="relative max-w-3xl">
          <Badge className="bg-white/10 text-cyan-200">
            <Dumbbell className="h-3 w-3" /> Movimento para preservar músculos
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Plano de atividade adaptado ao seu corpo</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
            O plano combina força, caminhada e mobilidade conforme seu nível, tempo disponível e limitações. Ao registrar um novo
            peso ou atualizar a avaliação, as metas e o plano semanal podem ser recalculados.
          </p>
          {saved && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-100">{saved.daysPerWeek} dias/semana</Badge>
              <Badge className="bg-white/10 text-slate-200">{saved.minutesPerSession} min/sessão</Badge>
              <Badge className="bg-white/10 text-slate-200">{saved.activityLevel}</Badge>
              <Badge className="bg-white/10 text-slate-200">peso de referência: {currentWeight.toLocaleString('pt-BR')} kg</Badge>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <AssessmentForm assessment={assessment} setAssessment={setAssessment} toggleArray={toggleArray} onSave={saveAssessment} onCancel={saved ? () => setEditing(false) : undefined} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Seu plano semanal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {effectivePlan ? `${completed} de ${effectivePlan.sessions.length} sessões concluídas` : 'Gere o plano após a avaliação.'}
              </p>
              {trainerPlan && (
                <Badge className="mt-1.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                  <Dumbbell className="h-3 w-3" /> Plano personalizado pelo seu personal
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Atualizar avaliação
              </Button>
              {!trainerPlan && (
                <Button onClick={generatePlan} disabled={busy || saved?.hasWarningSymptoms}>
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : aiReady ? <Sparkles className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                  {busy ? 'Montando plano...' : effectivePlan ? 'Recalcular plano' : 'Montar meu plano'}
                </Button>
              )}
            </div>
          </div>

          {saved?.hasWarningSymptoms && (
            <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-extrabold">Plano automático bloqueado por segurança</p>
                <p className="mt-1 text-xs leading-relaxed">Dor no peito, desmaio, falta de ar desproporcional ou palpitação exigem avaliação profissional antes de iniciar ou retomar exercícios.</p>
              </div>
            </div>
          )}

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</div>}

          {weightTrend && weightTrend.percentPerWeek <= -0.75 && (
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">
                <b>Perda de peso acelerada:</b> aproximadamente {Math.abs(weightTrend.kgPerWeek).toLocaleString('pt-BR')} kg por
                semana no último intervalo. O plano reduziu o volume e priorizou força leve. Procure acompanhamento para avaliar
                ingestão, hidratação e massa muscular.
              </p>
            </div>
          )}

          {effectivePlan && !saved?.hasWarningSymptoms && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {effectivePlan.sessions.map((session) => {
                  const done = logs.some((l) => l.sessionId === session.id && l.completed);
                  return (
                    <Card key={session.id} className={cn('overflow-hidden transition-all', done && 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-500/40 dark:bg-emerald-500/10')}>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">{session.dayName}</p>
                          <h4 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">{session.title}</h4>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.focus} · {session.intensity}</p>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Clock3 className="h-3 w-3" /> {session.durationMinutes} min</Badge>
                      </div>
                      <div className="space-y-3 p-5">
                        {session.exercises.map((exercise, index) => {
                          const tutorial = findExerciseVideo(exercise.name);
                          return (
                          <div key={`${exercise.name}-${index}`} className="flex gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-50 text-[10px] font-extrabold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-1">
                                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{exercise.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{exercise.sets} séries · {exercise.reps} · pausa {exercise.restSeconds}s</p>
                              </div>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{exercise.instructions}</p>
                              {exercise.adaptation && <p className="mt-0.5 text-[10px] font-semibold text-amber-700">Adaptação: {exercise.adaptation}</p>}
                              {tutorial && <button onClick={() => showExerciseVideo(tutorial.id)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-cyan-700 hover:underline"><Film className="h-3 w-3" /> Ver demonstração do especialista</button>}
                            </div>
                          </div>
                          );
                        })}
                        <button onClick={() => toggleSession(session.id)} className={cn('mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-extrabold transition-all', done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/50')}>
                          <CheckCircle2 className="h-4 w-4" /> {done ? 'Sessão concluída' : 'Marcar sessão concluída'}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-relaxed"><b>Segurança:</b> {effectivePlan.safetyNote} Este plano é educativo e deve ser validado por médico, fisioterapeuta ou profissional de educação física, especialmente se houver dor ou doença crônica.</p>
              </div>
            </>
          )}

          <section>
            <SectionTitle
              icon={<Film className="h-4 w-4 text-cyan-600" />}
              title="Vídeos para acompanhar"
              subtitle="Demonstrações de especialistas (aba Exercícios) recomendadas para sua avaliação, limitações e enviadas pelo seu personal"
            />
            {suggestedVideos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                Nenhum vídeo disponível ainda. Assim que o Super Admin ou seu personal publicar demonstrações, elas aparecem aqui
                automaticamente.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggestedVideos.map((video) => {
                  const embed = videoEmbedUrl(video.videoUrl);
                  const selected = openVideo === video.id;
                  const assignedToMe = video.assignedPatientIds?.includes(userId);
                  return (
                    <Card key={video.id} className={cn('overflow-hidden', assignedToMe && 'border-cyan-400 ring-2 ring-cyan-400/30')}>
                      <div id={`video-${video.id}`} />
                      {selected ? (
                        <div className="relative aspect-video w-full bg-slate-950">
                          {embed ? (
                            <iframe
                              src={embed}
                              title={video.title}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video src={video.videoUrl} controls autoPlay playsInline className="h-full w-full bg-black" />
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setOpenVideo(video.id)}
                          className="group relative block aspect-video w-full overflow-hidden bg-slate-950 text-white"
                        >
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90" />
                          ) : (
                            <div className="bg-grid absolute inset-0" />
                          )}
                          <span className="absolute inset-0 grid place-items-center">
                            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-cyan-700 shadow-xl transition-transform group-hover:scale-110">
                              <Film className="h-5 w-5" />
                            </span>
                          </span>
                          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold">
                            {video.durationMinutes} min
                          </span>
                          {assignedToMe && (
                            <span className="absolute left-2 top-2 rounded-full bg-cyan-500 px-2 py-1 text-[9px] font-extrabold">
                              Enviado pelo seu personal
                            </span>
                          )}
                        </button>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{video.title}</p>
                            <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                              {video.specialistName}
                              {video.specialistCredential ? ` · ${video.specialistCredential}` : ''}
                            </p>
                          </div>
                          <Badge className="h-fit bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                            {video.category.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{video.description}</p>
                        {selected && (
                          <button
                            onClick={() => setOpenVideo(null)}
                            className="mt-3 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                          >
                            Fechar vídeo ▲
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {data.professionalNotes?.personal && (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-950">
              <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                Observação do seu personal · {new Date(data.professionalNotes.personal.updatedAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-cyan-900 dark:text-cyan-100">{data.professionalNotes.personal.text}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssessmentForm({ assessment, setAssessment, toggleArray, onSave, onCancel }: {
  assessment: PhysicalAssessment;
  setAssessment: React.Dispatch<React.SetStateAction<PhysicalAssessment>>;
  toggleArray: (field: 'equipment' | 'limitations' | 'goals', value: string) => void;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <SectionTitle icon={<HeartPulse className="h-4 w-4 text-cyan-600" />} title="Avaliação de movimento" subtitle="Responda com cuidado para adaptar o plano e evitar exercícios inadequados" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nível atual de atividade" required>
          <SelectInput value={assessment.activityLevel} onChange={(e) => setAssessment((p) => ({ ...p, activityLevel: e.target.value as PhysicalAssessment['activityLevel'] }))}>
            <option value="sedentario">Sedentário</option><option value="leve">Levemente ativo</option><option value="moderado">Moderadamente ativo</option><option value="ativo">Ativo</option>
          </SelectInput>
        </Field>
        <Field label="Experiência com exercícios">
          <SelectInput value={assessment.experience} onChange={(e) => setAssessment((p) => ({ ...p, experience: e.target.value as PhysicalAssessment['experience'] }))}>
            <option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option>
          </SelectInput>
        </Field>
        <Field label="Local preferido">
          <SelectInput value={assessment.location} onChange={(e) => setAssessment((p) => ({ ...p, location: e.target.value as PhysicalAssessment['location'] }))}>
            <option value="casa">Em casa</option><option value="academia">Academia</option><option value="ar_livre">Ao ar livre</option>
          </SelectInput>
        </Field>
        <Field label="Dias disponíveis por semana">
          <TextInput type="number" min="2" max="5" value={assessment.daysPerWeek} onChange={(e) => setAssessment((p) => ({ ...p, daysPerWeek: Number(e.target.value) }))} />
        </Field>
        <Field label="Minutos por sessão">
          <TextInput type="number" min="15" max="60" step="5" value={assessment.minutesPerSession} onChange={(e) => setAssessment((p) => ({ ...p, minutesPerSession: Number(e.target.value) }))} />
        </Field>
        <Field label="Atividades que já pratica">
          <TextInput placeholder="Ex.: caminhada 2x/semana" value={assessment.currentActivities} onChange={(e) => setAssessment((p) => ({ ...p, currentActivities: e.target.value }))} />
        </Field>
      </div>

      <ChoiceGroup title="Equipamentos disponíveis" options={EQUIPMENT} selected={assessment.equipment} onToggle={(v) => toggleArray('equipment', v)} />
      <ChoiceGroup title="Dores ou limitações" options={LIMITATIONS} selected={assessment.limitations} onToggle={(v) => toggleArray('limitations', v)} warning />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Detalhes das limitações" hint="local, intensidade e movimentos que doem">
          <TextInput placeholder="Ex.: dor no joelho direito ao agachar" value={assessment.limitationDetails} onChange={(e) => setAssessment((p) => ({ ...p, limitationDetails: e.target.value }))} />
        </Field>
        <Field label="Condições médicas relevantes">
          <TextInput placeholder="Ex.: hipertensão controlada" value={assessment.medicalConditions} onChange={(e) => setAssessment((p) => ({ ...p, medicalConditions: e.target.value }))} />
        </Field>
      </div>
      <ChoiceGroup title="Objetivos" options={GOALS} selected={assessment.goals} onToggle={(v) => toggleArray('goals', v)} />

      <div className="mt-5 space-y-2.5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
          <input type="checkbox" checked={assessment.hasWarningSymptoms} onChange={(e) => setAssessment((p) => ({ ...p, hasWarningSymptoms: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-rose-600" />
          <span className="text-xs leading-relaxed text-rose-800 dark:text-rose-200"><b>Tenho ou tive recentemente sintoma de alerta:</b> dor no peito, desmaio, palpitação importante ou falta de ar desproporcional ao esforço.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <input type="checkbox" checked={assessment.professionalClearance} onChange={(e) => setAssessment((p) => ({ ...p, professionalClearance: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-brand-600" />
          <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">Já conversei com médico ou profissional responsável sobre iniciar atividade física.</span>
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button onClick={onSave}><Check className="h-4 w-4" /> Salvar avaliação e adaptar plano</Button>
      </div>
    </Card>
  );
}

function ChoiceGroup({ title, options, selected, onToggle, warning = false }: { title: string; options: string[][]; selected: string[]; onToggle: (value: string) => void; warning?: boolean }) {
  return (
    <div className="mt-5">
      <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-700 dark:text-slate-200">{warning ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <Footprints className="h-4 w-4 text-cyan-600" />}{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([value, label]) => <button key={value} type="button" onClick={() => onToggle(value)} className={cn('rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all', selected.includes(value) ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300')}>{selected.includes(value) && <Check className="mr-1 inline h-3 w-3" />}{label}</button>)}
      </div>
    </div>
  );
}