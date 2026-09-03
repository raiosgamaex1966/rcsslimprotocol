import { useEffect, useState } from 'react';
import { Check, ClipboardCopy, ShieldOff, Stethoscope, HeartPulse, Dumbbell, UserCheck2, X } from 'lucide-react';
import { Badge, Button, Card, SectionTitle } from './ui';
import { ensurePatientCode, listLinksForPatient, respondToLink } from '../lib/professional';
import { PROFESSIONAL_ROLE_LABEL, type PatientLink, type ProfessionalRole } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  userId: string;
  name: string;
  email: string;
}

const ROLE_ICON: Record<ProfessionalRole, typeof Stethoscope> = {
  medico: Stethoscope,
  nutricionista: HeartPulse,
  personal: Dumbbell,
};

export default function PatientConnections({ userId, name, email }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [links, setLinks] = useState<PatientLink[]>([]);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const c = await ensurePatientCode(userId, name, email);
    setCode(c);
    setLinks(await listLinksForPatient(userId));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleRespond(id: string, status: 'aprovado' | 'recusado' | 'revogado') {
    await respondToLink(id, status);
    setLinks(await listLinksForPatient(userId));
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const pending = links.filter((l) => l.status === 'pendente');
  const approved = links.filter((l) => l.status === 'aprovado');

  return (
    <Card className="p-6">
      <SectionTitle
        icon={<UserCheck2 className="h-4 w-4 text-brand-600" />}
        title="Profissionais conectados"
        subtitle="Compartilhe seu código para que médico, nutricionista ou personal acompanhem seu tratamento"
      />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-500/25 dark:bg-brand-950">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">Meu código de paciente</p>
          <p className="font-mono text-lg font-extrabold tracking-[0.2em] text-brand-800 dark:text-brand-200">{code ?? '······'}</p>
        </div>
        <Button variant="secondary" onClick={copyCode} className="!px-3 !py-2 text-xs">
          <ClipboardCopy className="h-3.5 w-3.5" /> {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600">Solicitações pendentes</p>
          <div className="mt-2 space-y-2">
            {pending.map((l) => {
              const Icon = ROLE_ICON[l.role];
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-slate-900">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{l.professionalName}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {PROFESSIONAL_ROLE_LABEL[l.role]} · {l.professionalEmail}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRespond(l.id, 'aprovado')} className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600" title="Aprovar">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRespond(l.id, 'recusado')} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-500/15" title="Recusar">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Acesso concedido</p>
        {approved.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
            Nenhum profissional conectado ainda.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {approved.map((l) => {
              const Icon = ROLE_ICON[l.role];
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-white', l.role === 'medico' ? 'bg-blue-500' : l.role === 'nutricionista' ? 'bg-emerald-500' : 'bg-cyan-500')}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{l.professionalName}</p>
                    <Badge className="mt-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{PROFESSIONAL_ROLE_LABEL[l.role]}</Badge>
                  </div>
                  <button onClick={() => handleRespond(l.id, 'revogado')} className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500" title="Revogar acesso">
                    <ShieldOff className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
