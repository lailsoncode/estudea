-- Remove liberada column from public.aulas if exists
alter table public.aulas drop column if exists liberada;

-- Create turma_aulas_liberadas table
create table if not exists public.turma_aulas_liberadas (
  id uuid default gen_random_uuid() primary key,
  turma_id uuid references public.turmas(id) on delete cascade not null,
  aula_id uuid references public.aulas(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(turma_id, aula_id)
);

-- Enable RLS
alter table public.turma_aulas_liberadas enable row level security;

-- Policies
drop policy if exists "Turma aulas liberadas are viewable by authenticated users." on public.turma_aulas_liberadas;
create policy "Turma aulas liberadas are viewable by authenticated users." on public.turma_aulas_liberadas
  for select to authenticated using (true);

drop policy if exists "Turma aulas liberadas can be managed by admin users." on public.turma_aulas_liberadas;
create policy "Turma aulas liberadas can be managed by admin users." on public.turma_aulas_liberadas
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
