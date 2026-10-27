# Mi Tienda: inventario offline-first

App móvil de inventario para la tienda de Doña Rosa: inicia sesión, registra productos **con o sin internet** (SQLite es la fuente de verdad) y los respalda en **Supabase** al tocar *Sincronizar*.

- **Estudiante:** Jean Carlos Cadena Trespalacios
- **Código:** 0182220010

**Tecnología:** Expo SDK 58 + TypeScript, Expo Router (`Stack.Protected`), `expo-sqlite` + Drizzle ORM (`useMigrations`, `useLiveQuery`), Supabase Auth + Postgres con RLS, sesión en `expo-secure-store`.

## Cómo ejecutar

1. **Supabase**
   - Crea un proyecto en [supabase.com](https://supabase.com) (o reutiliza el del curso).
   - En **SQL Editor** ejecuta completo el archivo [`supabase/schema.sql`](supabase/schema.sql). Crea la tabla `products`, activa RLS con las cuatro políticas y agrega la columna opcional `deleted_at`, que se usa para el borrado sincronizado.
   - En **Authentication > Sign In / Providers > Email** desactiva **Confirm email**. Si queda activado, el registro no inicia sesión.
2. **Variables de entorno**: copia `.env.example` como `.env` y rellena los datos de *Project Settings > API Keys*:
   ```bash
   cp .env.example .env
   ```
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Solo va la **publishable key**. El archivo `.env` está en `.gitignore` y nunca se sube.
3. **Instalar y arrancar**
   ```bash
   npm install
   npx expo start
   ```
   Escanea el QR con **Expo Go** (SDK 58). Si el PC tiene varias redes (VirtualBox, etc.), arranca con la IP del Wi-Fi: `REACT_NATIVE_PACKAGER_HOSTNAME=<tu-ip> npx expo start`.
4. (Solo si cambias `db/schema.ts`) genera una nueva migración con `npx drizzle-kit generate`. La app la aplica sola al abrir, con `useMigrations`.

## Estructura

```
app/
  _layout.tsx        Stack con rutas protegidas (Stack.Protected) + migraciones
  login.tsx          Inicio de sesión
  registro.tsx       Registro con validaciones
  index.tsx          Inventario: lista, totales, pendientes, Sincronizar, buscar, cerrar sesión
  producto.tsx       Crear / editar (si recibe ?id=) / eliminar
context/AuthContext.tsx   Sesión de Supabase (signUp, signInWithPassword, signOut)
lib/secureStorage.ts      Adaptador de SecureStore por fragmentos para la sesión
lib/supabase.ts           Cliente de Supabase (publishable key)
db/schema.ts              Tabla products de SQLite (Drizzle)
db/client.ts              Conexión SQLite + Drizzle
db/migrate.ts             Hook que aplica las migraciones (useMigrations)
db/repositories/products.ts   Repositorio: única capa que usa Drizzle
hooks/useProducts.ts      Lista reactiva (useLiveQuery), totales y formulario
hooks/useSync.ts          Botón Sincronizar + sincronización automática
services/sync.ts          syncProducts(userId): bajar y luego subir
drizzle/                  Migración generada con drizzle-kit
supabase/schema.sql       SQL de la tabla en la nube con RLS
```

Las pantallas no importan Drizzle: usan los hooks, y los hooks usan el repositorio.

## Cómo funciona

- **Local primero:** crear, editar y eliminar escriben en SQLite, así que funcionan en modo avión. Cada creación o edición escribe `updatedAt: new Date()`.
- **Pendiente:** un producto está pendiente si `syncedAt` está vacío o es anterior a `updatedAt`. La lista muestra ⏳ *Pendiente* o ☁️ *En la nube*, y la cabecera muestra cuántos hay.
- **Sincronizar** (`services/sync.ts`):
  1. **Bajar:** trae de Supabase los productos del usuario e inserta en SQLite los que no existen localmente (comparando por `client_id`), marcados como sincronizados.
  2. **Subir:** envía los pendientes con `upsert(..., { onConflict: 'client_id' })`, así que nunca duplica filas, y los marca con `syncedAt` igual al `updatedAt` que se subió. Si el producto se editó mientras se sincronizaba, sigue pendiente.
  3. Muestra el resultado (*"2 subidos, 1 bajado"*) o el error (*"Sin conexión a internet…"*).
- **Sesión:** se guarda cifrada en SecureStore, partida en fragmentos porque supera el límite de unos 2 KB por valor, y sobrevive al cierre de la app. Si se abre la app sin internet con el token vencido, se usa la sesión guardada para seguir trabajando offline.
- **Varios usuarios en el mismo teléfono:** la tabla local tiene una columna extra `userId`. Cada cuenta ve y sincroniza solo sus productos.

## Puntos extra implementados

- **Borrado sincronizado con borrado lógico (`deletedAt`):** al eliminar un producto que ya estaba en la nube, se marca con `deletedAt` y se sube en la siguiente sincronización. Un producto que nunca se subió se borra directamente.
- **"Gana el último cambio":** al bajar un producto que ya existe en el teléfono, si la versión de la nube tiene un `updated_at` más reciente, reemplaza a la local.
- **Sincronización automática** al recuperar la conexión, con `@react-native-community/netinfo`. Mientras no hay conexión se muestra un aviso.
- **Búsqueda por nombre** en la pantalla principal, sin distinguir mayúsculas ni tildes.

## Capturas

| | |
|---|---|
| ![Login](capturas/01-login.png) | ![Registro](capturas/02-registro.png) |
| ![Principal](capturas/03-principal.png) | ![Formulario](capturas/04-formulario.png) |
| ![Sin conexión](capturas/05-sin-conexion.png) | ![Sincronizado](capturas/06-sincronizado.png) |
| ![Supabase](capturas/07-supabase.png) | |

## Qué quedó funcionando y qué no

**Funciona:**
- Login, registro con validaciones (correo, mínimo 6 caracteres, contraseñas que coinciden) y cierre de sesión.
- Rutas protegidas con `Stack.Protected`, y sesión en SecureStore que sobrevive al cierre.
- Esquema y migración con Drizzle, CRUD completo en SQLite y lista reactiva con totales de unidades y valor.
- Indicador de pendientes y confirmación al eliminar (mantener presionado, o el botón *Eliminar* del formulario).
- Sincronización que baja lo que falta y sube los pendientes sin duplicar.
- Los cuatro puntos extra descritos arriba.

**Pendiente / limitaciones:**
- La resolución de conflictos es solo "gana el último cambio", comparando las horas de cada dispositivo. Si los relojes están desajustados, puede ganar el cambio equivocado.
