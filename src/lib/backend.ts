import { supabase, isSupabaseConfigured } from './supabase';
import type { AuthUser, PatientData, Profile, SignUpPayload } from './types';

/* ============================================================
 * Camada de autenticação e dados.
 * - Com Supabase configurado: Auth do Supabase + tabela patient_data
 * - Sem Supabase: simulação local (localStorage) para demonstração
 * ============================================================ */

const DEMO_USERS_KEY = 'minhacaneta_demo_users';
const DEMO_SESSION_KEY = 'minhacaneta_demo_session';
const DEMO_DATA_PREFIX = 'minhacaneta_demo_data_';

interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  verified: boolean;
  isAdmin?: boolean;
}

/* ---------- super admin (modo demo): conta administradora ---------- */

const DEMO_ADMIN = { id: 'demo-admin', email: 'admin@minhacaneta.app', password: 'admin123', name: 'Super Admin', verified: true, isAdmin: true };

function ensureDemoAdmin(): void {
  const users = readJson<DemoUser[]>(DEMO_USERS_KEY, []);
  if (!users.some((u) => u.email === DEMO_ADMIN.email)) {
    writeJson(DEMO_USERS_KEY, [...users, DEMO_ADMIN]);
  }
}

/** Verifica se o usuário é o super admin do aplicativo. */
export async function checkSuperAdmin(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    ensureDemoAdmin();
    const u = demoUsers().find((x) => x.id === userId);
    return Boolean(u?.isAdmin);
  }
  const { data, error } = await supabase!
    .from('super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.user_id);
}

export const DEMO_ADMIN_CREDENTIALS = { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password };

export const authMode = isSupabaseConfigured ? 'supabase' : 'demo';

/** URL de retorno para links de verificação/redefinição do Supabase.
 *  Sem hash próprio: o supabase-js anexa os tokens e detecta a sessão. */
const REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '/';

/* ---------------- helpers demo ---------------- */

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

function demoUsers(): DemoUser[] {
  return readJson<DemoUser[]>(DEMO_USERS_KEY, []);
}

function findDemoUserByEmail(email: string): DemoUser | undefined {
  return demoUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------------- auth: sign up ---------------- */

export interface AuthResult {
  ok: boolean;
  needsVerification: boolean;
  message?: string;
}

export async function signUp(payload: SignUpPayload): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    const users = demoUsers();
    if (findDemoUserByEmail(payload.email)) {
      return { ok: false, needsVerification: false, message: 'Já existe uma conta com este e-mail. Faça login.' };
    }
    const user: DemoUser = {
      id: uid(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      name: payload.name.trim(),
      verified: false,
    };
    writeJson(DEMO_USERS_KEY, [...users, user]);
    const data = makeInitialData(payload);
    writeJson(DEMO_DATA_PREFIX + user.id, data);
    localStorage.setItem(DEMO_SESSION_KEY, user.id);
    return { ok: true, needsVerification: true, message: 'Conta criada! Verifique seu e-mail para ativar.' };
  }

  const name = payload.name.trim();
  const normalizedEmail = payload.email.trim().toLowerCase();

  // Guarda localmente como contingência caso o Supabase RLS barre persistInitialData antes do primeiro login
  try {
    localStorage.setItem(`minhacaneta_pending_reg_${normalizedEmail}`, JSON.stringify(payload));
  } catch {
    // ignore
  }

  const { data: authData, error } = await supabase!.auth.signUp({
    email: normalizedEmail,
    password: payload.password,
    options: {
      data: {
        name,
        role: payload.professional ? 'professional' : 'patient',
        professional: payload.professional,
        sex: payload.sex,
        birthDate: payload.birthDate,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        startWeightKg: payload.startWeightKg,
        heightCm: payload.heightCm,
      },
      emailRedirectTo: REDIRECT_URL,
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { ok: false, needsVerification: false, message: 'Já existe uma conta com este e-mail. Faça login.' };
    }
    return { ok: false, needsVerification: false, message: error.message };
  }
  const userId = authData.user?.id;
  if (userId) {
    await persistInitialData(userId, payload);
  }
  return {
    ok: true,
    needsVerification: true,
    message: 'Conta criada! Enviamos um link de confirmação para o seu e-mail.',
  };
}

export async function resendVerification(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: true, needsVerification: true, message: 'E-mail de verificação reenviado (simulado).' };
  const { error } = await supabase!.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: REDIRECT_URL },
  });
  if (error) return { ok: false, needsVerification: true, message: error.message };
  return { ok: true, needsVerification: true, message: 'E-mail de verificação reenviado.' };
}

