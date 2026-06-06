
create table public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  kind text not null check (kind in ('notes','questions')),
  storage_path text not null,
  extracted_text text,
  page_count integer,
  created_at timestamptz not null default now()
);

alter table public.course_materials enable row level security;

create policy "authed read materials" on public.course_materials
  for select to authenticated using (true);
create policy "insert own materials" on public.course_materials
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own materials" on public.course_materials
  for update to authenticated using (auth.uid() = user_id);
create policy "delete own materials" on public.course_materials
  for delete to authenticated using (auth.uid() = user_id);

create index on public.course_materials (course_id, kind);

insert into storage.buckets (id, name, public) values ('course-materials','course-materials', false)
on conflict (id) do nothing;

create policy "authed read course-materials objects" on storage.objects
  for select to authenticated using (bucket_id = 'course-materials');
create policy "users upload own course-materials" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'course-materials' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "users update own course-materials" on storage.objects
  for update to authenticated using (
    bucket_id = 'course-materials' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "users delete own course-materials" on storage.objects
  for delete to authenticated using (
    bucket_id = 'course-materials' and (storage.foldername(name))[1] = auth.uid()::text
  );
