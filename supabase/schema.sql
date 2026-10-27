-- Ejecutar completo en Supabase > SQL Editor.

create table public.products (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null unique,
  name text not null,
  quantity integer not null check (quantity >= 0),
  price integer not null check (price >= 0),
  updated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Cada usuario solo ve, crea, edita y borra sus propios productos
create policy "ver los míos" on public.products
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "crear los míos" on public.products
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "editar los míos" on public.products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "borrar los míos" on public.products
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Punto extra: borrado sincronizado con borrado lógico.
-- Un producto borrado en el teléfono se sube con deleted_at y deja de aparecer
-- en los demás dispositivos del mismo usuario. Si ya creaste la tabla, basta
-- con ejecutar solo esta línea.
alter table public.products add column if not exists deleted_at timestamptz;
