-- ============================================================
-- MÓDULO: PROJETO INTEGRADOR
-- ============================================================
-- Tabelas:
--   projetos_integradores    → configuração do PI por curso
--   pi_entregas_definicoes   → etapas/marcos do projeto
--   pi_grupos                → grupos de alunos (modo grupo)
--   pi_grupo_membros         → membros de cada grupo
--   pi_submissoes            → submissões por aluno ou grupo
-- ============================================================

-- ------------------------------------------------------------
-- 1. projetos_integradores
-- ------------------------------------------------------------
create table if not exists public.projetos_integradores (
  id                  uuid default gen_random_uuid() primary key,
  curso_id            uuid references public.cursos(id) on delete cascade not null unique,
  titulo              text not null,
  descricao           text,
  tipo                text not null default 'individual'
                      check (tipo in ('individual', 'grupo')),
  tamanho_min_grupo   integer default 2 check (tamanho_min_grupo >= 1),
  tamanho_max_grupo   integer default 5 check (tamanho_max_grupo >= 1),
  xp_por_entrega      integer default 50 check (xp_por_entrega >= 0),
  nota_minima_xp      numeric default 5.0 check (nota_minima_xp >= 0 and nota_minima_xp <= 10),
  ativo               boolean default true not null,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

-- ------------------------------------------------------------
-- 2. pi_entregas_definicoes
-- ------------------------------------------------------------
create table if not exists public.pi_entregas_definicoes (
  id              uuid default gen_random_uuid() primary key,
  projeto_id      uuid references public.projetos_integradores(id) on delete cascade not null,
  titulo          text not null,
  descricao       text,
  prazo           date,
  peso            numeric default 1.0 check (peso > 0),
  ordem           integer not null default 1 check (ordem >= 1),
  aceita_arquivo  boolean default true not null,
  aceita_link     boolean default true not null,
  aceita_texto    boolean default true not null,
  created_at      timestamptz default now() not null
);

-- ------------------------------------------------------------
-- 3. pi_grupos
-- ------------------------------------------------------------
create table if not exists public.pi_grupos (
  id          uuid default gen_random_uuid() primary key,
  projeto_id  uuid references public.projetos_integradores(id) on delete cascade not null,
  turma_id    uuid references public.turmas(id) on delete cascade not null,
  nome        text not null,
  criado_por  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null
);

-- ------------------------------------------------------------
-- 4. pi_grupo_membros
-- ------------------------------------------------------------
create table if not exists public.pi_grupo_membros (
  id          uuid default gen_random_uuid() primary key,
  grupo_id    uuid references public.pi_grupos(id) on delete cascade not null,
  aluno_id    uuid references public.profiles(id) on delete cascade not null,
  lider       boolean default false not null,
  created_at  timestamptz default now() not null,
  unique (grupo_id, aluno_id)
);

-- Trigger: garante que um aluno só pode estar em 1 grupo por projeto
create or replace function public.check_aluno_unico_por_projeto()
returns trigger as $$
begin
  if exists (
    select 1
    from public.pi_grupo_membros pgm
    join public.pi_grupos pg on pg.id = pgm.grupo_id
    where pgm.aluno_id = new.aluno_id
      and pg.projeto_id = (
        select projeto_id from public.pi_grupos where id = new.grupo_id
      )
  ) then
    raise exception 'O aluno já pertence a um grupo neste Projeto Integrador.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_aluno_unico_por_projeto on public.pi_grupo_membros;
create trigger trg_check_aluno_unico_por_projeto
  before insert on public.pi_grupo_membros
  for each row execute function public.check_aluno_unico_por_projeto();

-- ------------------------------------------------------------
-- 5. pi_submissoes
-- ------------------------------------------------------------
create table if not exists public.pi_submissoes (
  id                  uuid default gen_random_uuid() primary key,
  entrega_def_id      uuid references public.pi_entregas_definicoes(id) on delete cascade not null,
  -- Para projeto individual:
  aluno_id            uuid references public.profiles(id) on delete cascade,
  -- Para projeto em grupo:
  grupo_id            uuid references public.pi_grupos(id) on delete cascade,
  -- Conteúdo da submissão
  descricao           text,
  arquivo_url         text,
  link_url            text,
  -- Avaliação
  nota                numeric check (nota >= 0 and nota <= 10),
  feedback_professor  text,
  avaliado_por        uuid references public.profiles(id) on delete set null,
  avaliado_em         timestamptz,
  -- XP
  xp_concedido        boolean default false not null,
  -- Status
  status              text default 'pendente' not null
                      check (status in ('pendente', 'enviada', 'avaliada', 'revisao')),
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null,
  -- Exatamente um dos dois deve ser preenchido
  check (
    (aluno_id is not null and grupo_id is null) or
    (aluno_id is null and grupo_id is not null)
  )
);

-- Unique: 1 submissão por entrega por aluno (individual)
create unique index if not exists pi_submissoes_entrega_aluno_unique
  on public.pi_submissoes (entrega_def_id, aluno_id)
  where aluno_id is not null;

-- Unique: 1 submissão por entrega por grupo
create unique index if not exists pi_submissoes_entrega_grupo_unique
  on public.pi_submissoes (entrega_def_id, grupo_id)
  where grupo_id is not null;

-- Trigger: concede XP quando submissão é avaliada com nota >= nota_minima_xp
create or replace function public.conceder_xp_projeto_integrador()
returns trigger as $$
declare
  v_xp_por_entrega    integer;
  v_nota_minima_xp    numeric;
  v_projeto_id        uuid;
  v_membro            record;
begin
  -- Só age quando status muda para 'avaliada' e XP ainda não foi concedido
  if new.status = 'avaliada' and new.xp_concedido = false and new.nota is not null then
    -- Busca configuração de XP do projeto
    select pi.xp_por_entrega, pi.nota_minima_xp, pi.id
    into v_xp_por_entrega, v_nota_minima_xp, v_projeto_id
    from public.pi_entregas_definicoes ped
    join public.projetos_integradores pi on pi.id = ped.projeto_id
    where ped.id = new.entrega_def_id;

    if new.nota >= v_nota_minima_xp then
      if new.aluno_id is not null then
        -- Projeto individual: XP para o aluno
        update public.profiles
        set xp = coalesce(xp, 0) + v_xp_por_entrega
        where id = new.aluno_id;
      elsif new.grupo_id is not null then
        -- Projeto em grupo: XP para todos os membros
        for v_membro in
          select aluno_id from public.pi_grupo_membros where grupo_id = new.grupo_id
        loop
          update public.profiles
          set xp = coalesce(xp, 0) + v_xp_por_entrega
          where id = v_membro.aluno_id;
        end loop;
      end if;

      -- Marca XP como concedido
      new.xp_concedido := true;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_conceder_xp_pi on public.pi_submissoes;
create trigger trg_conceder_xp_pi
  before update on public.pi_submissoes
  for each row execute function public.conceder_xp_projeto_integrador();

-- Trigger: updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_submissoes_updated_at on public.pi_submissoes;
create trigger trg_pi_submissoes_updated_at
  before update on public.pi_submissoes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projetos_integradores_updated_at on public.projetos_integradores;
create trigger trg_projetos_integradores_updated_at
  before update on public.projetos_integradores
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.projetos_integradores enable row level security;
alter table public.pi_entregas_definicoes enable row level security;
alter table public.pi_grupos              enable row level security;
alter table public.pi_grupo_membros       enable row level security;
alter table public.pi_submissoes          enable row level security;

-- Helper: é teacher ou admin
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('teacher', 'admin')
  );
