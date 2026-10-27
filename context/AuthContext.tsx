import { isAuthRetryableFetchError, type Session, type User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { secureStorage } from '@/lib/secureStorage';
import { AUTH_STORAGE_KEY, supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** true mientras se lee la sesion guardada al abrir la app. */
  loading: boolean;
  /** Devuelven un mensaje de error listo para mostrar, o null si todo salio bien. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Traduce los errores de Supabase Auth al espanol. */
function authErrorMessage(error: { message: string; code?: string }): string {
  if (isAuthRetryableFetchError(error) || /network|fetch/i.test(error.message)) {
    return 'Sin conexión a internet. Para iniciar sesión o registrarte necesitas señal.';
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya existe una cuenta con ese correo.';
    case 'weak_password':
      return 'La contraseña es muy débil: usa al menos 6 caracteres.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'El correo no es válido.';
    case 'email_not_confirmed':
      return 'Debes confirmar tu correo antes de ingresar.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
    default:
      return error.message;
  }
}

/**
 * Sin internet y con el access token vencido, getSession() intenta renovarlo,
 * falla por la red y devuelve null aunque la sesion siga guardada. Para que la
 * app funcione en modo avion se usa la sesion guardada en SecureStore; cuando
 * vuelva la conexion el cliente la renueva solo (autoRefreshToken).
 */
async function readStoredSession(): Promise<Session | null> {
  const raw = await secureStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Session;
    return stored.user ? stored : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      let current = data.session;
      if (!current && error && isAuthRetryableFetchError(error)) {
        current = await readStoredSession();
      }
      if (mounted) {
        setSession(current);
        setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // La sesion inicial ya la resolvio getSession() arriba (con el respaldo offline)
      if (event === 'INITIAL_SESSION') return;
      setSession(newSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? authErrorMessage(error) : null;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return authErrorMessage(error);
    if (!data.session) {
      return 'Cuenta creada, pero Supabase pide confirmar el correo. Desactiva "Confirm email" en Authentication > Sign In / Providers > Email.';
    }
    return null;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Sin conexion y con el token vencido supabase-js devuelve el error sin
    // borrar la sesion guardada: se borra a mano para que no reviva al reabrir
    if (error) await secureStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