/* ---------------- auth: sign in / out ---------------- */

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    const user = findDemoUserByEmail(email);
    if (!user || user.password !== password) {
      return { ok: false, needsVerification: false, message: 'E-mail ou senha incorretos.' };
    }
    if (!user.verified) {
      return { ok: false, needsVerification: true, message: 'Verifique seu e-mail antes de entrar.' };
    }
    localStorage.setItem(DEMO_SESSION_KEY, user.id);
    return { ok: true, needsVerification: false };
  }

  const { error } = await supabase!.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return { ok: false, needsVerification: true, message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.' };
    }
    return { ok: false, needsVerification: false, message: 'E-mail ou senha incorretos.' };
  }
  return { ok: true, needsVerification: false };
}

export async function verifyDemoEmail(): Promise<AuthResult> {
  const sessionId = localStorage.getItem(DEMO_SESSION_KEY);
  if (!sessionId) return { ok: false, needsVerification: false, message: 'Nenhuma sessão pendente.' };
  const users = demoUsers();
  const idx = users.findIndex((u) => u.id === sessionId);
  if (idx === -1) return { ok: false, needsVerification: false, message: 'Conta não encontrada.' };
  users[idx].verified = true;
  writeJson(DEMO_USERS_KEY, users);
  return { ok: true, needsVerification: false, message: 'E-mail verificado! Conta ativada.' };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: true, needsVerification: false, message: 'Se esta conta existir, um link de redefinição foi enviado (simulado).' };
  const { error } = await supabase!.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: REDIRECT_URL,
  });
  if (error) return { ok: false, needsVerification: false, message: error.message };
  return { ok: true, needsVerification: false, message: 'Se esta conta existir, um link de redefinição foi enviado.' };
}

export async function signOutUser(): Promise<void> {
  if (!isSupabaseConfigured) {
    localStorage.removeItem(DEMO_SESSION_KEY);
    return;
  }
  await supabase!.auth.signOut();
}

/* ---------------- auth: session ---------------- */

function demoSessionUser(): AuthUser | null {
  const sessionId = localStorage.getItem(DEMO_SESSION_KEY);
  if (!sessionId) return null;
  const user = demoUsers().find((u) => u.id === sessionId);
  if (!user || !user.verified) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function getSessionUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured) {
    ensureDemoAdmin();
    return demoSessionUser();
  }
  const { data } = await supabase!.auth.getSession();
  const su = data.session?.user;
  if (!su) return null;
  const meta = su.user_metadata as (Record<string, unknown> & { name?: string; professional?: import('./types').ProfessionalInfo }) | undefined;
  return {
    id: su.id,
    email: su.email ?? '',
    name: meta?.name ?? su.email?.split('@')[0] ?? 'Paciente',
    professional: meta?.professional,
    metadata: meta,
  };
}

/** Assina mudanças de sessão. Retorna função para cancelar. */
export function subscribeAuth(cb: (user: AuthUser | null) => void): () => void {
  if (!isSupabaseConfigured) {
    const initial = demoSessionUser();
    cb(initial);
    const onStorage = () => cb(demoSessionUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }
  const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
    const su = session?.user;
    if (!su) {
      cb(null);
      return;
    }
    const meta = su.user_metadata as (Record<string, unknown> & { name?: string; professional?: import('./types').ProfessionalInfo }) | undefined;
    cb({
      id: su.id,
      email: su.email ?? '',
      name: meta?.name ?? su.email?.split('@')[0] ?? 'Paciente',
      professional: meta?.professional,
      metadata: meta,
    });
  });
  return () => data.subscription.unsubscribe();
}

/* ---------------- dados do paciente ---------------- */

function makeInitialData(payload: SignUpPayload): PatientData {
  const profile: Profile = {
    name: payload.name.trim(),
    sex: payload.sex,
    birthDate: payload.birthDate,
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    startWeightKg: payload.startWeightKg,
    heightCm: payload.heightCm,
    professional: payload.professional,
  };
  return {
    profile,
    treatment: null,
    logs: [],
    weights:
      payload.startWeightKg != null ? [{ date: new Date().toISOString(), kg: payload.startWeightKg }] : [],
  };
}

async function persistInitialData(userId: string, payload: SignUpPayload): Promise<void> {
  const data = makeInitialData(payload);
  const { error } = await supabase!
    .from('patient_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  if (error) console.warn('Falha ao salvar dados iniciais:', error.message);
}

export async function loadPatientData(userId: string): Promise<PatientData | null> {
  if (!isSupabaseConfigured) {
    const raw = readJson<PatientData | null>(DEMO_DATA_PREFIX + userId, null);
    return raw;
  }
  const { data, error } = await supabase!
    .from('patient_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Falha ao carregar dados:', error.message);
    return null;
  }
  return (data?.data as PatientData | undefined) ?? null;
}

export async function savePatientData(userId: string, data: PatientData): Promise<void> {
  if (!isSupabaseConfigured) {
    writeJson(DEMO_DATA_PREFIX + userId, data);
    return;
  }
  const { error } = await supabase!
    .from('patient_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  if (error) console.warn('Falha ao salvar dados:', error.message);
}

export async function removeAllDemoData(): Promise<void> {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('minhacaneta_')) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function isDemoMode(): boolean {
  return authMode === 'demo';
}
