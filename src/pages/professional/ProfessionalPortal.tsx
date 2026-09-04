import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  Beef,
  CalendarClock,
  Check,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  KeyRound,
  LoaderCircle,
  LogOut,
  Save,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  TrendingDown,
  UserPlus,
  Users,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, DisclaimerBox, Field, Logo, SectionTitle, TextInput } from '../../components/ui';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import { useAuth } from '../../context/AuthContext';
import { loadPatientData, savePatientData } from '../../lib/backend';
import { listLinksForProfessional, requestPatientLink } from '../../lib/professional';
import {
  loadExerciseVideos,
  saveExerciseVideos,
  uploadExerciseVideo,
  uploadExerciseThumbnail,
  videoEmbedUrl,
  videoThumbnailUrl,
  VIDEO_SUITABILITY,
} from '../../lib/videoLibrary';
import type { ExerciseVideo } from '../../lib/types';
import { Film, Image as ImageIcon, Link2, Upload } from 'lucide-react';
import { findMedication } from '../../data/medications';
import {
  activePhase,
  adherenceRate,
  ageFromBirth,
  doseAtDate,
  fmtMg,
  imcInfo,
  treatmentWeek,
  weeklyWeightTrend,
} from '../../lib/schedule';
import { computeTargets } from '../../lib/llm';
import type { PatientData, PatientLink } from '../../lib/types';
import { cn } from '../../utils/cn';

