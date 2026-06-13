-- Create aulas table
create table if not exists public.aulas (
  id uuid default gen_random_uuid() primary key,
  numero_aula integer not null check (numero_aula >= 1 and numero_aula <= 40),
  titulo text not null,
  conteudo text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create atividades table linked to aulas
create table if not exists public.atividades (
  id uuid default gen_random_uuid() primary key,
  aula_id uuid references public.aulas(id) on delete cascade not null,
  enunciado text not null,
  tipo_entrega text not null check (tipo_entrega in ('texto', 'imagem')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.aulas enable row level security;
alter table public.atividades enable row level security;

-- Policies for aulas
create policy "Aulas are viewable by authenticated users." on public.aulas
  for select to authenticated using (true);

create policy "Aulas can be managed by admin users." on public.aulas
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policies for atividades
create policy "Atividades are viewable by authenticated users." on public.atividades
  for select to authenticated using (true);

create policy "Atividades can be managed by admin users." on public.atividades
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
