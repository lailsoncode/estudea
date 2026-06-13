-- Create table progresso_alunos
create table if not exists public.progresso_alunos (
  id uuid default gen_random_uuid() primary key,
  aluno_id uuid references public.profiles(id) on delete cascade not null,
  aula_id uuid references public.aulas(id) on delete cascade not null,
  concluido_em timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(aluno_id, aula_id)
);

-- Create table entregas_atividades
create table if not exists public.entregas_atividades (
  id uuid default gen_random_uuid() primary key,
  aluno_id uuid references public.profiles(id) on delete cascade not null,
  atividade_id uuid references public.atividades(id) on delete cascade not null,
  resposta text not null,
  nota numeric,
  feedback_professor text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(aluno_id, atividade_id)
);

-- Enable Row Level Security (RLS)
alter table public.progresso_alunos enable row level security;
alter table public.entregas_atividades enable row level security;

-- Policies for progresso_alunos
drop policy if exists "Progresso is viewable by authenticated users." on public.progresso_alunos;
create policy "Progresso is viewable by authenticated users." on public.progresso_alunos
  for select to authenticated using (true);

drop policy if exists "Students can manage their own progresso." on public.progresso_alunos;
create policy "Students can manage their own progresso." on public.progresso_alunos
  for all to authenticated using (auth.uid() = aluno_id);

drop policy if exists "Admins can manage all progresso." on public.progresso_alunos;
create policy "Admins can manage all progresso." on public.progresso_alunos
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policies for entregas_atividades
drop policy if exists "Entregas are viewable by authenticated users." on public.entregas_atividades;
create policy "Entregas are viewable by authenticated users." on public.entregas_atividades
  for select to authenticated using (true);

drop policy if exists "Students can insert their own entregas." on public.entregas_atividades;
create policy "Students can insert their own entregas." on public.entregas_atividades
  for insert to authenticated with check (auth.uid() = aluno_id);

drop policy if exists "Students can update their own entregas." on public.entregas_atividades;
create policy "Students can update their own entregas." on public.entregas_atividades
  for update to authenticated using (auth.uid() = aluno_id);

drop policy if exists "Admins can manage all entregas." on public.entregas_atividades;
create policy "Admins can manage all entregas." on public.entregas_atividades
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
