import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  isPending,
  productsRepo,
  type Product,
  type ProductInput,
} from '@/db/repositories/products';
import { normalizeText } from '@/lib/format';

export type { Product, ProductInput };
export { isPending };

/**
 * Lista reactiva del inventario (useLiveQuery): se actualiza sola al crear,
 * editar, borrar o sincronizar. Los totales son de todo el inventario; la
 * busqueda solo filtra lo que se ve.
 */
export function useProducts(userId: string, search = '') {
  const { data } = useLiveQuery(productsRepo.queryByUser(userId), [userId]);

  const summary = useMemo(() => {
    const active = data.filter((p) => p.deletedAt === null);
    const term = normalizeText(search.trim());
    const visible = term ? active.filter((p) => normalizeText(p.name).includes(term)) : active;
    return {
      products: visible,
      productCount: active.length,
      totalUnits: active.reduce((sum, p) => sum + p.quantity, 0),
      totalValue: active.reduce((sum, p) => sum + p.quantity * p.price, 0),
      // Incluye los borrados que aun no se han subido: tambien son cambios pendientes
      pendingCount: data.filter(isPending).length,
    };
  }, [data, search]);

  const remove = useCallback((id: number) => productsRepo.remove(id), []);

  return { ...summary, remove };
}

/** Carga un producto para editarlo (si hay id) y lo guarda en SQLite. */
export function useProduct(userId: string, id: number | null) {
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(id !== null);

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;
    productsRepo.findById(id).then((p) => {
      if (cancelled) return;
      // Solo se puede editar un producto propio que no este borrado
      setProduct(p && p.userId === userId && p.deletedAt === null ? p : undefined);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  const save = useCallback(
    (input: ProductInput) =>
      id === null ? productsRepo.create(userId, input) : productsRepo.update(id, input),
    [id, userId],
  );

  const remove = useCallback(async () => {
    if (id !== null) await productsRepo.remove(id);
  }, [id]);

  return { product, loading, save, remove };
}
