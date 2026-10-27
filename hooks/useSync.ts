import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

import { describeSyncResult, syncProducts } from '@/services/sync';

export interface SyncMessage {
  text: string;
  isError: boolean;
}

/**
 * Estado del boton Sincronizar y sincronizacion automatica al recuperar la
 * conexion (punto extra). Nunca corren dos sincronizaciones a la vez.
 */
export function useSync(userId: string) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<SyncMessage | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const running = useRef(false);

  const sync = useCallback(
    async (auto = false) => {
      if (running.current) return;
      running.current = true;
      setSyncing(true);
      try {
        const result = await syncProducts(userId);
        const prefix = auto ? 'Conexión recuperada: ' : '';
        setMessage({ text: `${prefix}${describeSyncResult(result)}`, isError: false });
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : String(e), isError: true });
      } finally {
        running.current = false;
        setSyncing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    let wasOnline: boolean | null = null;
    return NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
      // Solo al pasar de sin conexion a con conexion, no en cada evento
      if (wasOnline === false && online) void sync(true);
      wasOnline = online;
    });
  }, [sync]);

  return { sync: () => sync(false), syncing, message, isOnline };
}
