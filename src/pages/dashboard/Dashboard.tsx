import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Apple,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  ClipboardList,
  History,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  LoaderCircle,
  Pencil,
  PackagePlus,
  Pill,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Avatar, Badge, Button, Card, DisclaimerBox, Logo, ModeBadge, SectionTitle, TextInput } from '../../components/ui';
import Onboarding from '../../components/Onboarding';
import NutritionTab from '../../components/NutritionTab';
import TodayMealPlanCard from '../../components/TodayMealPlanCard';
import ExerciseTab from '../../components/ExerciseTab';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import SymptomLog from '../../components/SymptomLog';
import PatientConnections from '../../components/PatientConnections';
import InjectionSiteModal, { type ConfirmDosePayload } from '../../components/InjectionSiteModal';
import AddPastDoseModal, { type PastDosePayload } from '../../components/AddPastDoseModal';
import WeightLossInsights from '../../components/WeightLossInsights';
import WaterTrackerCard from '../../components/WaterTrackerCard';
import PenStockCard from '../../components/PenStockCard';
import LabExamModal from '../../components/LabExamModal';
import { useAuth } from '../../context/AuthContext';
import { checkSuperAdmin, loadPatientData, savePatientData } from '../../lib/backend';
import { ACTIVE_INGREDIENT_LABEL, findMedication } from '../../data/medications';
import { activePhase, adherenceRate, ageFromBirth, cycleProgress, doseAtDate, doseStatus, fmtDateLong, fmtDateMedium, fmtMg, imcInfo, nextDoseDate, nextPhase, relativeDays, sortedPhases, treatmentWeek, upcomingDates, WEEKDAY_NAMES } from '../../lib/schedule';
import type { DoseLog, InjectionSite, LabExam, PatientData, PenStock, Treatment } from '../../lib/types';
import { INJECTION_SITE_LABELS } from '../../lib/types';
import { generateMedicationGuidance } from '../../lib/llm';
import { cn } from '../../utils/cn';
import { MedicationsTabBody } from './CatalogTab';

type Tab = 'inicio' | 'nutricao' | 'exercicios' | 'medicamentos' | 'perfil';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ================= Hook de dados do paciente ================= */

function usePatientData(
  userId: string,
  fallback: { name: string; email: string; metadata?: Record<string, unknown>; professional?: import('../../lib/types').ProfessionalInfo },
) {
  const [data, setData] = useState<PatientData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let on = true;
    loadPatientData(userId).then((d) => {
      if (!on) return;

      const emailKey = fallback.email.trim().toLowerCase();
      let pendingReg: Partial<import('../../lib/types').SignUpPayload> | null = null;
      try {
        const stored = localStorage.getItem(`minhacaneta_pending_reg_${emailKey}`);
        if (stored) pendingReg = JSON.parse(stored);
      } catch {
        // ignore
      }

      const meta = fallback.metadata ?? {};
      const regSex = ((meta.sex as string) || pendingReg?.sex || '') as import('../../lib/types').Sexo | '';
      const regBirth = (meta.birthDate as string) || pendingReg?.birthDate || '';
      const regPhone = (meta.phone as string) || pendingReg?.phone || '';
      const regWhatsapp = (meta.whatsapp as string) || pendingReg?.whatsapp || '';
      const rawW = meta.startWeightKg ?? pendingReg?.startWeightKg;
      const regStartWeight = rawW != null ? Number(rawW) : null;
      const rawH = meta.heightCm ?? pendingReg?.heightCm;
      const regHeight = rawH != null ? Number(rawH) : null;
      const regProf = (fallback.professional ?? meta.professional ?? pendingReg?.professional) as import('../../lib/types').ProfessionalInfo | undefined;

      if (d) {
        // Se d já existe no banco, mas alguns campos de cadastro ficaram vazios (ex: RLS no signup),
        // completamos com os metadados do cadastro para que o usuário não perca seus dados!
        const existingProf = d.profile || {};
        const mergedProf: import('../../lib/types').Profile = {
          ...existingProf,
          name: existingProf.name || fallback.name,
          sex: existingProf.sex || regSex,
          birthDate: existingProf.birthDate || regBirth,
          email: existingProf.email || fallback.email,
          phone: existingProf.phone || regPhone,
          whatsapp: existingProf.whatsapp || regWhatsapp,
          startWeightKg: existingProf.startWeightKg ?? regStartWeight,
          heightCm: existingProf.heightCm ?? regHeight,
          professional: existingProf.professional ?? regProf,
        };

        const existingWeights = d.weights || [];
        const mergedWeights =
          existingWeights.length === 0 && mergedProf.startWeightKg != null
            ? [{ date: new Date().toISOString(), kg: mergedProf.startWeightKg }]
            : existingWeights;

        const mergedData: PatientData = {
          ...d,
          profile: mergedProf,
          weights: mergedWeights,
        };

        setData(mergedData);
        // Salva de volta se atualizou algo importante
        if (
          !existingProf.birthDate && mergedProf.birthDate ||
          existingProf.startWeightKg == null && mergedProf.startWeightKg != null ||
          existingProf.heightCm == null && mergedProf.heightCm != null
        ) {
          void savePatientData(userId, mergedData);
        }
      } else {
        const initialProfile: import('../../lib/types').Profile = {
          name: fallback.name,
          sex: regSex,
          birthDate: regBirth,
          email: fallback.email,
          phone: regPhone,
          whatsapp: regWhatsapp,
          startWeightKg: regStartWeight,
          heightCm: regHeight,
          professional: regProf,
        };

        const initial: PatientData = {
          profile: initialProfile,
          treatment: null,
          logs: [],
          weights: regStartWeight != null ? [{ date: new Date().toISOString(), kg: regStartWeight }] : [],
        };
        setData(initial);
        void savePatientData(userId, initial);
      }
      setReady(true);
    });
    return () => {
      on = false;
    };
  }, [userId, fallback.metadata]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (updater: (prev: PatientData) => PatientData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        void savePatientData(userId, next);
        return next;
      });
    },
    [userId],
  );

  return { data, ready, update };
}

/* ================= Anel de progresso ================= */

