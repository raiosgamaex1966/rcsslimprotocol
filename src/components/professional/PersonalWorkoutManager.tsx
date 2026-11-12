import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Film,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Card, Field, SectionTitle, TextInput } from '../ui';
import {
  buildAdaptiveWorkout,
  EXERCISE_CATALOG,
  type PlannedExercise,
  type WorkoutSession,
} from '../../lib/exercise';
import { weeklyWeightTrend } from '../../lib/schedule';
import type { ExerciseVideo, PatientData } from '../../lib/types';
import { matchVideoForExercise } from '../../lib/videoLibrary';
import { cn } from '../../utils/cn';

const DAY_NAMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

interface EditableExercise extends PlannedExercise {
  _key: string;
}

interface EditableSession extends Omit<WorkoutSession, 'exercises'> {
  exercises: EditableExercise[];
}

function makeKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toEditableSessions(sessions: WorkoutSession[]): EditableSession[] {
  return sessions.map((s) => ({
    ...s,
    exercises: s.exercises.map((ex) => ({ ...ex, _key: makeKey() })),
  }));
}

interface Props {
  patientId: string;
  data: PatientData;
  professionalName: string;
  videos: ExerciseVideo[];
  update: (u: (p: PatientData) => PatientData) => void;
}

export default function PersonalWorkoutManager({
  patientId,
  data,
  professionalName,
  videos,
  update,
}: Props) {
  const assessment = data.physicalAssessment;
  const weightTrend = useMemo(() => weeklyWeightTrend(data.weights), [data.weights]);
  const adaptivePlan = useMemo(
    () =>
      assessment && !assessment.hasWarningSymptoms
        ? buildAdaptiveWorkout(assessment, weightTrend?.percentPerWeek)
        : null,
    [assessment, weightTrend?.percentPerWeek],
  );

  const initialSessions = useMemo(
    () => toEditableSessions(data.workoutOverride?.sessions ?? adaptivePlan?.sessions ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [sessions, setSessions] = useState<EditableSession[]>(initialSessions);
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [editingExerciseKey, setEditingExerciseKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const isCustomActive = Boolean(data.workoutOverride);

  function markDirty() {
    setDirty(true);
    setStatus(null);
  }

  function addSession() {
    const newId = `custom-${makeKey()}`;
    const dayIndex = sessions.length % 7;
    setSessions((prev) => [
      ...prev,
      {
        id: newId,
        dayIndex,
        dayName: DAY_NAMES[dayIndex],
        title: `Sessão ${prev.length + 1}`,
        focus: 'Força e mobilidade',
        durationMinutes: 30,
        intensity: 'Leve a moderada',
        exercises: [],
      },
    ]);
    markDirty();
  }

  function removeSession(sessionId: string) {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    markDirty();
  }

  function patchSession(sessionId: string, patch: Partial<EditableSession>) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const nextDayIndex = patch.dayIndex ?? s.dayIndex;
        return {
          ...s,
          ...patch,
          dayName: DAY_NAMES[nextDayIndex] ?? s.dayName,
        };
      }),
    );
    markDirty();
  }

  function addNewExercise(sessionId: string) {
    const key = makeKey();
    const blank: EditableExercise = {
      _key: key,
      name: '',
      sets: 3,
      reps: '10 a 12',
      restSeconds: 45,
      instructions: 'Movimento controlado, mantendo boa postura e respiração contínua.',
      adaptation: '',
    };
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, exercises: [...s.exercises, blank] } : s)),
    );
    setCollapsedIds((prev) => ({ ...prev, [sessionId]: false }));
    setEditingExerciseKey(key);
    markDirty();
  }

  function addCatalogExercise(sessionId: string, catalogName: string) {
    if (!catalogName) return;
    const item = EXERCISE_CATALOG.find((c) => c.name === catalogName);
    if (!item) return;
    const key = makeKey();
    const added: EditableExercise = {
      _key: key,
      name: item.name,
      sets: item.sets,
      reps: item.reps,
      restSeconds: item.restSeconds,
      instructions: item.instructions,
      adaptation: item.adaptation,
    };
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, exercises: [...s.exercises, added] } : s)),
    );
    markDirty();
  }

  function patchExercise(sessionId: string, exerciseKey: string, patch: Partial<PlannedExercise>) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              exercises: s.exercises.map((ex) => (ex._key === exerciseKey ? { ...ex, ...patch } : ex)),
            }
          : s,
      ),
    );
    markDirty();
  }

  function removeExercise(sessionId: string, exerciseKey: string) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, exercises: s.exercises.filter((ex) => ex._key !== exerciseKey) } : s,
      ),
    );
    if (editingExerciseKey === exerciseKey) setEditingExerciseKey(null);
    markDirty();
  }

  function reloadFromAdaptive() {
    if (!adaptivePlan) return;
    setSessions(toEditableSessions(adaptivePlan.sessions));
    setEditingExerciseKey(null);
    setDirty(true);
    setStatus({
      kind: 'ok',
      text: 'Exercícios recarregados a partir da avaliação atual do paciente. Clique em "Publicar plano para o paciente" para salvar.',
    });
  }

  function restoreAutomaticPlan() {
    update((prev) => ({
      ...prev,
      workoutOverride: undefined,
    }));
    setSessions(toEditableSessions(adaptivePlan?.sessions ?? []));
    setEditingExerciseKey(null);
    setConfirmReset(false);
    setDirty(false);
    setStatus({
      kind: 'ok',
      text: 'Plano automático restaurado! O paciente voltou a seguir o plano calculado pela avaliação.',
    });
  }

  function publishPlan() {
    for (const s of sessions) {
      const unnamed = s.exercises.find((ex) => !ex.name.trim());
      if (unnamed) {
        setCollapsedIds((prev) => ({ ...prev, [s.id]: false }));
        setEditingExerciseKey(unnamed._key);
        setStatus({
          kind: 'err',
          text: `Preencha o nome do exercício criado em "${s.dayName} — ${s.title}" ou apague-o antes de publicar.`,
        });
        return;
      }
    }

    const cleanSessions: WorkoutSession[] = sessions.map((s) => ({
      id: s.id,
      dayIndex: s.dayIndex,
      dayName: DAY_NAMES[s.dayIndex] ?? s.dayName,
      title: s.title.trim() || 'Sessão de treino',
      focus: s.focus.trim() || 'Corpo inteiro',
      durationMinutes: Math.max(5, Number(s.durationMinutes) || 30),
      intensity: s.intensity.trim() || 'Leve a moderada',
      exercises: s.exercises.map(({ _key: _unused, ...ex }) => ({
        name: ex.name.trim(),
        sets: Math.max(1, Number(ex.sets) || 2),
        reps: ex.reps.trim() || '8 a 12',
        restSeconds: Math.max(0, Number(ex.restSeconds) || 0),
        instructions: ex.instructions.trim() || 'Movimento lento e sem dor.',
        ...(ex.adaptation?.trim() ? { adaptation: ex.adaptation.trim() } : {}),
      })),
    }));

    update((prev) => ({
      ...prev,
      workoutOverride: {
        sessions: cleanSessions,
        weeklyMinutes: cleanSessions.reduce((sum, x) => sum + x.durationMinutes, 0),
        source: 'personal',
        safetyNote: `Plano prescrito pelo personal ${professionalName}. Interrompa em caso de dor, tontura ou mal-estar.`,
      },
    }));

    setEditingExerciseKey(null);
    setDirty(false);
    setConfirmReset(false);
    setStatus({
      kind: 'ok',
      text: 'Plano de exercícios publicado! O paciente já visualiza estes exercícios na aba Exercícios.',
    });
  }

  const totalExercises = sessions.reduce((sum, s) => sum + s.exercises.length, 0);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          icon={<Dumbbell className="h-4 w-4 text-cyan-600" />}
          title="Exercícios e treino do paciente"
          subtitle="visualize todos os exercícios atuais, crie novos ou apague os que não deseja manter"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              isCustomActive
                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }
          >
            {isCustomActive ? 'Prescrição ativa do Personal' : 'Baseado no plano automático'}
          </Badge>
          {dirty && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              Alterações não publicadas
            </Badge>
          )}
        </div>
      </div>

      {assessment?.hasWarningSymptoms && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Alerta clínico:</strong> este paciente marcou sintomas de alerta na avaliação funcional. Valide
            liberação médica antes de liberar treinos intensos.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs dark:bg-slate-800/70">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {sessions.length} sessão(ões) · {totalExercises} exercício(s) no total
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {adaptivePlan && (
            <button
              type="button"
              onClick={reloadFromAdaptive}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <RotateCcw className="h-3 w-3" /> Recarregar plano automático
            </button>
          )}
          {isCustomActive &&
            (confirmReset ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={restoreAutomaticPlan}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                >
                  Confirmar restauração
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              >
                Voltar ao plano automático
              </button>
            ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Nenhuma sessão de treino configurada para este paciente ainda.
          </p>
          <Button variant="secondary" onClick={addSession} className="mt-3 !px-4 !py-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar primeira sessão de treino
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const collapsed = Boolean(collapsedIds[session.id]);
            return (
              <div
                key={session.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                      {session.dayName} · {session.durationMinutes} min · {session.exercises.length} exercício(s)
                    </p>
                    <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                      {session.title || 'Sessão sem título'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedIds((prev) => ({ ...prev, [session.id]: !prev[session.id] }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {collapsed ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> Mostrar
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" /> Recolher
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSession(session.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
                      title="Apagar esta sessão inteira"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Apagar sessão
                    </button>
                  </div>
                </div>

                {!collapsed && (
                  <div className="space-y-4 p-4">
                    <div className="grid gap-2.5 sm:grid-cols-4">
                      <Field label="Dia da semana">
                        <select
                          value={session.dayIndex}
                          onChange={(e) =>
                            patchSession(session.id, { dayIndex: Number(e.target.value) })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {DAY_NAMES.map((day, idx) => (
                            <option key={day} value={idx}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Título da sessão">
                        <TextInput
                          value={session.title}
                          onChange={(e) => patchSession(session.id, { title: e.target.value })}
                          placeholder="Ex.: Força A"
                        />
                      </Field>
                      <Field label="Foco">
                        <TextInput
                          value={session.focus}
                          onChange={(e) => patchSession(session.id, { focus: e.target.value })}
                          placeholder="Ex.: Corpo inteiro"
                        />
                      </Field>
                      <Field label="Duração (min)">
                        <TextInput
                          type="number"
                          min={5}
                          max={180}
                          value={session.durationMinutes}
                          onChange={(e) =>
                            patchSession(session.id, {
                              durationMinutes: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </Field>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Exercícios desta sessão ({session.exercises.length})
                      </p>

                      {session.exercises.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                          Nenhum exercício nesta sessão. Crie um novo ou escolha do catálogo abaixo.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {session.exercises.map((exercise, idx) => {
                            const isEditing = editingExerciseKey === exercise._key;
                            const matchedVideo = exercise.name.trim()
                              ? matchVideoForExercise(videos, exercise.name, patientId)
                              : null;

                            return (
                              <div
                                key={exercise._key}
                                className={cn(
                                  'rounded-xl border p-3 transition-colors',
                                  isEditing
                                    ? 'border-cyan-400 bg-cyan-50/40 dark:border-cyan-600 dark:bg-cyan-950/20'
                                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-700/80 dark:bg-slate-800/40',
                                )}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-100 text-[11px] font-extrabold text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                                          {exercise.name.trim() || 'Novo exercício (preencha o nome)'}
                                        </p>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                          {exercise.sets} séries · {exercise.reps} · pausa {exercise.restSeconds}s
                                        </span>
                                      </div>
                                      {!isEditing && (
                                        <>
                                          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                                            {exercise.instructions}
                                          </p>
                                          {exercise.adaptation && (
                                            <p className="mt-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                              Adaptação: {exercise.adaptation}
                                            </p>
                                          )}
                                        </>
                                      )}
                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        {matchedVideo ? (
                                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            <Film className="h-3 w-3" /> Vídeo: {matchedVideo.title}
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] font-semibold text-slate-400">
                                            Sem vídeo vinculado (vincule abaixo em Vídeos de exercícios)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingExerciseKey(isEditing ? null : exercise._key)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    >
                                      {isEditing ? (
                                        <>
                                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Concluir
                                        </>
                                      ) : (
                                        <>
                                          <Pencil className="h-3.5 w-3.5" /> Editar
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeExercise(session.id, exercise._key)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
                                      title="Apagar este exercício"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Apagar
                                    </button>
                                  </div>
                                </div>

                                {isEditing && (
                                  <div className="mt-3 grid gap-2.5 border-t border-cyan-200/60 pt-3 dark:border-cyan-800/60 sm:grid-cols-6">
                                    <Field label="Nome do exercício" className="sm:col-span-3">
                                      <TextInput
                                        value={exercise.name}
                                        onChange={(e) =>
                                          patchExercise(session.id, exercise._key, {
                                            name: e.target.value,
                                          })
                                        }
                                        placeholder="Ex.: Agachamento com apoio na cadeira"
                                      />
                                    </Field>
                                    <Field label="Séries" className="sm:col-span-1">
                                      <TextInput
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={exercise.sets}
                                        onChange={(e) =>
                                          patchExercise(session.id, exercise._key, {
                                            sets: Number(e.target.value) || 1,
                                          })
                                        }
                                      />
                                    </Field>
                                    <Field label="Repetições / Tempo" className="sm:col-span-1">
                                      <TextInput
                                        value={exercise.reps}
                                        onChange={(e) =>
                                          patchExercise(session.id, exercise._key, {
                                            reps: e.target.value,
                                          })
                                        }
                                        placeholder="10 a 12"
                                      />
                                    </Field>
                                    <Field label="Pausa (seg)" className="sm:col-span-1">
                                      <TextInput
                                        type="number"
                                        min={0}
                                        max={300}
                                        value={exercise.restSeconds}
                                        onChange={(e) =>
                                          patchExercise(session.id, exercise._key, {
                                            restSeconds: Number(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </Field>
                                    <Field label="Instruções de execução" className="sm:col-span-4">
                                      <TextInput
                                        value={exercise.instructions}
                                        onChange={(e) =>
                                          patchExercise(session.id, exercise._key, {
                                            instructions: e.target.value,
                                          })
                                        }
                                        placeholder="Como o paciente deve executar o movimento"
                                      />
                                    </Field>
                                    <Field label="Adaptação (opcional)" className="sm:col-span-2">
                                      <TextInput
                                        value={exercise.adaptation ?? ''}
                                        onChange={(e) =>
                                          patchExercise(session.id, exercise._key, {
                                            adaptation: e.target.value,
                                          })
                                        }
                                        placeholder="Ex.: Reduzir amplitude se houver dor"
                                      />
                                    </Field>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => addNewExercise(session.id)}
                          className="!px-3 !py-1.5 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" /> Criar exercício novo
                        </Button>
                        <select
                          value=""
                          onChange={(e) => {
                            addCatalogExercise(session.id, e.target.value);
                            e.target.value = '';
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="">+ Adicionar exercício do catálogo…</option>
                          {EXERCISE_CATALOG.map((item) => (
                            <option key={item.name} value={item.name}>
                              {item.name} ({item.sets}x · {item.reps})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {status && (
        <p
          className={cn(
            'mt-4 rounded-xl px-4 py-2.5 text-xs font-bold',
            status.kind === 'err'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
          )}
        >
          {status.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button type="button" variant="secondary" onClick={addSession} className="!px-4 !py-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> Nova sessão (dia)
        </Button>
        <Button type="button" onClick={publishPlan} className="!px-4 !py-2 text-xs">
          {dirty ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {dirty ? 'Publicar alterações para o paciente' : 'Publicar plano para o paciente'}
        </Button>
      </div>
    </Card>
  );
}
