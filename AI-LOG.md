# Registro de uso de IA

**Herramienta:** Claude Code (Claude Opus 5.5), dentro de VS Code.

## Prompt principal

> (Adjuntando el PDF del parcial) "por favor analiza todo paso a paso, no dejes pasar nada y empieza a construir"

La IA leyó el enunciado y revisó mi taller de la Semana 7 para reutilizar la configuración de Drizzle, Babel y Metro. Luego generó el proyecto (Expo SDK 57), el esquema, el repositorio, los hooks, la sincronización y las cuatro pantallas.

## Qué se corrigió o revisó del código generado

1. **`.gitignore` del template de Expo:** solo ignoraba `.env*.local`, no `.env`. Como el parcial usa `.env`, se habría subido al repositorio y el criterio de Entrega quedaría en 0. Se agregó `.env` y `.env.*` con la excepción `!.env.example`, y se verificó con `git status` antes del primer push.
2. **Sesión sin internet:** al revisar el código fuente de `@supabase/auth-js` (v2.118) se vio que, si el access token venció (dura 1 hora) y no hay red, `getSession()` devuelve `session: null`, aunque la sesión sigue guardada. La app habría mandado a Doña Rosa al Login en modo avión. En `AuthContext` se agregó un respaldo: si el error es `AuthRetryableFetchError`, se lee la sesión guardada en SecureStore.
3. **Cerrar sesión sin internet:** en ese mismo caso, `signOut()` devuelve el error antes de borrar la sesión guardada, y esta "revivía" al reabrir la app. Ahora se borra a mano de SecureStore cuando `signOut` falla.
4. **Ediciones durante la sincronización:** `markSynced` solo marca un producto si su `updatedAt` sigue igual al que se subió. Así, una edición hecha mientras se sincronizaba no queda como sincronizada por error.
5. **Validación del precio y la cantidad:** se limitó a 2.147.483.647, el máximo de la columna `integer` de Postgres, para que un número enorme no haga fallar la sincronización.
6. **Columna extra `userId` en SQLite:** no está en el enunciado. Se agregó para que, si otra cuenta inicia sesión en el mismo teléfono, no vea ni suba los productos del usuario anterior.

## Alucinaciones o errores detectados

- **Comando de instalación fuera de contexto:** el primer `npx expo install` se ejecutó antes de `npm install`. Como `expo` todavía no estaba en `node_modules`, npx descargó `expo@58` en lugar de usar el SDK 57 del proyecto y falló con *"Cannot determine the project's Expo SDK version"*. Se corrigió ejecutando primero `npm install`.
- (Completa aquí cualquier otra cosa que hayas tenido que corregir al probar en tu teléfono.)
