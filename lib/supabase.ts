import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { secureStorage } from './secureStorage';

/**
 * Cliente unico de Supabase. Se usa solo para iniciar sesion y al sincronizar:
 * los datos de la app se leen y escriben siempre en SQLite.
 *
 * Las variables viven en `.env` (ver `.env.example`). Solo va la publishable
 * key: nunca la secret key ni la contrasena de la base de datos.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env (copia .env.example)',
  );
}

/** Clave fija con la que la sesion se guarda en SecureStore. */
export const AUTH_STORAGE_KEY = 'mi-tienda-auth';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: secureStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refrescar el token solo con la app en primer plano (recomendacion oficial para React Native)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
