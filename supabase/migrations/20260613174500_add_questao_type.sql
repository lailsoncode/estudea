-- Add tipo column to public.questoes table to support multiple question types
alter table public.questoes add column if not exists tipo text default 'multipla_escolha' check (tipo in ('multipla_escolha', 'verdadeiro_falso', 'aberta'));
