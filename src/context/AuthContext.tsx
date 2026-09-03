import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOutUser,
  getSessionUser,
  subscribeAuth,
  type AuthResult,
} from '../lib/backend';
import type { AuthUser, SignUpPayload } from '../lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  sessionReady: boolean;
  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getSessionUser();
        if (!cancelled) {
          setUser(u);
          setSessionReady(true);
        }
      } catch {
        if (!cancelled) setSessionReady(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const unsubscribe = subscribeAuth((u) => {
      if (!cancelled) setUser(u);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refreshSession = async () => {
    const u = await getSessionUser();
    setUser(u);
  };

  const value: AuthContextValue = {
    user,
    loading,
    sessionReady,
    signUp: apiSignUp,
    signIn: async (email, password) => {
      const res = await apiSignIn(email, password);
      if (res.ok) await refreshSession();
      return res;
    },
    refreshSession,
    signOut: async () => {
      await signOutUser();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