$$ language sql security definer stable;

-- Helper: aluno é membro do grupo
create or replace function public.is_membro_do_grupo(p_grupo_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.pi_grupo_membros
    where grupo_id = p_grupo_id and aluno_id = auth.uid()
  );
$$ language sql security definer stable;

-- ---- projetos_integradores ----
drop policy if exists "PI viewable by authenticated" on public.projetos_integradores;
create policy "PI viewable by authenticated"
  on public.projetos_integradores for select
  to authenticated using (true);

drop policy if exists "PI managed by staff" on public.projetos_integradores;
create policy "PI managed by staff"
  on public.projetos_integradores for all
  to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---- pi_entregas_definicoes ----
drop policy if exists "PI entregas viewable by authenticated" on public.pi_entregas_definicoes;
create policy "PI entregas viewable by authenticated"
  on public.pi_entregas_definicoes for select
  to authenticated using (true);

drop policy if exists "PI entregas managed by staff" on public.pi_entregas_definicoes;
create policy "PI entregas managed by staff"
  on public.pi_entregas_definicoes for all
  to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---- pi_grupos ----
drop policy if exists "PI grupos viewable by authenticated" on public.pi_grupos;
create policy "PI grupos viewable by authenticated"
  on public.pi_grupos for select
  to authenticated using (true);

drop policy if exists "PI grupos managed by staff" on public.pi_grupos;
create policy "PI grupos managed by staff"
  on public.pi_grupos for all
  to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---- pi_grupo_membros ----
drop policy if exists "PI membros viewable by authenticated" on public.pi_grupo_membros;
create policy "PI membros viewable by authenticated"
  on public.pi_grupo_membros for select
  to authenticated using (true);

drop policy if exists "PI membros managed by staff" on public.pi_grupo_membros;
create policy "PI membros managed by staff"
  on public.pi_grupo_membros for all
  to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---- pi_submissoes ----
drop policy if exists "PI submissoes viewable by authenticated" on public.pi_submissoes;
create policy "PI submissoes viewable by authenticated"
  on public.pi_submissoes for select
  to authenticated using (true);

-- Aluno individual insere a própria submissão
drop policy if exists "PI submissoes insert by aluno individual" on public.pi_submissoes;
create policy "PI submissoes insert by aluno individual"
  on public.pi_submissoes for insert
  to authenticated
  with check (
    aluno_id = auth.uid()
  );

-- Membro de grupo insere submissão do grupo
drop policy if exists "PI submissoes insert by grupo member" on public.pi_submissoes;
create policy "PI submissoes insert by grupo member"
  on public.pi_submissoes for insert
  to authenticated
  with check (
    grupo_id is not null and public.is_membro_do_grupo(grupo_id)
  );

-- Aluno atualiza sua própria submissão (enquanto pendente/revisao)
drop policy if exists "PI submissoes update by aluno" on public.pi_submissoes;
create policy "PI submissoes update by aluno"
  on public.pi_submissoes for update
  to authenticated
  using (
    (aluno_id = auth.uid() or public.is_membro_do_grupo(grupo_id))
    and status in ('pendente', 'revisao')
  )
  with check (
    -- Aluno não pode alterar campos de avaliação
    nota is null and feedback_professor is null and avaliado_por is null
  );

-- Staff avalia submissões (pode atualizar nota, feedback, status)
drop policy if exists "PI submissoes avaliacao by staff" on public.pi_submissoes;
create policy "PI submissoes avaliacao by staff"
  on public.pi_submissoes for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
