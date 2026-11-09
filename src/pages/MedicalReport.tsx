import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Droplet,
  FlaskConical,
  Plus,
  Printer,
  Utensils,
} from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { loadPatientData, savePatientData } from '../lib/backend';
import { findMedication } from '../data/medications';
import { adherenceRate, fmtDateMedium, fmtMg, imcInfo } from '../lib/schedule';
import type { LabExam, PatientData } from '../lib/types';
import { INJECTION_SITE_LABELS } from '../lib/types';
import { cn } from '../utils/cn';
import LabExamModal from '../components/LabExamModal';

export default function MedicalReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [examModalOpen, setExamModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadPatientData(user.id).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const profile = data?.profile;
  const treatment = data?.treatment;
  const med = treatment ? findMedication(treatment.medId) : undefined;
  const logs = data?.logs ?? [];
  const weights = data?.weights ?? [];
  const symptoms = data?.symptomLogs ?? [];
  const waterLogs = data?.waterLogs ?? [];
  const labExams = data?.labExams ?? [];

  const startWeight = profile?.startWeightKg ?? (weights.length > 0 ? weights[0].kg : null);
  const currentWeight = weights.length > 0 ? weights[weights.length - 1].kg : startWeight;
  const deltaKg =
    startWeight && currentWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : 0;
  const deltaPct =
    startWeight && currentWeight
      ? Math.round(((currentWeight - startWeight) / startWeight) * 1000) / 10
      : 0;

  const currentImc = imcInfo(currentWeight, profile?.heightCm ?? null);
  const adherence = treatment ? adherenceRate(treatment, logs) : 0;

  // Cálculos nutricionais e hidratação
  const recommendedWaterMl = currentWeight ? Math.round(currentWeight * 35) : 3000;
  const avgWaterMl =
    waterLogs.length > 0
      ? Math.round(waterLogs.reduce((acc, curr) => acc + (curr.ml || 0), 0) / waterLogs.length)
      : 0;

  // Meta de proteína (1.2 a 1.6 g/kg para GLP-1)
  const targetProteinGMin = currentWeight ? Math.round(currentWeight * 1.2) : 100;
  const targetProteinGMax = currentWeight ? Math.round(currentWeight * 1.6) : 150;

  function handlePrint() {
    window.print();
  }

  async function handleSaveExams(updatedExams: LabExam[]) {
    if (!user?.id || !data) return;
    const nextData: PatientData = {
      ...data,
      labExams: updatedExams,
    };
    setData(nextData);
    await savePatientData(user.id, nextData);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-8 dark:bg-slate-950 print:bg-white print:p-0">
      {/* Botões de Ação no Topo (ocultos na impressão) */}
      <div className="mx-auto max-w-3xl mb-4 sm:mb-6 flex items-center justify-between gap-2 print:hidden">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setExamModalOpen(true)}
            className="!px-3 !py-1.5 sm:!px-4 sm:!py-2 text-xs"
          >
            <FlaskConical className="h-4 w-4 text-teal-600" /> Registrar Exames
          </Button>
          <Button onClick={handlePrint} className="!px-3 !py-1.5 sm:!px-4 sm:!py-2 text-xs">
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* Folha do Relatório */}
      <div className="mx-auto max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 print:max-w-none print:border-none print:p-0 print:shadow-none">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
                💉
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                MinhaCaneta — Relatório para Consulta Clínica
              </h1>
            </div>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
              Resumo gerado em {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="self-start sm:self-auto shrink-0">
            <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Acompanhamento GLP-1/GIP
            </span>
          </div>
        </div>

        {/* Dados do Paciente */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 sm:grid-cols-4">
          <div>
            <p className="font-bold text-slate-400">Paciente</p>
            <p className="font-extrabold text-slate-900 dark:text-white truncate">{profile?.name ?? '—'}</p>
          </div>
          <div>
            <p className="font-bold text-slate-400">Nascimento</p>
            <p>
              {profile?.birthDate
                ? new Date(profile.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')
                : '—'}
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-400">Altura</p>
            <p>{profile?.heightCm ? `${profile.heightCm} cm` : '—'}</p>
          </div>
          <div>
            <p className="font-bold text-slate-400">Adesão ao Tratamento</p>
            <p className="font-extrabold text-emerald-600">{Math.min(100, Math.round(adherence))}%</p>
          </div>
        </div>

        {/* Resumo do Tratamento & Peso */}
        <div className="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2">
          {/* Tratamento */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tratamento Farmacológico
            </p>
            <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
              {med?.brand ?? 'Não configurado'}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({med?.activeIngredient ?? ''})
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Dose atual: <strong>{treatment ? fmtMg(treatment.doseMg) : '—'}</strong> ({treatment?.frequency ?? 'semanal'})
            </p>
            <p className="text-xs text-slate-500">
              Início: {treatment?.startDate ? new Date(treatment.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>

          {/* Evolução Ponderal */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Evolução Ponderal
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {currentWeight ? `${currentWeight} kg` : '—'}
              </span>
              {deltaKg !== 0 && (
                <span
                  className={`text-xs font-bold ${deltaKg < 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {deltaKg > 0 ? '+' : ''}
                  {deltaKg} kg ({deltaPct > 0 ? '+' : ''}
                  {deltaPct}%)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Inicial: {startWeight ?? '—'} kg · IMC Atual:{' '}
              <strong>{currentImc ? `${currentImc.imc} (${currentImc.label})` : '—'}</strong>
            </p>
          </div>
        </div>

        {/* NOVO: Hidratação & Proteína / Nutrição */}
        <div className="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2">
          {/* Hidratação */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 bg-sky-50/40 dark:bg-sky-950/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
              <Droplet className="h-3.5 w-3.5 text-sky-600" /> Aporte Hídrico (Água)
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {avgWaterMl > 0 ? `${avgWaterMl} ml` : 'Em registro'}
                </span>
                <span className="text-xs text-slate-400 font-medium"> / dia (média)</span>
              </div>
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                Meta: {recommendedWaterMl} ml/dia
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              * Fundamental para prevenir constipação e sobrecarga renal durante uso de GLP-1 (cálculo de 35 ml/kg).
            </p>
          </div>

          {/* Proteína */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-amber-600" /> Meta de Proteína (Massa Magra)
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {targetProteinGMin}–{targetProteinGMax} g
                </span>
                <span className="text-xs text-slate-400 font-medium"> / dia</span>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                1,2 a 1,6 g/kg
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              * Recomendação clínica para preservação de massa muscular e manutenção da taxa metabólica basal.
            </p>
          </div>
        </div>

        {/* NOVO: Exames Laboratoriais */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-teal-600" /> Exames Laboratoriais Registrados
            </h3>
            <button
              onClick={() => setExamModalOpen(true)}
              className="text-xs font-bold text-teal-600 hover:underline print:hidden flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar / Gerenciar
            </button>
          </div>

          {labExams.length > 0 ? (
            <div className="mt-2 space-y-3">
              {labExams.map((ex) => {
                const homa = ex.fastingGlucoseMgDl && ex.insulinUuMl
                  ? Math.round(((ex.fastingGlucoseMgDl * ex.insulinUuMl) / 405) * 100) / 100
                  : null;

                return (
                  <div key={ex.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5 dark:border-slate-800">
                      <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <FlaskConical className="h-3.5 w-3.5 text-teal-600" /> Coleta realizada em: {new Date(ex.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {ex.notes && (
                        <span className="text-[11px] text-slate-500 italic max-w-xs truncate">
                          {ex.notes}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {/* Glicemia / HOMA */}
                      <div className="rounded-xl bg-white p-2.5 shadow-2xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Glicemia & HbA1c</span>
                        <p className="mt-0.5 font-extrabold text-slate-800 dark:text-slate-100">
                          {ex.fastingGlucoseMgDl ? `${ex.fastingGlucoseMgDl} mg/dL` : '—'} · <span className={cn(ex.hba1cPercent && ex.hba1cPercent < 5.7 ? 'text-emerald-600' : 'text-amber-600')}>{ex.hba1cPercent ? `${ex.hba1cPercent}%` : '—'}</span>
                        </p>
                        {homa !== null && (
                          <span className="text-[10px] font-semibold text-teal-600 block mt-0.5">
                            HOMA-IR: {homa} ({homa <= 2.7 ? 'Normal' : 'Resist. Insulínica'})
                          </span>
                        )}
                      </div>

                      {/* Função Renal */}
                      <div className="rounded-xl bg-white p-2.5 shadow-2xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Função Renal</span>
                        <p className="mt-0.5 font-extrabold text-slate-800 dark:text-slate-100">
                          Creatinina: {ex.creatinineMgDl ? `${ex.creatinineMgDl} mg/dL` : '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Ureia: {ex.ureaMgDl ? `${ex.ureaMgDl} mg/dL` : '—'} {ex.sodiumMEqL ? `· Na: ${ex.sodiumMEqL}` : ''} {ex.potassiumMEqL ? `· K: ${ex.potassiumMEqL}` : ''}
                        </p>
                      </div>

                      {/* Lipídico */}
                      <div className="rounded-xl bg-white p-2.5 shadow-2xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Perfil Lipídico</span>
                        <p className="mt-0.5 font-extrabold text-slate-800 dark:text-slate-100">
                          Col. Tot: {ex.totalCholesterolMgDl ?? '—'} · LDL: {ex.ldlCholesterolMgDl ?? '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          HDL: {ex.hdlCholesterolMgDl ?? '—'} · Triglicerídeos: {ex.triglyceridesMgDl ? `${ex.triglyceridesMgDl} mg/dL` : '—'}
                        </p>
                      </div>

                      {/* Fígado & Pâncreas */}
                      <div className="rounded-xl bg-white p-2.5 shadow-2xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Fígado & Pâncreas</span>
                        <p className="mt-0.5 font-extrabold text-slate-800 dark:text-slate-100">
                          TGO: {ex.tgoUl ?? '—'} · TGP: {ex.tgpUl ?? '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {ex.gamaGtUl ? `G-GT: ${ex.gamaGtUl} · ` : ''}{ex.lipaseUl ? `Lipase: ${ex.lipaseUl} · ` : ''}{ex.amylaseUl ? `Amilase: ${ex.amylaseUl}` : ''}
                        </p>
                      </div>

                      {/* Tireoide */}
                      {(ex.tshUiuMl != null || ex.t4FreeNgDl != null || ex.calcitoninPgMl != null) && (
                        <div className="rounded-xl bg-white p-2.5 shadow-2xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Tireoide & Rastreio</span>
                          <p className="mt-0.5 font-extrabold text-slate-800 dark:text-slate-100">
                            TSH: {ex.tshUiuMl ? `${ex.tshUiuMl} µUI` : '—'} {ex.t4FreeNgDl ? `· T4L: ${ex.t4FreeNgDl}` : ''}
                          </p>
                          {ex.calcitoninPgMl != null && (
                            <p className="text-[10px] text-slate-500">Calcitonina: {ex.calcitoninPgMl} pg/mL</p>
                          )}
                        </div>
                      )}

                      {/* Nutricional & Massa Magra */}
                      {(ex.albuminGDl != null || ex.vitaminDNgMl != null || ex.vitaminB12PgMl != null || ex.ferritinNgMl != null || ex.uricAcidMgDl != null) && (
                        <div className="rounded-xl bg-white p-2.5 shadow-2xs dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Nutrição & Massa Magra</span>
                          <p className="mt-0.5 font-extrabold text-slate-800 dark:text-slate-100">
                            {ex.albuminGDl ? `Albumina: ${ex.albuminGDl} g/dL · ` : ''}{ex.vitaminDNgMl ? `Vit D: ${ex.vitaminDNgMl} ng/mL` : ''}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {ex.vitaminB12PgMl ? `B12: ${ex.vitaminB12PgMl} · ` : ''}{ex.ferritinNgMl ? `Ferritina: ${ex.ferritinNgMl} · ` : ''}{ex.uricAcidMgDl ? `Ác. Úrico: ${ex.uricAcidMgDl}` : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    {ex.ultrasoundNotes && (
                      <div className="mt-2.5 rounded-xl border border-teal-200 bg-white p-2.5 text-xs text-teal-950 dark:border-teal-900/60 dark:bg-slate-800 dark:text-teal-200">
                        <strong className="text-teal-800 dark:text-teal-300">Ultrassonografia Abdominal:</strong> {ex.ultrasoundNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-3.5 text-center dark:border-slate-800 text-xs text-slate-400">
              Nenhum exame laboratorial registrado ainda.{' '}
              <button
                onClick={() => setExamModalOpen(true)}
                className="text-teal-600 font-bold hover:underline print:hidden"
              >
                Clique aqui para cadastrar seus exames.
              </button>
            </div>
          )}
        </div>

        {/* Histórico das Últimas Doses Aplicadas */}
        <div className="mt-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Histórico Completo de Doses Aplicadas ({logs.length} {logs.length === 1 ? 'aplicação' : 'aplicações'} no total)
          </h3>

          {logs.length > 0 ? (
            <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-800">
              {[...logs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((l, index) => {
                  const logMed = findMedication(l.medId);
                  const doseNumber = logs.length - index;
                  return (
                    <div key={l.id} className="flex items-center justify-between p-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {doseNumber}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {fmtDateMedium(new Date(l.date))}
                            </span>
                            <span className="text-slate-400 font-semibold">·</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {logMed?.brand ?? 'Medicação'}
                            </span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {fmtMg(l.doseMg)}
                            </span>
                            {l.isNewPen && (
                              <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                Início de Caneta ✨
                              </span>
                            )}
                          </div>
                          {l.notes && (
                            <p className="mt-0.5 text-[11px] italic text-slate-400">
                              "{l.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {l.site && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {INJECTION_SITE_LABELS[l.site]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-slate-400">Nenhuma dose registrada ainda.</p>
          )}
        </div>

        {/* Diário de Sintomas / Efeitos Colaterais */}
        <div className="mt-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Sintomas e Reações Adversas Reportadas
          </h3>

          {symptoms.length > 0 ? (
            <div className="mt-2 space-y-2">
              {symptoms
                .slice(-5)
                .reverse()
                .map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {fmtDateMedium(new Date(s.date))}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Intensidade: {s.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      <strong>Sintomas:</strong> {s.symptoms.join(', ')}
                    </p>
                    {s.note && <p className="mt-0.5 italic text-slate-500">"{s.note}"</p>}
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-slate-400">
              Nenhum sintoma adverso significativo registrado no período.
            </p>
          )}
        </div>

        {/* Rodapé / Aviso Legal */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-[10px] text-slate-400 dark:border-slate-800">
          <p>
            * Este relatório é um documento informativo gerado pelo aplicativo MinhaCaneta a partir
            dos dados inseridos pelo próprio paciente. Não substitui prontuário médico nem laudo
            laboratorial.
          </p>
        </div>
      </div>

      {/* Modal de Gerenciamento de Exames */}
      <LabExamModal
        isOpen={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        exams={labExams}
        onSaveExams={handleSaveExams}
      />
    </div>
  );
}
