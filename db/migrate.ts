import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '@/drizzle/migrations';

import { db } from './client';

/** Aplica las migraciones generadas con `npx drizzle-kit generate` al abrir la app. */
export function useDatabaseMigrations() {
  return useMigrations(db, migrations);
}
