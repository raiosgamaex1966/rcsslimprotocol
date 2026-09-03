import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Configuração do Supabase via variáveis de ambiente (Vite):
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * Se as chaves não estiverem presentes no build, o app entra em
 * MODO DEMONSTRAÇÃO (auth + dados locais no navegador), permitindo
 * testar todo o fluxo sem servidor.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const AUTH_MODE_LABEL = isSupabaseConfigured
  ? 'Supabase conectado'
  : 'Modo demonstração (dados locais)';
