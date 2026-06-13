-- Create in-app notifications sent by teachers to classes.
create table if not exists public.notificacoes (
  id uuid default gen_random_uuid() primary key,
  turma_id uuid references public.turmas(id) on delete cascade not null,
  titulo text not null check (length(trim(titulo)) > 0),
  mensagem text not null check (length(trim(mensagem)) > 0),
  remetente_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists notificacoes_turma_created_at_idx
  on public.notificacoes (turma_id, created_at desc);

create table if not exists public.notificacao_leituras (
  id uuid default gen_random_uuid() primary key,
  notificacao_id uuid references public.notificacoes(id) on delete cascade not null,
  aluno_id uuid references public.profiles(id) on delete cascade not null,
  lida_em timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(notificacao_id, aluno_id)
);

create index if not exists notificacao_leituras_aluno_idx
  on public.notificacao_leituras (aluno_id);

alter table public.notificacoes enable row level security;
alter table public.notificacao_leituras enable row level security;

drop policy if exists "Students can view notifications from their class." on public.notificacoes;
create policy "Students can view notifications from their class." on public.notificacoes
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.turma_id = notificacoes.turma_id
    )
  );

drop policy if exists "Admins can manage notificacoes." on public.notificacoes;
create policy "Admins can manage notificacoes." on public.notificacoes
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Students can manage own notification reads." on public.notificacao_leituras;
create policy "Students can manage own notification reads." on public.notificacao_leituras
  for all to authenticated
  using (auth.uid() = aluno_id)
  with check (
    auth.uid() = aluno_id
    and exists (
      select 1
      from public.notificacoes n
      join public.profiles p on p.id = auth.uid()
      where n.id = notificacao_leituras.notificacao_id
        and p.turma_id = n.turma_id
    )
  );

drop policy if exists "Admins can view notification reads." on public.notificacao_leituras;
create policy "Admins can view notification reads." on public.notificacao_leituras
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
