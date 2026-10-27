import * as SecureStore from 'expo-secure-store';

/**
 * Adaptador de almacenamiento para Supabase Auth sobre SecureStore.
 *
 * SecureStore admite valores de unos 2048 bytes y la sesion de Supabase
 * (access token + refresh token + usuario) los supera, asi que el valor se
 * parte en fragmentos: `<key>_0`, `<key>_1`, ... y `<key>_count` guarda
 * cuantos hay. No se usa AsyncStorage: la sesion queda cifrada en el
 * Keychain (iOS) / Keystore (Android).
 */
const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}_count`;
const chunkKey = (key: string, index: number) => `${key}_${index}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isNaN(count) ? 0 : count;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))),
    );
    // Si falta algun fragmento la sesion esta corrupta: mejor no devolver nada
    if (chunks.some((c) => c === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    // Borrar antes los fragmentos viejos por si la sesion nueva ocupa menos
    await secureStorage.removeItem(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    // El contador va al final: si algo falla a medias, getItem devuelve null
    await SecureStore.setItemAsync(countKey(key), String(count));
  },

  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(countKey(key));
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))),
    );
  },
};
