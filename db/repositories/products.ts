import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db } from '@/db/client';
import { products, type Product } from '@/db/schema';

export type { Product };

/** Lo que el formulario puede crear o editar. */
export interface ProductInput {
  name: string;
  quantity: number;
  price: number;
}

/** Un producto tal como llega de Supabase, ya traducido a camelCase. */
export interface CloudProduct {
  clientId: string;
  name: string;
  quantity: number;
  price: number;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Pendiente = nunca subido, o modificado despues de la version que quedo en la nube. */
export function isPending(p: Pick<Product, 'syncedAt' | 'updatedAt'>): boolean {
  return p.syncedAt === null || p.syncedAt.getTime() < p.updatedAt.getTime();
}

const pendingCondition = or(isNull(products.syncedAt), lt(products.syncedAt, products.updatedAt));

/** Unica capa que conoce Drizzle: hooks, servicios y pantallas solo ven `Product`. */
export const productsRepo = {
  /**
   * Consulta para `useLiveQuery`: todos los productos del usuario, incluidos
   * los borrados logicamente (hacen falta para contar los pendientes de subir).
   */
  queryByUser(userId: string) {
    return db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(sql`${products.name} collate nocase`);
  },

  async findById(id: number): Promise<Product | undefined> {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0];
  },

  async create(userId: string, input: ProductInput): Promise<void> {
    await db.insert(products).values({
      clientId: Crypto.randomUUID(),
      userId,
      name: input.name,
      quantity: input.quantity,
      price: input.price,
      updatedAt: new Date(),
      syncedAt: null,
    });
  },

  async update(id: number, input: ProductInput): Promise<void> {
    await db
      .update(products)
      .set({ name: input.name, quantity: input.quantity, price: input.price, updatedAt: new Date() })
      .where(eq(products.id, id));
  },

  /**
   * Si el producto nunca llego a la nube se borra de verdad. Si ya estaba en
   * la nube se marca con deletedAt (y cambia updatedAt, asi queda pendiente)
   * para que la siguiente sincronizacion propague el borrado.
   */
  async remove(id: number): Promise<void> {
    const product = await productsRepo.findById(id);
    if (!product) return;
    if (product.syncedAt === null) {
      await db.delete(products).where(eq(products.id, id));
      return;
    }
    const now = new Date();
    await db.update(products).set({ deletedAt: now, updatedAt: now }).where(eq(products.id, id));
  },

  // ---- Usado por services/sync.ts ----

  async findByClientId(userId: string, clientId: string): Promise<Product | undefined> {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.userId, userId), eq(products.clientId, clientId)))
      .limit(1);
    return rows[0];
  },

  async listPending(userId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(and(eq(products.userId, userId), pendingCondition));
  },

  /** Guarda un producto que vino de la nube, marcado como sincronizado. */
  async insertFromCloud(userId: string, p: CloudProduct): Promise<void> {
    await db.insert(products).values({
      clientId: p.clientId,
      userId,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      updatedAt: p.updatedAt,
      syncedAt: p.updatedAt,
      deletedAt: p.deletedAt,
    });
  },

  /** Reemplaza la copia local por la de la nube (regla "gana el ultimo cambio"). */
  async overwriteFromCloud(userId: string, p: CloudProduct): Promise<void> {
    await db
      .update(products)
      .set({
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        updatedAt: p.updatedAt,
        syncedAt: p.updatedAt,
        deletedAt: p.deletedAt,
      })
      .where(and(eq(products.userId, userId), eq(products.clientId, p.clientId)));
  },

  /**
   * Marca como sincronizado con syncedAt = updatedAt que se subio. El filtro
   * por updatedAt evita marcar como subida una edicion hecha mientras se
   * sincronizaba: esa edicion sigue pendiente.
   */
  async markSynced(clientId: string, uploadedUpdatedAt: Date): Promise<void> {
    await db
      .update(products)
      .set({ syncedAt: uploadedUpdatedAt })
      .where(and(eq(products.clientId, clientId), eq(products.updatedAt, uploadedUpdatedAt)));
  },
};
