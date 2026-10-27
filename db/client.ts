import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// enableChangeListener es obligatorio para que useLiveQuery se entere de los cambios
const sqlite = openDatabaseSync('mi-tienda.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
