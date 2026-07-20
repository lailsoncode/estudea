-- PTD drafts belong to the teacher who created them. The structured JSON keeps
-- the form flexible while the UI evolves with the Senac planning template.
create table if not exists public.ptd_planos (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  turma_id uuid references public.turmas(id) on delete set null,
  titulo text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists ptd_planos_professor_updated_idx
  on public.ptd_planos (professor_id, updated_at desc);

alter table public.ptd_planos enable row level security;

create policy "Teachers can read their own PTD plans" on public.ptd_planos
  for select to authenticated
  using (professor_id = auth.uid());

create policy "Teachers can create their own PTD plans" on public.ptd_planos
  for insert to authenticated
  with check (professor_id = auth.uid() and public.is_admin_or_teacher());

create policy "Teachers can update their own PTD plans" on public.ptd_planos
  for update to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid() and public.is_admin_or_teacher());

create policy "Teachers can delete their own PTD plans" on public.ptd_planos
  for delete to authenticated
  using (professor_id = auth.uid());

create or replace function public.set_ptd_planos_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ptd_planos_updated_at on public.ptd_planos;
create trigger set_ptd_planos_updated_at
  before update on public.ptd_planos
  for each row execute function public.set_ptd_planos_updated_at();