function DoseRing({ progress, size = 118 }: { progress: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ================= Mini gráfico de peso ================= */

function WeightSparkline({ weights }: { weights: { date: string; kg: number }[] }) {
  const pts = weights.slice(-10);
  if (pts.length < 2) {
    return (
      <div className="grid h-24 place-items-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
        Registre seu peso para ver o gráfico 📈
      </div>
    );
  }
  const w = 320;
  const h = 110;
  const pad = 10;
  const values = pts.map((p) => p.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = pts.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${x(pts.length - 1)},${h - pad}`;
  const first = pts[0].kg;
  const last = pts[pts.length - 1].kg;
  const delta = Math.round((last - first) * 10) / 10;
  const down = delta < 0;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#weightFill)" />
        <polyline points={line} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={p.date + i} cx={x(i)} cy={y(p.kg)} r={i === pts.length - 1 ? 4.5 : 2.8} fill={i === pts.length - 1 ? '#0d9488' : '#ffffff'} stroke="#0d9488" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
        <span className="text-slate-400">{fmtDateMedium(new Date(pts[0].date))}</span>
        <span className={cn('inline-flex items-center gap-1', down ? 'text-emerald-600' : 'text-amber-600')}>
          {down ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {delta > 0 ? '+' : ''}
          {delta.toLocaleString('pt-BR')} kg desde o 1º registro
        </span>
        <span className="text-slate-400">{fmtDateMedium(new Date(pts[pts.length - 1].date))}</span>
      </div>
    </div>
  );
}

/* ================= Dashboard principal ================= */

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('inicio');
  const [onboardingMode, setOnboardingMode] = useState<'edit' | 'new_cycle' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let on = true;
    if (user?.id) checkSuperAdmin(user.id).then((a) => on && setIsAdmin(a));
    return () => {
      on = false;
    };
  }, [user?.id]);

  const userId = user?.id;
  const { data, ready, update } = usePatientData(userId ?? '', {
    name: user?.name ?? '',
    email: user?.email ?? '',
    metadata: user?.metadata,
    professional: user?.professional,
  });

  const profile = data?.profile;
  const treatment: Treatment | null = data?.treatment ?? null;
  const med = treatment ? findMedication(treatment.medId) : undefined;

  const firstName = useMemo(() => {
    const n = (profile?.name ?? user?.name ?? 'Paciente').trim();
    return n.split(' ')[0];
  }, [profile?.name, user?.name]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const imc = useMemo(() => {
    const w = data?.weights.length ? data.weights[data.weights.length - 1].kg : (profile?.startWeightKg ?? null);
    return imcInfo(w, profile?.heightCm ?? null);
  }, [data?.weights, profile?.heightCm, profile?.startWeightKg]);

  const status = useMemo(() => {
    if (!treatment) return null;
    try {
      return doseStatus(treatment, data?.logs ?? []);
    } catch (e) {
      console.error('Error calculating doseStatus:', e);
      return null;
    }
  }, [treatment, data?.logs]);

  const next = useMemo(() => {
    if (!treatment) return null;
    try {
      return nextDoseDate(treatment, data?.logs ?? []);
    } catch (e) {
      console.error('Error calculating nextDoseDate:', e);
      return null;
    }
  }, [treatment, data?.logs]);

  const upcoming = useMemo(() => {
    if (!treatment) return [];
    try {
      return upcomingDates(treatment, data?.logs ?? [], 4);
    } catch (e) {
      console.error('Error calculating upcomingDates:', e);
      return [];
    }
  }, [treatment, data?.logs]);

  const progress = useMemo(() => {
    if (!treatment) return 0;
    try {
      return cycleProgress(treatment, data?.logs ?? []);
    } catch (e) {
      console.error('Error calculating cycleProgress:', e);
      return 0;
    }
  }, [treatment, data?.logs]);

  const adherence = useMemo(() => {
    if (!treatment) return 0;
    try {
      return adherenceRate(treatment, data?.logs ?? []);
    } catch (e) {
      console.error('Error calculating adherenceRate:', e);
      return 0;
    }
  }, [treatment, data?.logs]);

  const week = useMemo(() => {
    if (!treatment) return 0;
    try {
      return treatmentWeek(treatment);
    } catch (e) {
      console.error('Error calculating treatmentWeek:', e);
      return 1;
    }
  }, [treatment]);

  const phaseActive = useMemo(() => {
    if (!treatment) return null;
    try {
      return activePhase(treatment);
    } catch (e) {
      console.error('Error calculating activePhase:', e);
      return null;
    }
  }, [treatment]);

  const phaseNext = useMemo(() => {
    if (!treatment) return null;
    try {
      return nextPhase(treatment);
    } catch (e) {
      console.error('Error calculating nextPhase:', e);
      return null;
    }
  }, [treatment]);

  const phases = useMemo(() => {
    if (!treatment) return [];
    try {
      return sortedPhases(treatment);
    } catch (e) {
      console.error('Error calculating sortedPhases:', e);
      return [];
    }
  }, [treatment]);

  const doseNext = useMemo(() => {
    if (!treatment || !next) return treatment?.doseMg ?? 0;
    try {
      return doseAtDate(treatment, next);
    } catch (e) {
      console.error('Error calculating doseAtDate:', e);
      return treatment?.doseMg ?? 0;
    }
  }, [treatment, next]);

  const appliedLogs = data?.logs ?? [];
  const doseBreakdown = useMemo(() => {
    if (appliedLogs.length === 0) return [];
    const groups: Record<string, { medId: string; logs: DoseLog[] }> = {};
    for (const l of appliedLogs) {
      if (!groups[l.medId]) {
        groups[l.medId] = { medId: l.medId, logs: [] };
      }
      groups[l.medId].logs.push(l);
    }

    return Object.values(groups).map((g) => {
      const lm = findMedication(g.medId);
      const sorted = [...g.logs].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = new Date(sorted[0].date);
      const lastDate = new Date(sorted[sorted.length - 1].date);
      const isCurrentMed = treatment?.medId === g.medId;

      let penForecastDate: string | null = null;
      const totalPenDoses = data?.penStock?.totalDoses || 4;
      const currentPenDosesUsed = data?.penStock?.dosesUsed ?? sorted.length;
      const remainingDoses = Math.max(0, totalPenDoses - currentPenDosesUsed);

      if (isCurrentMed && treatment) {
        if (remainingDoses > 0) {
          const forecast = new Date(lastDate);
          forecast.setDate(forecast.getDate() + remainingDoses * (treatment.frequency === 'diaria' ? 1 : 7));
          penForecastDate = forecast.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        }
      }

      return {
        medId: g.medId,
        brand: lm?.brand ?? (g.medId.charAt(0).toUpperCase() + g.medId.slice(1)),
        count: sorted.length,
        firstDateStr: firstDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        lastDateStr: lastDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        isCurrentMed,
        penForecastDate,
        totalPenDoses,
      };
    });
  }, [appliedLogs, treatment, data?.penStock]);


  const lastWeight = data?.weights.length ? data.weights[data.weights.length - 1].kg : null;
  const weightDelta =
    lastWeight != null && profile?.startWeightKg != null ? Math.round((lastWeight - profile.startWeightKg) * 10) / 10 : null;
  const weightDeltaPct =
    lastWeight != null && profile?.startWeightKg != null && profile.startWeightKg > 0
      ? Math.round(((lastWeight - profile.startWeightKg) / profile.startWeightKg) * 1000) / 10
      : null;

  const [weightInput, setWeightInput] = useState('');
  const [targetWeightInput, setTargetWeightInput] = useState(
    data?.targetWeightKg ? String(data.targetWeightKg) : '',
  );
  const [editingTarget, setEditingTarget] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [siteModalOpen, setSiteModalOpen] = useState(false);
    const [pastDoseModalOpen, setPastDoseModalOpen] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);

  function handleSaveLabExams(updatedExams: LabExam[]) {
    update((prev) => ({
      ...prev,
      labExams: updatedExams,
    }));
  }
  const [aiGuidanceBusy, setAiGuidanceBusy] = useState(false);

  async function handleRegenerateAiGuidance() {
    if (!treatment || !data?.profile) return;
    setAiGuidanceBusy(true);
    try {
      const note = await generateMedicationGuidance(treatment, data.profile, `
1. O que é a semaglutida e como ela age no corpo?
A semaglutida é uma molécula sintética que atua como um agonista dos receptores do hormônio GLP-1. Controle da fome: Aumenta a saciedade. Retardo gástrico: Diminui a velocidade do esvaziamento do estômago.
3. Quais são os efeitos colaterais mais comuns?
Náuseas, vômitos, diarreia e constipação (prisão de ventre), azia/refluxo.
4. Existe risco de perda de massa muscular?
Sim. Para mitigar, é obrigatório exercícios de resistência (musculação) e ingestão adequada de proteínas.
Q5: Quais estratégias reduzem o impacto do retardo gástrico?
Dieta fracionada, redução de gorduras/frituras. Hidratação afastada das grandes refeições e fracionada.`);
      update((prev) => {
        if (!prev.treatment) return prev;
        return {
          ...prev,
          treatment: { ...prev.treatment, aiGuidanceNote: note },
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAiGuidanceBusy(false);
    }
  }
  
  // Rodízio de locais
  const lastSite = useMemo(() => {
    for (let i = appliedLogs.length - 1; i >= 0; i--) {
      if (appliedLogs[i].site) return appliedLogs[i].site;
    }
    return undefined;
  }, [appliedLogs]);

  const suggestedSite: InjectionSite = useMemo(() => {
    const rotation: InjectionSite[] = [
      'abdomen_inferior_direito',
      'abdomen_inferior_esquerdo',
      'coxa_direita',
      'coxa_esquerda',
      'abdomen_superior_direito',
      'abdomen_superior_esquerdo',
      'braco_direito',
      'braco_esquerdo',
    ];
    if (!lastSite) return rotation[0];
    const idx = rotation.indexOf(lastSite);
    return rotation[(idx + 1) % rotation.length];
  }, [lastSite]);

  function handleStartApplyDose() {
    if (!treatment) return;
    setSiteModalOpen(true);
  }

  function handleConfirmDoseWithSite(payload: ConfirmDosePayload) {
    if (!treatment) return;
    setSiteModalOpen(false);

    const dateToLog = new Date(`${payload.date}T12:00:00`).toISOString();
    const doseToLog = payload.doseMg;

    update((prev) => {
      const currentStock = prev.penStock;
      let updatedStock: PenStock | null | undefined = currentStock;

      if (payload.isNewPen) {
        const nextCycle = (currentStock?.cycleNumber || 1) + 1;
        updatedStock = {
          brand: med?.brand ?? 'Caneta GLP-1',
          openedAt: payload.date,
          totalDoses: payload.newPenTotalDoses || 4,
          dosesUsed: 1, // esta já é a 1ª dose usada
          expiryDays: payload.newPenExpiryDays || 56,
          cycleNumber: nextCycle,
          doseMg: doseToLog,
        };
      } else if (currentStock) {
        updatedStock = {
          ...currentStock,
          dosesUsed: currentStock.dosesUsed + 1,
        };
      }

      return {
        ...prev,
        penStock: updatedStock,
        logs: [
          ...prev.logs,
          {
            id: uid(),
            date: dateToLog,
            doseMg: doseToLog,
            medId: treatment.medId,
            site: payload.site,
            notes: payload.notes,
            isNewPen: payload.isNewPen,
            cycleNumber: updatedStock?.cycleNumber,
          },
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      };
    });

    setJustApplied(true);
    window.setTimeout(() => setJustApplied(false), 2600);
  }

  function handleAddPastDose(payload: PastDosePayload) {
    update((prev) => {
      const newLog: DoseLog = {
        id: uid(),
        date: payload.date,
        doseMg: payload.doseMg,
        medId: payload.medId,
        site: payload.site,
        notes: payload.notes,
        cycleNumber: payload.cycleNumber,
      };
      const updatedLogs = [...prev.logs, newLog].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      return {
        ...prev,
        logs: updatedLogs,
      };
    });
  }

  function handleUndoLog(id: string) {
    update((prev) => ({ ...prev, logs: prev.logs.filter((l) => l.id !== id) }));
  }

  function handleSaveWeight() {
    const kg = parseFloat(weightInput.replace(',', '.'));
    if (!Number.isFinite(kg) || kg < 30 || kg > 400) return;
    
    update((prev) => {
      const startW = prev.profile.startWeightKg;
      if (startW != null && (startW - kg) >= 5) {
        // Trigger a flag or alert about > 5kg loss and AI recalculation
        alert(`Parabéns! Você já perdeu ${(startW - kg).toLocaleString('pt-BR')} kg! A inteligência artificial irá recalcular suas metas de água e proteína automaticamente na aba de Nutrição para preservar sua massa magra e saúde.`);
      }
      return {
        ...prev,
        weights: [...prev.weights, { date: new Date().toISOString(), kg: Math.round(kg * 10) / 10 }],
      };
    });
    setWeightInput('');
  }

  function handleSaveTargetWeight() {
    const kg = parseFloat(targetWeightInput.replace(',', '.'));
    if (!Number.isFinite(kg) || kg < 30 || kg > 400) return;
    update((prev) => ({
      ...prev,
      targetWeightKg: Math.round(kg * 10) / 10,
    }));
    setEditingTarget(false);
  }

  function handleUpdateWater(mlToday: number) {
    const todayStr = new Date().toISOString().slice(0, 10);
    update((prev) => {
      const existing = prev.waterLogs ?? [];
      const filtered = existing.filter((w) => w.date !== todayStr);
      return {
        ...prev,
        waterLogs: [...filtered, { date: todayStr, ml: mlToday }],
      };
    });
  }

  function handleUpdatePenStock(newStock: PenStock | null) {
    update((prev) => ({
      ...prev,
      penStock: newStock,
    }));
  }

  function handleToggleSaveMed(medId: string) {
    update((prev) => {
      const current = prev.savedMedicationIds ?? [];
      const exists = current.includes(medId);
      const updated = exists ? current.filter((id) => id !== medId) : [...current, medId];
      return {
        ...prev,
        savedMedicationIds: updated,
      };
    });
  }

  function handleLogout() {
    void signOut();
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <Logo />
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.professional || (ready && data?.profile.professional)) {
    return <Navigate to="/profissional" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Lado Esquerdo: Logo */}
          <div className="shrink-0">
            <Logo hideSubtitleOnMobile />
          </div>

          {/* Centro: Navegação de Abas (visível em telas médias/grandes com scroll suave se necessário) */}
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-slate-100/80 p-1 dark:bg-slate-800/80 shrink-0">
            {(
              [
                ['inicio', 'Início', <LayoutDashboard key="i" className="h-3.5 w-3.5" />],
                ['nutricao', 'Nutrição', <Apple key="n" className="h-3.5 w-3.5" />],
                ['exercicios', 'Exercícios', <Dumbbell key="e" className="h-3.5 w-3.5" />],
                ['medicamentos', 'Medicamentos', <Pill key="m" className="h-3.5 w-3.5" />],
                ['perfil', 'Perfil', <Scale key="p" className="h-3.5 w-3.5" />],
              ] as [Tab, string, React.ReactNode][]
            ).map(([id, label, icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                  tab === id
                    ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Lado Direito: Ações rápidas e Perfil */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLabModalOpen(true)}
              title="Exames laboratoriais — subir laudo com IA ou registrar"
              className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-extrabold text-teal-700 shadow-xs transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 sm:px-3"
            >
              <span>🧪</span> <span className="hidden xl:inline">Exames</span>
            </button>

            <Link
              to="/relatorio-consulta"
              title="Gerar relatório impresso / PDF para consulta médica"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3"
            >
              <span>📄</span> <span className="hidden xl:inline">Relatório</span>
            </Link>

            <ThemeSwitcher />

            {isAdmin && (
              <Link
                to="/admin"
                title="Painel do Super Admin — configurar a LLM"
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10px] font-extrabold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Super Admin</span>
              </Link>
            )}

            {(user.professional || data?.profile.professional) && (
              <Link
                to="/profissional"
                title="Acessar o Portal do Profissional de Saúde"
                className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[10px] font-extrabold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
              >
                <Dumbbell className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Portal</span>
              </Link>
            )}

            <div className="hidden 2xl:block text-right max-w-[140px] truncate leading-tight">
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{profile?.name ?? user.name}</p>
              <p className="text-[10px] font-semibold text-slate-400 truncate">{user.email}</p>
            </div>

            <Avatar name={profile?.name ?? user.name} className="h-8 w-8 sm:h-9 sm:w-9 text-[11px] sm:text-xs shrink-0" />

            <button
              onClick={handleLogout}
              className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        </header>

      <main className="mx-auto max-w-6xl px-3.5 sm:px-5 pt-4 sm:pt-7">
        {!ready ? (
          <div className="grid place-items-center py-24">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : (
          <>
            {/* Boas-vindas */}
            <div className="animate-fade-up">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                {greeting} {firstName} 👋
              </p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Bem-vindo(a) ao seu painel, <span className="text-gradient">{firstName}</span>
              </h1>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                {med && treatment
                  ? `Seu tratamento com ${med.brand} (${ACTIVE_INGREDIENT_LABEL[med.activeIngredient]}) está sendo acompanhado.`
                  : 'Configure seu tratamento para começar a acompanhar as doses.'}
              </p>
            </div>

            {/* Onboarding / edição */}
            {(onboardingMode || !treatment) && (
              <div id="onboarding-wizard" className="mt-6 animate-fade-up">
                <Onboarding
                  mode={onboardingMode ?? 'initial'}
                  initial={onboardingMode === 'new_cycle' ? null : treatment}
                  onSubmit={(t) => {
                    const isNewCycle = onboardingMode === 'new_cycle';
                    update((prev) => {
                      const nextTreatment = t;
                      let updatedStock = prev.penStock;

                      if (isNewCycle || !prev.penStock) {
                        const nextCycleNum = (prev.penStock?.cycleNumber || 0) + 1;
                        const newMed = findMedication(t.medId);
                        const isShort = t.medId.includes('saxenda') || t.medId.includes('mounjaro');
                        updatedStock = {
                          brand: newMed?.brand ?? 'Caneta GLP-1',
                          openedAt: t.startDate,
                          totalDoses: t.frequency === 'diaria' ? 30 : 4,
                          dosesUsed: 0,
                          expiryDays: isShort ? 30 : 56,
                          cycleNumber: nextCycleNum,
                          doseMg: t.doseMg,
                        };
                      }

                      return {
                        ...prev,
                        treatment: nextTreatment,
                        penStock: updatedStock,
                      };
                    });

                    setOnboardingMode(null);
                    
                    // Dispara a geração da nota orientadora da IA (assíncrono)
                    if (data?.profile) {
                      generateMedicationGuidance(t, data.profile, `
1. O que é a semaglutida e como ela age no corpo?
A semaglutida é uma molécula sintética que atua como um agonista dos receptores do hormônio GLP-1. Controle da fome: Aumenta a saciedade. Retardo gástrico: Diminui a velocidade do esvaziamento do estômago.
3. Quais são os efeitos colaterais mais comuns?
Náuseas, vômitos, diarreia e constipação (prisão de ventre), azia/refluxo.
4. Existe risco de perda de massa muscular?
Sim. Para mitigar, é obrigatório exercícios de resistência (musculação) e ingestão adequada de proteínas.
Q5: Quais estratégias reduzem o impacto do retardo gástrico?
Dieta fracionada, redução de gorduras/frituras. Hidratação afastada das grandes refeições e fracionada.`).then(note => {
                        update((prev) => {
                          if (!prev.treatment) return prev;
                          return {
                            ...prev,
                            treatment: { ...prev.treatment, aiGuidanceNote: note }
                          };
                        });
                      }).catch(console.error);
                    }
                  }}
                  onCancel={treatment ? () => setOnboardingMode(null) : undefined}
                />
              </div>
            )}

            {tab === 'inicio' && treatment && (
              <div className="mt-6 space-y-6">
                {/* Destaque: próxima dose */}
                <div className="grid gap-5 lg:grid-cols-3">
                  <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300 sm:p-7 lg:col-span-2">
                    <div className="bg-grid absolute inset-0" />
                    <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/25 blur-[70px]" />
                    <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-500/20 blur-[70px]" />

                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className="bg-white/10 text-brand-200">
                            <BellRing className="h-3 w-3" />
                            {status?.status === 'hoje' ? 'É HOJE!' : status?.status === 'atrasada' ? 'Dose atrasada' : 'Próxima dose programada'}
                          </Badge>
                          {treatment && phases.length > 0 && (
                            <Badge className="bg-brand-500/25 text-brand-100">
                              Semana {week} de {phases[phases.length - 1].endWeek == null ? `${phases[phases.length - 1].startWeek}+` : 'tratamento'}
                            </Badge>
                          )}
                          {profile?.patientCode && (
                            <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30" title="Código para seu médico ou personal">
                              Código: <strong className="font-mono tracking-wider ml-1">{profile.patientCode}</strong>
                            </Badge>
                          )}
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <span className={cn('grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg', med?.color ?? 'from-brand-500 to-teal-600')}>
                            <Syringe className="h-5.5 w-5.5" />
                          </span>
                          <div>
                            <p className="text-xl font-extrabold tracking-tight">{med?.brand ?? 'Medicação'}</p>
                            <p className="text-xs font-semibold text-slate-400">
                              {phaseActive ? `Dose atual: ${fmtMg(phaseActive.doseMg)}` : `Dose fixa: ${fmtMg(treatment.doseMg)}`}
                              {' · '}
                              {treatment.frequency === 'semanal' ? '1x por semana' : '1x por dia'}
                              {treatment.frequency === 'semanal' && WEEKDAY_NAMES[treatment.weekday] && ` · ${WEEKDAY_NAMES[treatment.weekday].charAt(0).toUpperCase() + WEEKDAY_NAMES[treatment.weekday].slice(1)}s`} às {treatment.time}
                            </p>
                          </div>
                        </div>

                        {next && (
                          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">
                            {relativeDays(next)}
                          </p>
                        )}
                        {next && (
                          <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {status?.status === 'hoje'
                              ? `Aplique hoje sua dose de ${fmtMg(doseNext)}!`
                              : status?.status === 'atrasada'
                                ? `Aplique ${fmtMg(doseNext)} assim que possível`
                                : `Faltam ${status?.daysLeft ?? 0} dia${(status?.daysLeft ?? 0) === 1 ? '' : 's'}`}
                          </p>
                        )}
                        {next && (
                          <p className="mt-1.5 text-[13px] text-slate-400">
                            {fmtDateLong(next)} · dose de {fmtMg(doseNext)} · {treatment.time}
                          </p>
                        )}
                        {phaseNext && (
                          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            {phaseNext.weeksUntil <= 1
                              ? `A próxima aplicação já entra na fase de ${fmtMg(phaseNext.doseMg)} ⚡`
                              : `Na semana ${phaseNext.startWeek} a dose sobe para ${fmtMg(phaseNext.doseMg)} (em ${phaseNext.weeksUntil} semana${phaseNext.weeksUntil === 1 ? '' : 's'})`}
                          </p>
                        )}

                        {status?.status === 'atrasada' && (
                          <p className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-300">
                            <AlertTriangle className="h-3.5 w-3.5" /> Registre a dose assim que possível e avise seu médico se houver dúvidas.
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <Button onClick={handleStartApplyDose} className={cn('!px-5 !py-3 text-sm', justApplied ? '!from-emerald-500 !to-emerald-600' : '')}>
                            {justApplied ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" /> Dose registrada!
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" /> Registrar dose aplicada
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setOnboardingMode('new_cycle');
                              setTimeout(() => {
                                document.getElementById('onboarding-wizard')?.scrollIntoView({ behavior: 'smooth' });
                              }, 50);
                            }}
                            variant="secondary"
                            className="!border-teal-500/40 !bg-teal-500/20 !text-teal-200 hover:!bg-teal-500/30 !px-4 !py-3 text-xs font-bold"
                          >
                            <PackagePlus className="h-4 w-4 text-teal-300" /> Nova caneta / ciclo
                          </Button>
                          <button onClick={() => setOnboardingMode('edit')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white">
                            <Pencil className="h-3.5 w-3.5" /> Editar tratamento
                          </button>
                        </div>
                        {lastSite && (
                          <p className="mt-2.5 text-[11px] text-slate-400">
                            Última aplicação:{' '}
                            <span className="font-bold text-slate-300">
                              {INJECTION_SITE_LABELS[lastSite]}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-center sm:flex-col sm:gap-2">
                        <div className="relative grid place-items-center">
                          <DoseRing progress={progress} />
                          <div className="absolute text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">ciclo</p>
                            <p className="text-xl font-extrabold">{Math.round(progress * 100)}%</p>
                          </div>
                        </div>
                        <p className="text-center text-[10px] font-semibold text-slate-400">
                          {status?.status === 'hoje' ? 'hora de aplicar!' : `próxima em ${Math.max(0, Math.round((1 - progress) * (treatment.frequency === 'semanal' ? 7 : 1)))} dia(s)`}
                        </p>
                      </div>
                    </div>

                    {/* Próximas doses */}
                    <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-white/10 pt-5">
                      {upcoming.map((d, i) => {
                        const ds = doseAtDate(treatment, d);
                        const changed = ds !== doseNext && i > 0;
                        return (
                          <div key={i} className={cn('rounded-xl px-3.5 py-2.5', i === 0 ? 'bg-white/10' : 'bg-white/[0.04]')}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{i === 0 ? 'Próxima' : i === 1 ? 'Seguinte' : `Dose +${i}`}</p>
                            <p className="truncate text-[13px] font-extrabold">{fmtDateMedium(d)}</p>
                            <p className={cn('text-[10px] font-semibold', changed ? 'text-amber-300' : 'text-brand-300')}>
                              {fmtMg(ds)}
                              {changed && ' ⚡'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Protocolo de doses (fases) */}
                    {phases.length > 0 && (
                      <div className="relative mt-5 border-t border-white/10 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Protocolo de doses · {med?.brand}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {phases.map((p, i) => (
                            <span
                              key={`${p.startWeek}-${i}`}
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[10px] font-extrabold transition-all',
                                phaseActive?.index === i
                                  ? 'bg-brand-500 text-white shadow-md shadow-brand-950/50 ring-2 ring-brand-300/40'
                                  : 'bg-white/10 text-slate-300',
                              )}
                            >
                              Sem {p.startWeek}
                              {p.endWeek != null ? `–${p.endWeek}` : '+'}: {fmtMg(p.doseMg)}
                            </span>
                          ))}
                          <span className="text-[10px] font-semibold text-slate-500">← fase ativa destacada</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Nota da IA */}
                    <div className="relative mt-5 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          <Sparkles className="h-3 w-3 text-brand-400" /> Nota da IA para o paciente
                        </p>
                        <button
                          type="button"
                          onClick={handleRegenerateAiGuidance}
                          disabled={aiGuidanceBusy}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-300 hover:text-brand-200 transition-colors"
                        >
                          {aiGuidanceBusy ? (
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {treatment.aiGuidanceNote && !treatment.aiGuidanceNote.includes('Habilite a Inteligência')
                            ? 'Atualizar recomendação'
                            : 'Gerar recomendação com IA'}
                        </button>
                      </div>
                      <div className="mt-3 text-xs leading-relaxed text-slate-300 space-y-2 whitespace-pre-wrap">
                        {aiGuidanceBusy ? (
                          <div className="flex items-center gap-2 text-slate-400 italic py-2">
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-400" />
                            A Inteligência Artificial está formulando sua orientação clínica personalizada...
                          </div>
                        ) : (
                          treatment.aiGuidanceNote || 'Toque em "Gerar recomendação com IA" para receber orientações clínicas sobre sua dose atual.'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coluna de estatísticas */}
                  <div className="grid content-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    <Card className="col-span-1 sm:col-span-2 lg:col-span-1 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            <Scale className="h-3.5 w-3.5" /> Peso atual
                          </p>
                          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {lastWeight != null ? lastWeight.toLocaleString('pt-BR') : '—'}
                            <span className="text-sm font-bold text-slate-400"> kg</span>
                          </p>
                        </div>
                        {imc && (
                          <Badge className={cn('bg-slate-100', imc.color)}>IMC {imc.imc.toLocaleString('pt-BR')}</Badge>
                        )}
                      </div>
                      {weightDelta != null && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-extrabold', weightDelta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600')}>
                            {weightDelta <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                            {weightDelta > 0 ? '+' : ''}
                            {weightDelta.toLocaleString('pt-BR')} kg ({weightDeltaPct && weightDeltaPct > 0 ? '+' : ''}{weightDeltaPct}%)
                          </span>
                        </div>
                      )}

                      {/* Meta de peso */}
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Meta de Peso</span>
                          <button
                            type="button"
                            onClick={() => setEditingTarget((v) => !v)}
                            className="text-[10px] font-bold text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {editingTarget ? 'Fechar' : data?.targetWeightKg ? `${data.targetWeightKg} kg (editar)` : '+ Definir meta'}
                          </button>
                        </div>
                        {editingTarget ? (
                          <div className="mt-2 flex gap-1.5">
                            <TextInput
                              type="number"
                              step="0.1"
                              placeholder="Ex: 68"
                              value={targetWeightInput}
                              onChange={(e) => setTargetWeightInput(e.target.value)}
                              className="!py-1 text-xs"
                            />
                            <Button onClick={handleSaveTargetWeight} className="!px-2.5 !py-1 text-xs">
                              Salvar
                            </Button>
                          </div>
                        ) : data?.targetWeightKg && lastWeight != null ? (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span>Faltam {Math.max(0, Math.round((lastWeight - data.targetWeightKg) * 10) / 10)} kg</span>
                              <span>Objetivo: {data.targetWeightKg} kg</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      profile?.startWeightKg && profile.startWeightKg > data.targetWeightKg
                                        ? Math.round(
                                            ((profile.startWeightKg - lastWeight) /
                                              (profile.startWeightKg - data.targetWeightKg)) *
                                              100,
                                          )
                                        : 100,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <TextInput type="number" step="0.1" placeholder="Atualizar peso…" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className="!py-2 text-xs" />
                        <Button onClick={handleSaveWeight} className="!px-3 !py-2 text-xs">Salvar</Button>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        <Target className="h-3.5 w-3.5" /> Adesão
                      </p>
                      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{adherence}%</p>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all duration-700" style={{ width: `${adherence}%` }} />
                      </div>
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-400">doses aplicadas / programadas</p>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /> Doses aplicadas
                        </p>
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                          {appliedLogs.length}
                          <span className="text-xs font-semibold text-slate-400"> total</span>
                        </span>
                      </div>

                      {doseBreakdown.length > 0 ? (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                          {doseBreakdown.map((item) => (
                            <div key={item.medId} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-brand-500" />
                                  {item.count} dose{item.count > 1 ? 's' : ''} de <strong>{item.brand}</strong>
                                </span>
                                {item.isCurrentMed && (
                                  <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                    Em uso
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500">
                                Período: {item.firstDateStr} a {item.lastDateStr}
                                {item.penForecastDate && (
                                  <span className="block mt-0.5 text-teal-700 dark:text-teal-300 font-semibold">
                                    • Última dose da caneta prevista: <strong>{item.penForecastDate}</strong>
                                  </span>
                                )}
                              </p>
                            </div>
                          ))}

                          {treatment && !appliedLogs.some((l) => l.medId === treatment.medId) && (
                            <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-2.5 text-xs text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
                              <div className="flex items-center justify-between">
                                <strong className="font-extrabold">{med?.brand ?? 'Nova caneta'}</strong>
                                <button
                                  type="button"
                                  onClick={handleStartApplyDose}
                                  className="rounded-lg bg-teal-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-teal-700 shadow-sm"
                                >
                                  + Aplicar dose de hoje
                                </button>
                              </div>
                              <p className="text-[10px] text-teal-700 dark:text-teal-300 mt-1">
                                0 de 4 aplicadas nesta caneta · Registre a 1ª aplicação de hoje (10ª dose da sua jornada).
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] text-slate-400 italic">Nenhuma aplicação registrada</p>
                      )}
                    </Card>
                  </div>
                </div>

                {/* Cardápio de Hoje (Prioridade total para plano prescrito pelo nutricionista) */}
                {data && (
                  <TodayMealPlanCard
                    userId={user.id}
                    data={data}
                    update={update}
                    onOpenNutritionTab={() => setTab('nutricao')}
                  />
                )}

                {/* Peso + histórico */}
                <div className="grid gap-5 lg:grid-cols-3">
                  <Card className="p-6 lg:col-span-2">
                    <SectionTitle icon={<TrendingDown className="h-4 w-4 text-brand-600" />} title="Evolução do peso" subtitle={`Peso inicial: ${profile?.startWeightKg != null ? `${profile.startWeightKg.toLocaleString('pt-BR')} kg` : '—'} · Altura: ${profile?.heightCm ?? '—'} cm`} />
                    <WeightSparkline weights={data?.weights ?? []} />
                    <WeightLossInsights
                      weights={data?.weights ?? []}
                      startWeightKg={profile?.startWeightKg}
                      targetWeightKg={data?.targetWeightKg}
                      heightCm={profile?.heightCm}
                      onEditTarget={() => setEditingTarget(true)}
                    />
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <SectionTitle icon={<ClipboardList className="h-4 w-4 text-brand-600" />} title="Histórico" subtitle="últimas aplicações" />
                      <button
                        type="button"
                        onClick={() => setPastDoseModalOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                        title="Adicionar dose passada / retroativa"
                      >
                        <Plus className="h-3.5 w-3.5" /> Dose anterior
                      </button>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {appliedLogs.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700 space-y-2.5">
                          <p>Nenhuma dose registrada ainda. Toque em “Registrar dose aplicada” 💉</p>
                          <button
                            type="button"
                            onClick={() => setPastDoseModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 transition-colors"
                          >
                            <History className="h-3.5 w-3.5" /> + Registrar aplicação anterior / retroativa
                          </button>
                        </div>
                      )}
                      {[...appliedLogs]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 12)
                        .map((l) => {
                          const lm = findMedication(l.medId);
                          return (
                            <div key={l.id} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[9px] font-extrabold text-white', lm?.color ?? 'from-slate-400 to-slate-600')}>
                                {lm?.brand.slice(0, 2).toUpperCase() ?? '—'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                  <span>{lm?.brand ?? 'Medicação'} · {fmtMg(l.doseMg)}</span>
                                  {l.isNewPen && (
                                    <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                      Nova Caneta ✨
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] font-semibold text-slate-400">
                                  {new Date(l.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  {l.site && (
                                    <span className="ml-1.5 text-brand-600 dark:text-brand-400">
                                      · {INJECTION_SITE_LABELS[l.site]}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button onClick={() => { if (window.confirm('Excluir este registro de aplicação?')) handleUndoLog(l.id); }} className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500" title="Excluir este registro">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </Card>
                </div>

                {data?.professionalNotes?.medico && (
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/40 p-4 dark:border-blue-800 dark:bg-gradient-to-r dark:from-blue-950/60 dark:to-slate-900 shadow-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5" /> Orientação do seu médico · {new Date(data.professionalNotes.medico.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                      {data.professionalNotes.medico.authorName && (
                        <span className="text-[10px] font-extrabold text-blue-900 dark:text-blue-200">
                          {data.professionalNotes.medico.authorName}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-blue-950 dark:text-blue-100 font-medium whitespace-pre-line">
                      "{data.professionalNotes.medico.text}"
                    </p>

                    {/* Histórico anterior se houver mais de 1 orientação */}
                    {data.recommendationHistory && data.recommendationHistory.length > 1 && (
                      <details className="mt-3 border-t border-blue-200/60 pt-2 dark:border-blue-900/60 text-xs">
                        <summary className="cursor-pointer font-bold text-blue-700 hover:underline dark:text-blue-300 text-[11px]">
                          Ver orientações anteriores ({data.recommendationHistory.length - 1})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {data.recommendationHistory.slice(1).map((item) => (
                            <div key={item.id} className="rounded-xl border border-blue-100 bg-white/70 p-2.5 text-[11px] dark:border-blue-900/40 dark:bg-slate-800/60">
                              <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-100 dark:border-slate-700">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.authorName}</span>
                                <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-line">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Hidratação e Estoque de Caneta */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <WaterTrackerCard
                    currentWeightKg={lastWeight ?? profile?.startWeightKg ?? null}
                    waterLogs={data?.waterLogs}
                    onUpdateWater={handleUpdateWater}
                  />
                  <PenStockCard
                    brand={med?.brand ?? 'Caneta GLP-1'}
                    stock={data?.penStock}
                    onUpdateStock={handleUpdatePenStock}
                    onStartNewCycle={() => {
                      setOnboardingMode('new_cycle');
                      setTimeout(() => {
                        document.getElementById('onboarding-wizard')?.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                  />
                </div>

                {/* Card de Exames Laboratoriais com Leitura por IA */}
                <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/40 p-5 shadow-sm dark:border-teal-900/60 dark:bg-gradient-to-r dark:from-teal-950/25 dark:via-slate-900 dark:to-teal-950/25 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/30">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                            Exames Laboratoriais
                          </h3>
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {data?.labExams?.length ? `${data.labExams.length} exame(s)` : 'Subir laudo'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {data?.labExams?.length
                            ? `Última coleta em ${new Date(data.labExams[0].date + 'T12:00:00').toLocaleDateString('pt-BR')}. Tire foto do laudo novo ou adicione resultados!`
                            : 'Envie fotos de cada página do laudo ou PDF: a Inteligência Artificial lê e preenche todos os seus exames automaticamente.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        onClick={() => setLabModalOpen(true)}
                        className="!py-2 !px-4 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Enviar Laudo / Ver Exames
                      </Button>
                    </div>
                  </div>
                </div>

                <SymptomLog data={data!} update={update} />

                <DisclaimerBox compact />
              </div>
            )}

            {tab === 'nutricao' && data && (
              <NutritionTab userId={user.id} data={data} update={update} />
            )}

            {tab === 'exercicios' && data && (
              <ExerciseTab userId={user.id} data={data} update={update} />
            )}

            {tab === 'medicamentos' && (
              <div className="mt-6 animate-fade-up">
                <MedicationsTabBody
                  savedMedicationIds={data?.savedMedicationIds}
                  onToggleSaveMed={handleToggleSaveMed}
                />
              </div>
            )}

            {tab === 'perfil' && (
              <div className="mt-6 animate-fade-up">
                <ProfileTabBody data={data} isAdmin={isAdmin} userId={user.id} update={update} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Navegação mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {(
            [
              ['inicio', 'Início', <LayoutDashboard key="i" className="h-5 w-5" />],
              ['nutricao', 'Nutrição', <Apple key="n" className="h-5 w-5" />],
              ['exercicios', 'Exercícios', <Dumbbell key="e" className="h-5 w-5" />],
              ['medicamentos', 'Medicamentos', <Pill key="m" className="h-5 w-5" />],
              ['perfil', 'Perfil', <Scale key="p" className="h-5 w-5" />],
            ] as [Tab, string, React.ReactNode][]
          ).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
              }}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors',
                tab === id ? 'text-brand-700' : 'text-slate-400',
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Modal de Adicionar Dose Passada / Retroativa */}
      <AddPastDoseModal
        isOpen={pastDoseModalOpen}
        onClose={() => setPastDoseModalOpen(false)}
        defaultMedId={treatment?.medId}
        onAddPastDose={handleAddPastDose}
      />

      {/* Modal de Rodízio do Local de Injeção e Ajuste de Dose */}
      <InjectionSiteModal
        isOpen={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        onConfirm={handleConfirmDoseWithSite}
        lastSite={lastSite}
        suggestedSite={suggestedSite}
        doseMg={treatment ? doseAtDate(treatment, new Date()) : 0}
        availableDoses={med?.doses}
        medBrand={med?.brand}
        currentPenStock={data?.penStock}
      />

      {/* Modal de Exames Laboratoriais com Leitura por IA */}
      <LabExamModal
        isOpen={labModalOpen}
        onClose={() => setLabModalOpen(false)}
        exams={data?.labExams ?? []}
        onSaveExams={handleSaveLabExams}
      />

      </div>
  );
}

function ProfileTabBody({
  data,
  isAdmin,
  userId,
  update,
}: {
  data: PatientData | null;
  isAdmin?: boolean;
  userId: string;
  update: (updater: (prev: PatientData) => PatientData) => void;
}) {
  const { user, signOut } = useAuth();
  const p = data?.profile;
  const age = p?.birthDate ? ageFromBirth(p.birthDate) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(p?.name ?? '');
  const [sex, setSex] = useState<import('../../lib/types').Sexo | ''>(p?.sex ?? '');
  const [birthDate, setBirthDate] = useState(p?.birthDate ?? '');
  const [phone, setPhone] = useState(p?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(p?.whatsapp ?? '');
  const [heightCm, setHeightCm] = useState(p?.heightCm ? String(p.heightCm) : '');
  const [startWeightKg, setStartWeightKg] = useState(p?.startWeightKg ? String(p.startWeightKg) : '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sincroniza estado local caso os dados do paciente mudem
  useEffect(() => {
    if (p) {
      setName(p.name ?? '');
      setSex(p.sex ?? '');
      setBirthDate(p.birthDate ?? '');
      setPhone(p.phone ?? '');
      setWhatsapp(p.whatsapp ?? '');
      setHeightCm(p.heightCm ? String(p.heightCm) : '');
      setStartWeightKg(p.startWeightKg ? String(p.startWeightKg) : '');
    }
  }, [p]);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const h = heightCm ? parseFloat(heightCm.replace(',', '.')) : null;
    const w = startWeightKg ? parseFloat(startWeightKg.replace(',', '.')) : null;

    update((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        name: name.trim() || prev.profile.name,
        sex: sex,
        birthDate: birthDate,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        heightCm: Number.isFinite(h) ? h : null,
        startWeightKg: Number.isFinite(w) ? w : null,
      },
    }));

    setSavedSuccess(true);
    setIsEditing(false);
    window.setTimeout(() => setSavedSuccess(false), 2500);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <SectionTitle
              icon={<Scale className="h-4 w-4 text-brand-600" />}
              title="Meus dados"
              subtitle="informações do cadastro"
            />
            <Button
              variant="secondary"
              onClick={() => setIsEditing((v) => !v)}
              className="!py-1.5 !px-3 !text-xs font-bold"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isEditing ? 'Cancelar' : 'Editar dados'}
            </Button>
          </div>

          {savedSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Dados atualizados com sucesso!
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4 animate-fade-in">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nome completo
                  </label>
                  <TextInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="mt-1 !py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sexo biológico
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as import('../../lib/types').Sexo)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecione...</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Data de nascimento
                  </label>
                  <TextInput
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="mt-1 !py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    E-mail (fixo da conta)
                  </label>
                  <TextInput
                    value={p?.email ?? user?.email ?? ''}
                    disabled
                    className="mt-1 !py-2 text-xs opacity-60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Telefone
                  </label>
                  <TextInput
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1 !py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    WhatsApp
                  </label>
                  <TextInput
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1 !py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Peso inicial (kg)
                  </label>
                  <TextInput
                    type="number"
                    step="0.1"
                    value={startWeightKg}
                    onChange={(e) => setStartWeightKg(e.target.value)}
                    placeholder="Ex: 84.5"
                    className="mt-1 !py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Altura (cm)
                  </label>
                  <TextInput
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="Ex: 172"
                    className="mt-1 !py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  className="!py-2 !text-xs"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="!py-2 !px-5 !text-xs font-bold">
                  Salvar dados
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Nome completo', p?.name ?? '—'],
                ['Sexo', p?.sex ? (p.sex === 'feminino' ? 'Feminino' : p.sex === 'masculino' ? 'Masculino' : 'Outro') : '—'],
                ['Data de nascimento', p?.birthDate ? new Date(p.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'],
                ['Idade', age != null ? `${age} anos` : '—'],
                ['E-mail', p?.email ?? user?.email ?? '—'],
                ['Telefone', p?.phone ?? '—'],
                ['WhatsApp', p?.whatsapp ?? '—'],
                ['Peso no cadastro', p?.startWeightKg != null ? `${p.startWeightKg.toLocaleString('pt-BR')} kg` : '—'],
                ['Altura', p?.heightCm != null ? `${p.heightCm} cm` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{v}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <PatientConnections userId={userId} name={p?.name ?? user?.name ?? 'Paciente'} email={p?.email ?? user?.email ?? ''} />
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">Aparência</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Esquema de cores do aplicativo.</p>
          <div className="mt-3">
            <ThemeSwitcher segment />
          </div>
        </Card>
        {isAdmin && (
          <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-teal-50/60 p-6 dark:border-brand-500/25 dark:from-brand-950 dark:to-teal-950/60">
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Privilégios de Super Admin
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Configure a LLM que gera os cardápios nutricionais dos pacientes com base na dose semanal.
            </p>
            <Link to="/admin">
              <Button full className="mt-3 !py-2.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Abrir Painel Admin (LLM)
              </Button>
            </Link>
          </Card>
        )}
        <Card className="p-6">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">Sessão</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Conectado como {user?.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <ModeBadge />
          </div>
          <Button variant="danger" full className="mt-4" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Sair da conta
          </Button>
        </Card>
        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <CalendarClock className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Sobre o app
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            O MinhaCaneta é um protótipo de apoio ao paciente: registra medicação, doses e evolução. Não realiza prescrição, não
            substitui consultas nem exames. Todo ajuste de dose deve ser feito com acompanhamento médico.
          </p>
        </Card>
        <DisclaimerBox compact />
      </div>
    </div>
  );
}
