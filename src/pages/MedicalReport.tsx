import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Printer, Stethoscope } from 'lucide-react';
import { Button, Card, SectionTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { loadPatientData } from '../lib/backend';
import { findMedication } from '../data/medications';
import { adherenceRate, fmtDateLong, fmtDateMedium, fmtMg, imcInfo } from '../lib/schedule';
import type { PatientData } from '../lib/types';
import { INJECTION_SITE_LABELS } from '../lib/types';

export default function MedicalReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

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

  function handlePrint() {
    window.print();
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

        <Button onClick={handlePrint} className="!px-3 !py-1.5 sm:!px-4 sm:!py-2 text-xs">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
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
              Dose semanal atual: <strong>{treatment ? fmtMg(treatment.doseMg) : '—'}</strong>
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

        {/* Histórico das Últimas Doses Aplicadas */}
        <div className="mt-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Últimas Doses Registradas ({logs.length} aplicações no total)
          </h3>

          {logs.length > 0 ? (
            <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-800">
              {logs
                .slice(-6)
                .reverse()
                .map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {fmtDateMedium(new Date(l.date))}
                        </span>
                        <span className="ml-2 text-slate-500">Dose: {fmtMg(l.doseMg)}</span>
                      </div>
                    </div>
                    <div>
                      {l.site && (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {INJECTION_SITE_LABELS[l.site]}
                        </span>
                      )}
                      {l.notes && <span className="ml-2 italic text-slate-400">"{l.notes}"</span>}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
