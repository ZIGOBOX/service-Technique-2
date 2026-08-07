-- Pilotage Service Technique V56
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Crée le stockage privé pour les PDF de rapports et autorise chaque utilisateur
-- connecté à conserver/rouvrir uniquement ses propres fichiers.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('documentation','documentation',false,104857600,null)
on conflict (id) do update set file_size_limit=104857600;

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
