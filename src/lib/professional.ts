import { supabase, isSupabaseConfigured } from './supabase';
import { loadPatientData, savePatientData } from './backend';
import type { PatientData, PatientLink, ProfessionalRole } from './types';

/* ============================================================
 * Vínculo Paciente ⇄ Profissional
 * - Paciente gera um código curto e compartilha com o profissional.
 * - Profissional solicita vínculo pelo código (fica "pendente").
 * - Paciente aprova/recusa. Cada profissional só enxerga o escopo
 *   do seu papel (médico, nutricionista ou personal).
 * ============================================================ */

const DIRECTORY_KEY = 'minhacaneta_patient_directory'; // code -> {userId,name,email}
const LINKS_KEY = 'minhacaneta_patient_links';

interface DirectoryEntry {
  code: string;
  userId: string;
  name: string;
  email: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ---------------- código do paciente ---------------- */

/** Garante que o paciente tenha um código e o registra no diretório (para o profissional localizar). */
export async function ensurePatientCode(userId: string, name: string, email: string): Promise<string> {
  const data = await loadPatientData(userId);
  if (data?.profile.patientCode) {
    await registerDirectory(data.profile.patientCode, userId, name, email);
    return data.profile.patientCode;
  }
  const code = randomCode();
  if (data) {
    await savePatientData(userId, { ...data, profile: { ...data.profile, patientCode: code } });
  }
  await registerDirectory(code, userId, name, email);
  return code;
}

async function registerDirectory(code: string, userId: string, name: string, email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const dir = readJson<DirectoryEntry[]>(DIRECTORY_KEY, []);
    if (!dir.some((d) => d.code === code)) {
      writeJson(DIRECTORY_KEY, [...dir.filter((d) => d.userId !== userId), { code, userId, name, email }]);
    }
    return;
  }
  const { error } = await supabase!.from('patient_codes').upsert({ code, user_id: userId, name, email });
  if (error) console.warn('Falha ao registrar código do paciente:', error.message);
}

async function findPatientByCode(code: string): Promise<DirectoryEntry | null> {
  const normalized = code.trim().toUpperCase();
  if (!isSupabaseConfigured) {
    const dir = readJson<DirectoryEntry[]>(DIRECTORY_KEY, []);
    return dir.find((d) => d.code === normalized) ?? null;
  }
  const { data, error } = await supabase!.from('patient_codes').select('code,user_id,name,email').eq('code', normalized).maybeSingle();
  if (error || !data) return null;
  return { code: data.code, userId: data.user_id, name: data.name, email: data.email };
}

/* ---------------- vínculos ---------------- */

function readLinks(): PatientLink[] {
  return readJson<PatientLink[]>(LINKS_KEY, []);
}
function writeLinks(links: PatientLink[]) {
  writeJson(LINKS_KEY, links);
}

export interface RequestLinkResult {
  ok: boolean;
  message: string;
}

/** Profissional solicita acesso a um paciente usando o código dele. */
export async function requestPatientLink(
  professionalId: string,
  professionalName: string,
  professionalEmail: string,
  role: ProfessionalRole,
  patientCode: string,
): Promise<RequestLinkResult> {
  const entry = await findPatientByCode(patientCode);
  if (!entry) return { ok: false, message: 'Código de paciente não encontrado. Confira com o paciente.' };

  if (!isSupabaseConfigured) {
    const links = readLinks();
    const existing = links.find((l) => l.patientId === entry.userId && l.professionalId === professionalId && l.role === role);
    if (existing && existing.status === 'aprovado') return { ok: false, message: 'Você já tem acesso a este paciente.' };
    if (existing && existing.status === 'pendente') return { ok: false, message: 'Solicitação já enviada, aguardando aprovação do paciente.' };
    const link: PatientLink = {
      id: uid(),
      patientId: entry.userId,
      patientName: entry.name,
      patientEmail: entry.email,
      professionalId,
      professionalName,
      professionalEmail,
      role,
      status: 'pendente',
      createdAt: new Date().toISOString(),
    };
    writeLinks([...links.filter((l) => l.id !== existing?.id), link]);
    return { ok: true, message: `Solicitação enviada para ${entry.name}. Aguarde a aprovação.` };
  }

  const { error } = await supabase!.from('patient_links').insert({
    patient_id: entry.userId,
    patient_name: entry.name,
    patient_email: entry.email,
    professional_id: professionalId,
    professional_name: professionalName,
    professional_email: professionalEmail,
    role,
    status: 'pendente',
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Solicitação enviada para ${entry.name}. Aguarde a aprovação.` };
}

export async function listLinksForPatient(patientId: string): Promise<PatientLink[]> {
  if (!isSupabaseConfigured) {
    return readLinks()
      .filter((l) => l.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await supabase!.from('patient_links').select('*').eq('patient_id', patientId);
  if (error || !data) return [];
  return data.map(mapDbLink).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listLinksForProfessional(professionalId: string): Promise<PatientLink[]> {
  if (!isSupabaseConfigured) {
    return readLinks()
      .filter((l) => l.professionalId === professionalId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await supabase!.from('patient_links').select('*').eq('professional_id', professionalId);
  if (error || !data) return [];
  return data.map(mapDbLink).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function respondToLink(linkId: string, status: 'aprovado' | 'recusado' | 'revogado'): Promise<void> {
  if (!isSupabaseConfigured) {
    const links = readLinks();
    writeLinks(links.map((l) => (l.id === linkId ? { ...l, status, respondedAt: new Date().toISOString() } : l)));
    return;
  }
  await supabase!.from('patient_links').update({ status, responded_at: new Date().toISOString() }).eq('id', linkId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbLink(row: any): PatientLink {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientEmail: row.patient_email,
    professionalId: row.professional_id,
    professionalName: row.professional_name,
    professionalEmail: row.professional_email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? undefined,
  };
}

/** Carrega os dados do paciente para um profissional já aprovado. */
export async function loadPatientDataForProfessional(patientId: string): Promise<PatientData | null> {
  return loadPatientData(patientId);
}

export async function savePatientDataAsProfessional(patientId: string, updater: (prev: PatientData) => PatientData): Promise<void> {
  const current = await loadPatientData(patientId);
  if (!current) return;
  await savePatientData(patientId, updater(current));
}
