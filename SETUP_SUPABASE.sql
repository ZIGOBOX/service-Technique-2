-- Pilotage Service Technique V23
-- Exécuter une seule fois dans Supabase > SQL Editor.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
drop policy if exists "Users read own state" on public.app_state;
create policy "Users read own state" on public.app_state for select using (auth.uid() = user_id);
drop policy if exists "Users insert own state" on public.app_state;
create policy "Users insert own state" on public.app_state for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own state" on public.app_state;
create policy "Users update own state" on public.app_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('documentation','documentation',false,104857600,null)
on conflict (id) do update set file_size_limit=104857600;

-- Chaque utilisateur voit uniquement ses fichiers personnels.
drop policy if exists "Users read own documentation" on storage.objects;
create policy "Users read own documentation" on storage.objects for select to authenticated
using (bucket_id='documentation' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users upload own documentation" on storage.objects;
create policy "Users upload own documentation" on storage.objects for insert to authenticated
with check (bucket_id='documentation' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users update own documentation" on storage.objects;
create policy "Users update own documentation" on storage.objects for update to authenticated
using (bucket_id='documentation' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='documentation' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users delete own documentation" on storage.objects;
create policy "Users delete own documentation" on storage.objects for delete to authenticated
using (bucket_id='documentation' and (storage.foldername(name))[1]=auth.uid()::text);

-- Les trois guides communs sont lisibles par tous les utilisateurs connectés.
drop policy if exists "Authenticated read common guides" on storage.objects;
create policy "Authenticated read common guides" on storage.objects for select to authenticated
using (bucket_id='documentation' and (storage.foldername(name))[1]='guides');

-- Autorise le propriétaire du projet à téléverser les guides depuis le tableau de bord Supabase.
