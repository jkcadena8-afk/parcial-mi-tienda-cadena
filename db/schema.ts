import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Tabla local de productos. SQLite es la fuente de verdad: la app siempre lee
 * y escribe aqui; Supabase es solo el respaldo.
 *
 * OJO: este archivo lo lee drizzle-kit con Node, asi que no puede importar
 * expo-crypto ni ningun paquete de Expo. El UUID se genera en el repositorio.
 */
export const products = sqliteTable('products', {
  /** Llave local. */
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** UUID que identifica el mismo producto en el telefono y en la nube. */
  clientId: text('client_id').notNull().unique(),
  /** Dueno del producto: si otra cuenta inicia sesion en el telefono no ve ni sube estos datos. */
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  /** Unidades en existencia. */
  quantity: integer('quantity').notNull(),
  /** Precio en pesos, sin decimales. */
  price: integer('price').notNull(),
  /** Ultima modificacion. Cada creacion, edicion o borrado escribe new Date(). */
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  /** Version (updatedAt) que quedo en la nube. Vacio = nunca se ha subido. */
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
  /** Borrado logico: el producto se oculta pero se conserva para sincronizar el borrado. */
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
