-- Add curso_id to public.turmas table
alter table public.turmas add column if not exists curso_id uuid references public.cursos(id) on delete set null;

-- Add status to public.profiles table
alter table public.profiles add column if not exists status text default 'ativo' check (status in ('ativo', 'bloqueado'));
