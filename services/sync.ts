import { productsRepo, type CloudProduct } from '@/db/repositories/products';
import { supabase } from '@/lib/supabase';

/** Fila de public.products tal como la devuelve PostgREST (snake_case). */
interface CloudRow {
  client_id: string;
  name: string;
  quantity: number;
  price: number;
  updated_at: string;
  deleted_at: string | null;
}

export interface SyncResult {
  /** Productos pendientes que se enviaron a la nube. */
  uploaded: number;
  /** Productos que estaban en la nube y no en el telefono. */
  downloaded: number;
  /** Productos locales reemplazados por una version mas nueva de la nube. */
  updated: number;
}

function toCloudProduct(row: CloudRow): CloudProduct {
  return {
    clientId: row.client_id,
    name: row.name,
    quantity: row.quantity,
    price: row.price,
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

/** Traduce los errores de Supabase/red a un mensaje que entienda el tendero. */
function toSyncError(error: { message: string; code?: string }): Error {
  const msg = error.message ?? '';
  if (/network request failed|failed to fetch|network|timeout/i.test(msg)) {
    return new Error('Sin conexión a internet. Tus cambios siguen guardados en el teléfono.');
  }
  if (error.code === '42703') {
    return new Error('A la tabla de Supabase le falta la columna deleted_at: ejecuta supabase/schema.sql.');
  }
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error('No existe la tabla products en Supabase: ejecuta supabase/schema.sql.');
  }
  return new Error(`No se pudo sincronizar: ${msg}`);
}

/**
 * Sincroniza los productos del usuario en dos pasos, en este orden:
 *
 * 1. Bajar: trae de Supabase los productos del usuario. Los que no existen
 *    en el telefono (comparando por client_id) se insertan ya marcados como
 *    sincronizados. Si existen y la version de la nube es mas reciente, la
 *    nube gana ("gana el ultimo cambio").
 * 2. Subir: envia los pendientes con upsert por client_id (asi nunca se
 *    duplican filas) y los marca con syncedAt = updatedAt que se subio.
 */
export async function syncProducts(userId: string): Promise<SyncResult> {
  // 1. Bajar
  const { data, error } = await supabase
    .from('products')
    .select('client_id, name, quantity, price, updated_at, deleted_at')
    .eq('user_id', userId)
    .returns<CloudRow[]>();
  if (error) throw toSyncError(error);

  let downloaded = 0;
  let updated = 0;
  for (const row of data) {
    const remote = toCloudProduct(row);
    const local = await productsRepo.findByClientId(userId, remote.clientId);
    if (!local) {
      // Borrado en la nube y nunca estuvo en este telefono: no hay nada que traer
      if (remote.deletedAt) continue;
      await productsRepo.insertFromCloud(userId, remote);
      downloaded++;
    } else if (remote.updatedAt.getTime() > local.updatedAt.getTime()) {
      await productsRepo.overwriteFromCloud(userId, remote);
      updated++;
    }
  }

  // 2. Subir
  const pending = await productsRepo.listPending(userId);
  if (pending.length > 0) {
    const { error: upsertError } = await supabase.from('products').upsert(
      pending.map((p) => ({
        client_id: p.clientId,
        user_id: userId,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        updated_at: p.updatedAt.toISOString(),
        deleted_at: p.deletedAt ? p.deletedAt.toISOString() : null,
      })),
      { onConflict: 'client_id' },
    );
    if (upsertError) throw toSyncError(upsertError);

    for (const p of pending) {
      await productsRepo.markSynced(p.clientId, p.updatedAt);
    }
  }

  return { uploaded: pending.length, downloaded, updated };
}

/** "2 subidos, 1 bajado" (y las actualizaciones si las hubo). */
export function describeSyncResult(r: SyncResult): string {
  const plural = (n: number, singular: string, pluralWord: string) =>
    `${n} ${n === 1 ? singular : pluralWord}`;
  const parts = [plural(r.uploaded, 'subido', 'subidos'), plural(r.downloaded, 'bajado', 'bajados')];
  if (r.updated > 0) parts.push(plural(r.updated, 'actualizado', 'actualizados'));
  return parts.join(', ');
}
