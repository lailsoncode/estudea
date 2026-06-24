-- ============================================================
-- TABELA: pi_marca_detalhes (Ficha da Marca do Projeto Integrador)
-- ============================================================

create table if not exists public.pi_marca_detalhes (
  id                      uuid default gen_random_uuid() primary key,
  projeto_id              uuid references public.projetos_integradores(id) on delete cascade not null,
  aluno_id                uuid references public.profiles(id) on delete cascade,
  grupo_id                uuid references public.pi_grupos(id) on delete cascade,
  
  -- Ficha da Empresa / Marca
  nome_marca              text not null,
  segmento                text,
  justificativa           text,
  canais_digitais         jsonb default '[]'::jsonb, -- ex: [{canal: "Instagram", url: ""}, ...]
  
  -- Público e Persona
  publico_alvo            text,
  persona_nome            text,
  persona_idade           text,
  persona_dores           text,
  persona_desejos         text,
  persona_necessidades    text,
  persona_comportamento   text,
  
  -- Diagnóstico
  pontos_fortes           text,
  pontos_fracos           text,
  oportunidades           text,
  concorrentes            text,
  
  -- Posicionamento
  palavras_chave          text, -- ex: "Agilidade, Confiança, Inovação"
  frase_posicionamento     text,
  tom_voz                 text,
  
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null,
  
  -- Restrições: precisa ser individual (aluno_id) ou grupo (grupo_id)
  check (
    (aluno_id is not null and grupo_id is null) or
    (aluno_id is null and grupo_id is not null)
  )
);

-- Unique constraints to enforce one record per student or group
create unique index if not exists pi_marca_detalhes_aluno_unique
  on public.pi_marca_detalhes (projeto_id, aluno_id)
  where aluno_id is not null;

create unique index if not exists pi_marca_detalhes_grupo_unique
  on public.pi_marca_detalhes (projeto_id, grupo_id)
  where grupo_id is not null;

-- Enable Row Level Security
alter table public.pi_marca_detalhes enable row level security;

-- 1. Read Policy
drop policy if exists "PI marca viewable by authenticated" on public.pi_marca_detalhes;
create policy "PI marca viewable by authenticated"
  on public.pi_marca_detalhes for select
  to authenticated using (true);

-- 2. Insert Policies
drop policy if exists "PI marca insert by aluno individual" on public.pi_marca_detalhes;
create policy "PI marca insert by aluno individual"
  on public.pi_marca_detalhes for insert
  to authenticated
  with check (aluno_id = auth.uid());

drop policy if exists "PI marca insert by grupo member" on public.pi_marca_detalhes;
create policy "PI marca insert by grupo member"
  on public.pi_marca_detalhes for insert
  to authenticated
  with check (grupo_id is not null and public.is_membro_do_grupo(grupo_id));

-- 3. Update Policies
drop policy if exists "PI marca update by aluno individual" on public.pi_marca_detalhes;
create policy "PI marca update by aluno individual"
  on public.pi_marca_detalhes for update
  to authenticated
  using (aluno_id = auth.uid())
  with check (aluno_id = auth.uid());

drop policy if exists "PI marca update by grupo member" on public.pi_marca_detalhes;
create policy "PI marca update by grupo member"
  on public.pi_marca_detalhes for update
  to authenticated
  using (grupo_id is not null and public.is_membro_do_grupo(grupo_id))
  with check (grupo_id is not null and public.is_membro_do_grupo(grupo_id));

-- 4. Staff Management Policy
drop policy if exists "PI marca managed by staff" on public.pi_marca_detalhes;
create policy "PI marca managed by staff"
  on public.pi_marca_detalhes for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 5. Updated_at Trigger
drop trigger if exists trg_pi_marca_detalhes_updated_at on public.pi_marca_detalhes;
create trigger trg_pi_marca_detalhes_updated_at
  before update on public.pi_marca_detalhes
  for each row execute function public.set_updated_at();
