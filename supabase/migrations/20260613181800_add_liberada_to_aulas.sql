-- Add liberada column to public.aulas table
alter table public.aulas add column if not exists liberada boolean default false not null;