export default function ProfessionalPortal() {
  const { user, loading } = useAuth();
  const [account, setAccount] = useState<PatientData | null>(null);
  const [ready, setReady] = useState(false);
  const [links, setLinks] = useState<PatientLink[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let on = true;
    (async () => {
      let acc = await loadPatientData(user.id);
      if (!on) return;

      // Se o banco ainda não tinha os dados do profissional mas eles estão no user.professional (metadata do Supabase):
      if ((!acc || !acc.profile.professional) && user.professional) {
        const updatedProfile: import('../../lib/types').Profile = {
          name: user.name,
          sex: 'outro',
          birthDate: '',
          email: user.email,
          phone: '',
          whatsapp: '',
          startWeightKg: null,
          heightCm: null,
          professional: user.professional,
        };
        const updatedAcc: PatientData = {
          profile: updatedProfile,
          treatment: null,
          logs: [],
          weights: [],
        };
        await savePatientData(user.id, updatedAcc);
        acc = updatedAcc;
      }

      setAccount(acc);
      setReady(true);
      if (acc?.profile.professional || user.professional) {
        setLinks(await listLinksForProfessional(user.id));
      }
    })();
    return () => {
      on = false;
    };
  }, [user?.id, user?.professional, user?.name, user?.email]);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientData(null);
      return;
    }
    let on = true;
    loadPatientData(selectedPatientId).then((d) => on && setPatientData(d));
    return () => {
      on = false;
    };
  }, [selectedPatientId]);

  function updatePatient(updater: (prev: PatientData) => PatientData) {
    if (!selectedPatientId) return;
    setPatientData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void savePatientData(selectedPatientId, next);
      return next;
    });
  }

  if (loading || (user && !ready)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const effectiveProfessional = account?.profile.professional || user.professional;
  if (ready && !effectiveProfessional) return <Navigate to="/app" replace />;

  const professional = effectiveProfessional!;
  const approved = links.filter((l) => l.status === 'aprovado');
  const pending = links.filter((l) => l.status === 'pendente');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge className="hidden bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 sm:inline-flex">
              <ShieldCheck className="h-3 w-3" /> Portal do Profissional
            </Badge>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeSwitcher />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-extrabold leading-tight text-slate-800 dark:text-slate-100">{account?.profile.name}</p>
              <p className="text-[10px] font-semibold text-slate-400">{ROLE_LABEL[professional.role]}</p>
            </div>
            <Avatar name={account?.profile.name ?? user.name} className="h-9 w-9 text-xs" />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7">
        {!selectedPatientId ? (
          <PatientList
            professionalId={user.id}
            professionalName={account?.profile.name ?? user.name}
            professionalEmail={user.email}
            role={professional.role}
            approved={approved}
            pending={pending}
            onRefresh={async () => setLinks(await listLinksForProfessional(user.id))}
            onSelect={setSelectedPatientId}
          />
        ) : (
          <div>
            <button
              onClick={() => setSelectedPatientId(null)}
              className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para meus pacientes
            </button>
            {!patientData ? (
              <div className="grid place-items-center py-20">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              </div>
            ) : professional.role === 'medico' ? (
              <MedicoView data={patientData} professionalName={account!.profile.name} update={updatePatient} />
            ) : professional.role === 'nutricionista' ? (
              <NutricionistaView data={patientData} professionalName={account!.profile.name} update={updatePatient} />
            ) : (
              <PersonalView data={patientData} patientId={selectedPatientId} professionalName={account!.profile.name} update={updatePatient} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const ROLE_LABEL: Record<'medico' | 'nutricionista' | 'personal', string> = {
  medico: 'Médico(a) / Endocrinologista',
  nutricionista: 'Nutricionista',
  personal: 'Educador(a) Físico / Personal',
};

function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <button onClick={() => void signOut()} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" title="Sair">
      <LogOut className="h-4 w-4" />
    </button>
  );
}

/* ================= Lista de pacientes ================= */

function PatientList({
  professionalId,
  professionalName,
  professionalEmail,
  role,
  approved,
  pending,
  onRefresh,
  onSelect,
}: {
  professionalId: string;
  professionalName: string;
  professionalEmail: string;
  role: 'medico' | 'nutricionista' | 'personal';
  approved: PatientLink[];
  pending: PatientLink[];
  onRefresh: () => Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleRequest() {
    if (!code.trim()) return;
    setBusy(true);
    setMessage(null);
    const res = await requestPatientLink(professionalId, professionalName, professionalEmail, role, code.trim());
    setBusy(false);
    setMessage({ ok: res.ok, text: res.message });
    if (res.ok) {
      setCode('');
      await onRefresh();
    }
  }

  const RoleIcon = role === 'medico' ? Stethoscope : role === 'nutricionista' ? HeartPulse : Dumbbell;

  return (
    <div className="space-y-6">
      <div>
        <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
          <RoleIcon className="h-3 w-3" /> {ROLE_LABEL[role]}
        </Badge>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Meus pacientes</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          Você só visualiza as informações relacionadas ao seu escopo profissional. Solicite acesso usando o código de 6
          caracteres que o paciente encontra em "Perfil → Profissionais conectados".
        </p>
      </div>

      <Card className="p-6">
        <SectionTitle icon={<UserPlus className="h-4 w-4 text-brand-600" />} title="Solicitar acesso a um paciente" subtitle="peça o código ao paciente" />
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput
              placeholder="Ex.: A3F9K2"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="pl-10 font-mono uppercase tracking-widest"
              maxLength={6}
            />
          </div>
          <Button onClick={handleRequest} disabled={busy || !code.trim()} className="!px-5">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Solicitar acesso
          </Button>
        </div>
        {message && (
          <p className={cn('mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold', message.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300')}>
            {message.text}
          </p>
        )}
      </Card>

      {pending.length > 0 && (
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600">Aguardando aprovação</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {pending.map((l) => (
              <div key={l.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                {l.patientName} <span className="font-semibold text-amber-600 dark:text-amber-300">· pendente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle icon={<Users className="h-4 w-4 text-brand-600" />} title="Pacientes com acesso liberado" subtitle={`${approved.length} paciente(s)`} />
        {approved.length === 0 ? (
          <Card className="p-10 text-center text-sm text-slate-400">Nenhum paciente conectado ainda. Solicite acesso pelo código acima.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {approved.map((l) => (
              <button
                key={l.id}
                onClick={() => onSelect(l.patientId)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <Avatar name={l.patientName} className="h-10 w-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{l.patientName}</p>
                  <p className="truncate text-[10px] font-semibold text-slate-400">{l.patientEmail}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <DisclaimerBox compact />
    </div>
  );
}

/* ================= Cabeçalho comum do paciente ================= */

function PatientHeader({ data }: { data: PatientData }) {
  const age = data.profile.birthDate ? ageFromBirth(data.profile.birthDate) : null;
  const weight = data.weights.at(-1)?.kg ?? data.profile.startWeightKg ?? null;
  const imc = imcInfo(weight, data.profile.heightCm);
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={data.profile.name} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-slate-900 dark:text-white">{data.profile.name}</p>
          <p className="text-xs font-semibold text-slate-400">
            {age != null ? `${age} anos` : 'idade não informada'} · {data.profile.email}
          </p>
        </div>
        {weight != null && (
          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Scale className="h-3 w-3" /> {weight.toLocaleString('pt-BR')} kg
          </Badge>
        )}
        {imc && <Badge className={cn('bg-slate-100', imc.color)}>IMC {imc.imc.toLocaleString('pt-BR')}</Badge>}
      </div>
    </Card>
  );
}

function NoteEditor({
  title,
  icon,
  value,
  authorName,
  onSave,
}: {
  title: string;
  icon: React.ReactNode;
  value?: { text: string; authorName: string; updatedAt: string };
  authorName: string;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(value?.text ?? '');
  const [saved, setSaved] = useState(false);
  return (
    <Card className="p-6">
      <SectionTitle icon={icon} title={title} subtitle={value ? `Última atualização: ${new Date(value.updatedAt).toLocaleString('pt-BR')}` : 'Visível apenas para o paciente'} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Escreva uma observação ou orientação para o paciente…"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      />
      <Button
        className="mt-3 !px-4 !py-2 text-xs"
        onClick={() => {
          onSave(text);
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
          void authorName;
        }}
      >
        {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
        {saved ? 'Salvo!' : 'Salvar observação'}
      </Button>
    </Card>
  );
}

/* ================= Visão do Médico ================= */

function MedicoView({ data, professionalName, update }: { data: PatientData; professionalName: string; update: (u: (p: PatientData) => PatientData) => void }) {
  const t = data.treatment;
  const med = t ? findMedication(t.medId) : undefined;
  const phase = t ? activePhase(t) : null;
  const dose = t ? doseAtDate(t) : 0;
  const week = t ? treatmentWeek(t) : 0;
  const adherence = t ? adherenceRate(t, data.logs) : 0;
  const weightTrend = weeklyWeightTrend(data.weights);
  const symptoms = [...(data.symptomLogs ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const severeCount = symptoms.filter((s) => s.severity === 'intensa').length;

  return (
    <div className="space-y-5">
      <PatientHeader data={data} />

      {severeCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs leading-relaxed">
            <b>Atenção:</b> o paciente registrou {severeCount} sintoma(s) de intensidade <b>intensa</b> recentemente. Avalie o
            histórico abaixo.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <SectionTitle icon={<Syringe className="h-4 w-4 text-brand-600" />} title="Tratamento em andamento" />
          {t ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Medicamento', med?.brand ?? '—'],
                ['Princípio ativo', med?.activeIngredient ?? '—'],
                ['Dose atual', fmtMg(dose)],
                ['Semana de tratamento', `${week}`],
                ['Frequência', t.frequency === 'semanal' ? 'Semanal' : 'Diária'],
                ['Fase ativa', phase ? `Sem. ${phase.startWeek}${phase.endWeek ? `–${phase.endWeek}` : '+'}` : 'dose fixa'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-800 dark:text-slate-100">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Paciente ainda não configurou um tratamento.</p>
          )}
        </Card>
        <Card className="p-6">
          <SectionTitle icon={<Activity className="h-4 w-4 text-brand-600" />} title="Adesão" />
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{adherence}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500" style={{ width: `${adherence}%` }} />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-400">{data.logs.length} doses aplicadas registradas</p>
          {weightTrend && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <TrendingDown className="h-3.5 w-3.5" /> {weightTrend.kgPerWeek.toLocaleString('pt-BR')} kg/semana (últ. intervalo)
            </p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle icon={<ClipboardList className="h-4 w-4 text-brand-600" />} title="Diário de sintomas do paciente" subtitle="registrado pelo próprio paciente" />
        {symptoms.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">Nenhum sintoma registrado.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {symptoms.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={cn(
                      s.severity === 'intensa'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        : s.severity === 'moderada'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                    )}
                  >
                    {s.severity}
                  </Badge>
                  {s.symptoms.map((sym) => (
                    <span key={sym} className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {sym}
                    </span>
                  ))}
                </div>
                {s.note && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{s.note}</p>}
                <p className="mt-1 text-[10px] font-semibold text-slate-400">{new Date(s.date).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <NoteEditor
        title="Observação clínica"
        icon={<Stethoscope className="h-4 w-4 text-brand-600" />}
        value={data.professionalNotes?.medico}
        authorName={professionalName}
        onSave={(text) =>
          update((prev) => ({
            ...prev,
            professionalNotes: { ...prev.professionalNotes, medico: { text, authorName: professionalName, updatedAt: new Date().toISOString() } },
          }))
        }
      />
      <DisclaimerBox compact />
    </div>
  );
}

/* ================= Visão do Nutricionista ================= */

function NutricionistaView({ data, professionalName, update }: { data: PatientData; professionalName: string; update: (u: (p: PatientData) => PatientData) => void }) {
  const weight = data.weights.at(-1)?.kg ?? data.profile.startWeightKg ?? 0;
  const age = data.profile.birthDate ? ageFromBirth(data.profile.birthDate) ?? 40 : 40;
  const activity = data.physicalAssessment?.activityLevel ?? 'leve';
  const targets = weight && data.profile.heightCm ? computeTargets({ weightKg: weight, heightCm: data.profile.heightCm, sex: data.profile.sex || 'masculino', age, doseMg: 0, medMaxDose: 1, activityLevel: activity }) : null;
  const [proteinOverride, setProteinOverride] = useState(String(data.nutritionOverride?.proteinG ?? ''));
  const [kcalOverride, setKcalOverride] = useState(String(data.nutritionOverride?.kcal ?? ''));
  const [savedOverride, setSavedOverride] = useState(false);
  const nutritionLogs = data.nutritionLogs ?? [];
  const recentCompliance = nutritionLogs.slice(-7);

  return (
    <div className="space-y-5">
      <PatientHeader data={data} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <SectionTitle icon={<Beef className="h-4 w-4 text-emerald-600" />} title="Metas nutricionais calculadas" subtitle="baseadas em peso atual, altura e nível de atividade" />
          {targets ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Proteína/dia', `${data.nutritionOverride?.proteinG ?? targets.proteinG} g`],
                ['Energia', `≈ ${data.nutritionOverride?.kcal ?? targets.kcal} kcal`],
                ['Água', `≈ ${(targets.waterMl / 1000).toLocaleString('pt-BR')} L`],
                ['Fibras', `${targets.fiberG} g`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">{k}</p>
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-200">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Dados insuficientes (peso/altura) para calcular metas.</p>
          )}
        </Card>
        <Card className="p-6">
          <SectionTitle icon={<ClipboardList className="h-4 w-4 text-emerald-600" />} title="Adesão à dieta" subtitle="últimos 7 dias" />
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{recentCompliance.reduce((s, l) => s + l.meals.length, 0)}</p>
          <p className="text-[10px] font-semibold text-slate-400">refeições marcadas como consumidas</p>
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle icon={<Sparkles className="h-4 w-4 text-emerald-600" />} title="Ajustar metas manualmente" subtitle="substitui o cálculo automático exibido ao paciente" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proteína/dia (g)" hint="deixe vazio para usar o cálculo automático">
            <TextInput type="number" min="0" placeholder={targets ? String(targets.proteinG) : ''} value={proteinOverride} onChange={(e) => setProteinOverride(e.target.value)} />
          </Field>
          <Field label="Energia/dia (kcal)" hint="deixe vazio para usar o cálculo automático">
            <TextInput type="number" min="0" placeholder={targets ? String(targets.kcal) : ''} value={kcalOverride} onChange={(e) => setKcalOverride(e.target.value)} />
          </Field>
        </div>
        <Button
          className="mt-3 !px-4 !py-2 text-xs"
          onClick={() => {
            update((prev) => ({
              ...prev,
              nutritionOverride: {
                proteinG: proteinOverride.trim() ? Number(proteinOverride) : undefined,
                kcal: kcalOverride.trim() ? Number(kcalOverride) : undefined,
                authorName: professionalName,
                updatedAt: new Date().toISOString(),
              },
            }));
            setSavedOverride(true);
            window.setTimeout(() => setSavedOverride(false), 2000);
          }}
        >
          {savedOverride ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {savedOverride ? 'Metas atualizadas!' : 'Salvar ajuste'}
        </Button>
      </Card>

      <NoteEditor
        title="Observação nutricional"
        icon={<HeartPulse className="h-4 w-4 text-emerald-600" />}
        value={data.professionalNotes?.nutricionista}
        authorName={professionalName}
        onSave={(text) =>
          update((prev) => ({
            ...prev,
            professionalNotes: { ...prev.professionalNotes, nutricionista: { text, authorName: professionalName, updatedAt: new Date().toISOString() } },
          }))
        }
      />
      <DisclaimerBox compact />
    </div>
  );
}

/* ================= Visão do Personal ================= */

function PersonalView({ data, patientId, professionalName, update }: { data: PatientData; patientId: string; professionalName: string; update: (u: (p: PatientData) => PatientData) => void }) {
  const a = data.physicalAssessment;
  const workoutLogs = data.workoutLogs ?? [];
  const completedCount = workoutLogs.filter((l) => l.completed).length;

  return (
    <div className="space-y-5">
      <PatientHeader data={data} />

      {!a ? (
        <Card className="p-8 text-center text-sm text-slate-400">O paciente ainda não preencheu a avaliação de movimento.</Card>
      ) : (
        <Card className="p-6">
          <SectionTitle icon={<Dumbbell className="h-4 w-4 text-cyan-600" />} title="Avaliação funcional do paciente" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Idade', data.profile.birthDate ? `${ageFromBirth(data.profile.birthDate)} anos` : 'Não informada'],
              ['Sexo biológico', data.profile.biologicalSex ? (data.profile.biologicalSex === 'male' ? 'Masculino' : 'Feminino') : 'Não informado'],
              ['Nível de atividade', a.activityLevel],
              ['Experiência', a.experience],
              ['Disponibilidade', `${a.daysPerWeek}x/semana · ${a.minutesPerSession} min`],
              ['Local', a.location],
              ['Limitações', a.limitations.join(', ') || 'nenhuma'],
              ['Sintomas de alerta', a.hasWarningSymptoms ? 'SIM ⚠️' : 'não'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                <p className="mt-0.5 text-sm font-extrabold capitalize text-slate-800 dark:text-slate-100">{v}</p>
              </div>
            ))}
          </div>
          {a.limitationDetails && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Detalhes: {a.limitationDetails}</p>}
        </Card>
      )}

      <Card className="p-6">
        <SectionTitle icon={<CalendarClock className="h-4 w-4 text-cyan-600" />} title="Adesão ao plano de exercícios" />
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{completedCount}</p>
        <p className="text-[10px] font-semibold text-slate-400">sessões marcadas como concluídas</p>
      </Card>

      {data.workoutOverride && (
        <Card className="p-6">
          <SectionTitle icon={<Check className="h-4 w-4 text-cyan-600" />} title="Seu plano personalizado está ativo" subtitle="o paciente vê este plano no lugar do automático" />
          <div className="grid gap-2">
            {data.workoutOverride.sessions.map((s) => (
              <div key={s.id} className="rounded-xl bg-cyan-50 px-4 py-2.5 text-xs font-bold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200">
                {s.dayName} · {s.title} · {s.durationMinutes} min · {s.exercises.length} exercícios
              </div>
            ))}
          </div>
        </Card>
      )}

      <WorkoutOverrideEditor data={data} professionalName={professionalName} update={update} />

      <PatientVideosPanel patientId={patientId} professionalName={professionalName} />

      <NoteEditor
        title="Observação do treinador"
        icon={<Dumbbell className="h-4 w-4 text-cyan-600" />}
        value={data.professionalNotes?.personal}
        authorName={professionalName}
        onSave={(text) =>
          update((prev) => ({
            ...prev,
            professionalNotes: { ...prev.professionalNotes, personal: { text, authorName: professionalName, updatedAt: new Date().toISOString() } },
          }))
        }
      />
      <DisclaimerBox compact />
    </div>
  );
}

/* ================= Vídeos para o paciente (personal) ================= */

function PatientVideosPanel({ patientId, professionalName }: { patientId: string; professionalName: string }) {
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fileRef] = useState(() => ({ current: null as HTMLInputElement | null }));
  const [thumbFileRef] = useState(() => ({ current: null as HTMLInputElement | null }));

  async function refresh() {
    setVideos(await loadExerciseVideos());
  }

  useEffect(() => {
    void refresh();
  }, []);

  function handleVideoUrlChange(val: string) {
    setVideoUrl(val);
    if (!thumbnailUrl) {
      const autoThumb = videoThumbnailUrl(val);
      if (autoThumb) setThumbnailUrl(autoThumb);
    }
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage('Enviando vídeo…');
    try {
      const url = await uploadExerciseVideo(file);
      setVideoUrl(url);
      setMessage('Upload do vídeo concluído.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha no upload do vídeo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleThumbnailUpload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage('Enviando capa (thumbnail)…');
    try {
      const url = await uploadExerciseThumbnail(file);
      setThumbnailUrl(url);
      setMessage('Capa enviada com sucesso!');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha no upload da capa.');
    } finally {
      setBusy(false);
    }
  }

  async function publishForPatient() {
    if (!title.trim() || !videoUrl.trim()) {
      setMessage('Informe um título e um vídeo/link.');
      return;
    }
    const finalThumb = thumbnailUrl.trim() || videoThumbnailUrl(videoUrl) || undefined;
    const next: ExerciseVideo = {
      id: `${Date.now()}`,
      title,
      specialistName: professionalName,
      specialistCredential: '',
      description,
      category: 'forca',
      exerciseNames: [],
      suitableFor: ['geral'],
      level: 'todos',
      durationMinutes: 10,
      videoUrl,
      thumbnailUrl: finalThumb,
      published: true,
      createdAt: new Date().toISOString(),
      assignedPatientIds: [patientId],
      uploadedByProfessionalName: professionalName,
    };
    setBusy(true);
    try {
      const all = await loadExerciseVideos();
      const updated = [next, ...all];
      await saveExerciseVideos(updated);
      setVideos(updated);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setThumbnailUrl('');
      setMessage('Vídeo e capa enviados para este paciente!');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha ao publicar vídeo.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAssignment(video: ExerciseVideo) {
    const assigned = new Set(video.assignedPatientIds ?? []);
    if (assigned.has(patientId)) assigned.delete(patientId);
    else assigned.add(patientId);
    const updated = videos.map((v) => (v.id === video.id ? { ...v, assignedPatientIds: Array.from(assigned) } : v));
    await saveExerciseVideos(updated);
    setVideos(updated);
  }

  const myAssignments = videos.filter((v) => v.assignedPatientIds?.includes(patientId));
  const library = videos.filter((v) => !v.assignedPatientIds?.length);

  return (
    <Card className="p-6">
      <SectionTitle icon={<Film className="h-4 w-4 text-cyan-600" />} title="Vídeos de exercícios para este paciente" subtitle="envie uma demonstração exclusiva ou reutilize a biblioteca geral" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Título do vídeo">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Sentar e levantar — técnica correta" />
        </Field>
        <Field label="Link do vídeo (YouTube/Vimeo/MP4)">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput value={videoUrl} onChange={(e) => handleVideoUrlChange(e.target.value)} className="pl-10" placeholder="https://…" />
          </div>
        </Field>
      </div>

      <div className="mt-2.5">
        <Field label="Descrição (opcional)">
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que este vídeo demonstra" />
        </Field>
      </div>

      {/* Capa / Thumbnail */}
      <div className="mt-3">
        <Field label="Imagem de capa / Thumbnail (opcional)" hint="detectada automaticamente para links do YouTube, ou você pode subir uma foto/imagem">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-0 flex-1">
              <ImageIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="pl-10"
                placeholder="https://… ou faça o upload ao lado"
              />
            </div>
            <input
              ref={(el) => {
                thumbFileRef.current = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleThumbnailUpload(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => thumbFileRef.current?.click()}
              disabled={busy}
              className="!px-3 !py-2 text-xs"
            >
              <Upload className="h-3.5 w-3.5" /> Enviar foto da capa
            </Button>
          </div>
        </Field>
        {thumbnailUrl && (
          <div className="mt-2 flex items-center gap-3">
            <div className="h-12 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
              <img src={thumbnailUrl} alt="Prévia da capa" className="h-full w-full object-cover" />
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Capa definida com sucesso</p>
            <button
              type="button"
              onClick={() => setThumbnailUrl('')}
              className="text-[10px] font-bold text-rose-500 hover:underline"
            >
              Remover
            </button>
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <input
          ref={(el) => {
            fileRef.current = el;
          }}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy} className="!px-3 !py-2 text-xs">
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Enviar arquivo de vídeo
        </Button>
        <Button onClick={publishForPatient} disabled={busy} className="!px-4 !py-2 text-xs">
          <Save className="h-3.5 w-3.5" /> Publicar para este paciente
        </Button>
      </div>
      {message && <p className="mt-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{message}</p>}

      {myAssignments.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-cyan-600">Já enviados a este paciente</p>
          <div className="mt-2 space-y-1.5">
            {myAssignments.map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200">
                <Film className="h-3.5 w-3.5" /> {v.title}
                {videoEmbedUrl(v.videoUrl) && <span className="text-[10px] font-semibold text-cyan-500">· link válido</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {library.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Biblioteca geral — atribuir a este paciente</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {library.map((v) => {
              const assigned = v.assignedPatientIds?.includes(patientId);
              return (
                <button
                  key={v.id}
                  onClick={() => toggleAssignment(v)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition-all',
                    assigned ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
                  )}
                >
                  <Check className={cn('h-3.5 w-3.5', !assigned && 'opacity-0')} /> {v.title}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">{VIDEO_SUITABILITY.length} categorias de limitação suportadas pela biblioteca.</p>
        </div>
      )}
    </Card>
  );
}

const DAY_NAMES = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

function WorkoutOverrideEditor({ data, professionalName, update }: { data: PatientData; professionalName: string; update: (u: (p: PatientData) => PatientData) => void }) {
  const [rows, setRows] = useState(() =>
    (data.workoutOverride?.sessions ?? []).map((s) => ({
      id: s.id,
      dayIndex: s.dayIndex,
      title: s.title,
      focus: s.focus,
      durationMinutes: s.durationMinutes,
      intensity: s.intensity,
      exercisesText: s.exercises.map((e) => `${e.name} | ${e.sets} | ${e.reps} | ${e.restSeconds} | ${e.instructions}`).join('\n'),
    })),
  );
  const [saved, setSaved] = useState(false);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: `${Date.now()}`, dayIndex: prev.length % 7, title: `Sessão ${prev.length + 1}`, focus: 'Corpo inteiro', durationMinutes: 30, intensity: 'Leve a moderada', exercisesText: '' },
    ]);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function patchRow(id: string, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function save() {
    const sessions = rows.map((r) => ({
      id: r.id,
      dayIndex: r.dayIndex,
      dayName: DAY_NAMES[r.dayIndex],
      title: r.title,
      focus: r.focus,
      durationMinutes: r.durationMinutes,
      intensity: r.intensity,
      exercises: r.exercisesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, sets, reps, rest, instructions] = line.split('|').map((p) => p?.trim() ?? '');
          return {
            name: name || 'Exercício',
            sets: Number(sets) || 2,
            reps: reps || '8 a 12',
            restSeconds: Number(rest) || 60,
            instructions: instructions || 'Movimento lento e sem dor.',
          };
        }),
    }));
    update((prev) => ({
      ...prev,
      workoutOverride: {
        sessions,
        weeklyMinutes: sessions.reduce((s, x) => s + x.durationMinutes, 0),
        source: 'ia',
        safetyNote: `Plano personalizado por ${professionalName}. Interrompa em caso de dor ou mal-estar.`,
      },
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="p-6">
      <SectionTitle icon={<Dumbbell className="h-4 w-4 text-cyan-600" />} title="Personalizar plano de exercícios" subtitle="substitui o plano automático/adaptativo do paciente" />
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="grid gap-2.5 sm:grid-cols-4">
              <Field label="Dia da semana">
                <select
                  value={r.dayIndex}
                  onChange={(e) => patchRow(r.id, { dayIndex: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {DAY_NAMES.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Título">
                <TextInput value={r.title} onChange={(e) => patchRow(r.id, { title: e.target.value })} />
              </Field>
              <Field label="Foco">
                <TextInput value={r.focus} onChange={(e) => patchRow(r.id, { focus: e.target.value })} />
              </Field>
              <Field label="Duração (min)">
                <TextInput type="number" value={r.durationMinutes} onChange={(e) => patchRow(r.id, { durationMinutes: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Exercícios" hint="um por linha: Nome | séries | repetições | descanso(s) | instruções" className="mt-2.5">
              <textarea
                value={r.exercisesText}
                onChange={(e) => patchRow(r.id, { exercisesText: e.target.value })}
                rows={3}
                placeholder="Ex.: Ponte de glúteos | 3 | 12 | 60 | Suba o quadril sem arquear a lombar"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </Field>
            <button onClick={() => removeRow(r.id)} className="mt-2 text-[11px] font-bold text-rose-500 hover:underline">
              Remover sessão
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" onClick={addRow} className="!px-4 !py-2 text-xs">
          <Search className="h-3.5 w-3.5" /> Adicionar sessão
        </Button>
        <Button onClick={save} className="!px-4 !py-2 text-xs">
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Plano publicado!' : 'Publicar plano para o paciente'}
        </Button>
      </div>
    </Card>
  );
}
