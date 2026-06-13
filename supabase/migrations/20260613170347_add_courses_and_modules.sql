-- Create cursos table
create table if not exists public.cursos (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descricao text,
  imagem_capa text,
  categoria text,
  nivel text,
  duracao text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create modulos table
create table if not exists public.modulos (
  id uuid default gen_random_uuid() primary key,
  curso_id uuid references public.cursos(id) on delete cascade not null,
  titulo text not null,
  ordem integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add columns to public.aulas table
alter table public.aulas add column if not exists modulo_id uuid references public.modulos(id) on delete cascade;
alter table public.aulas add column if not exists tipo text default 'texto' check (tipo in ('video', 'texto', 'quiz', 'arquivo'));
alter table public.aulas add column if not exists duracao text;
alter table public.aulas add column if not exists ordem integer default 1;
alter table public.aulas add column if not exists video_url text;
alter table public.aulas add column if not exists arquivo_url text;
-- Quiz settings on the lesson/quiz itself
alter table public.aulas add column if not exists pontos integer default 100;
alter table public.aulas add column if not exists nota_aprovacao integer default 70;
alter table public.aulas add column if not exists obrigatorio boolean default true;
alter table public.aulas add column if not exists embaralhar_questoes boolean default true;
alter table public.aulas add column if not exists tempo_limite integer; -- in minutes, nullable

-- Create questoes table
create table if not exists public.questoes (
  id uuid default gen_random_uuid() primary key,
  aula_id uuid references public.aulas(id) on delete cascade not null,
  enunciado text not null,
  opcoes text[] not null, -- array of options
  resposta_correta text not null, -- correct option text
  ordem integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.cursos enable row level security;
alter table public.modulos enable row level security;
alter table public.questoes enable row level security;

-- Policies for cursos
drop policy if exists "Cursos are viewable by authenticated users." on public.cursos;
create policy "Cursos are viewable by authenticated users." on public.cursos
  for select to authenticated using (true);

drop policy if exists "Cursos can be managed by admin users." on public.cursos;
create policy "Cursos can be managed by admin users." on public.cursos
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policies for modulos
drop policy if exists "Modulos are viewable by authenticated users." on public.modulos;
create policy "Modulos are viewable by authenticated users." on public.modulos
  for select to authenticated using (true);

drop policy if exists "Modulos can be managed by admin users." on public.modulos;
create policy "Modulos can be managed by admin users." on public.modulos
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policies for questoes
drop policy if exists "Questoes are viewable by authenticated users." on public.questoes;
create policy "Questoes are viewable by authenticated users." on public.questoes
  for select to authenticated using (true);

drop policy if exists "Questoes can be managed by admin users." on public.questoes;
create policy "Questoes can be managed by admin users." on public.questoes
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
