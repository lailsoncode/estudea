-- Create tables
create table if not exists public.turmas (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  codigo_acesso text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text,
  role text default 'student'::text check (role in ('student', 'teacher', 'admin')),
  turma_id uuid references public.turmas(id) on delete set null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.turmas enable row level security;
alter table public.profiles enable row level security;

-- Policies for turmas
create policy "Turmas are viewable by authenticated users." on public.turmas
  for select to authenticated using (true);

create policy "Turmas can be verified by anonymous users via code." on public.turmas
  for select to anon using (true);

-- Policies for profiles
create policy "Profiles are viewable by authenticated users." on public.profiles
  for select to authenticated using (true);

create policy "Users can update their own profile." on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Trigger function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_turma_id uuid;
  v_codigo_acesso text;
begin
  -- Retrieve the class access code from raw metadata
  v_codigo_acesso := new.raw_user_meta_data->>'codigo_acesso';
  
  -- Resolve the turma_id from access code
  if v_codigo_acesso is not null then
    select id into v_turma_id from public.turmas where codigo_acesso = v_codigo_acesso limit 1;
  end if;

  insert into public.profiles (id, nome, role, turma_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    v_turma_id
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
