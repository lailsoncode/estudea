-- Migration: Student tracking columns, chat messages, observacoes_autonomia, diario_classe, and automatic frequency triggers
-- Date: 2026-06-14

-- 1. Update public.profiles table with new columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS progresso_geral INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS frequencia INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS autonomia_digital TEXT CHECK (autonomia_digital IN ('S', 'P', 'N')) DEFAULT 'P';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_risco TEXT CHECK (status_risco IN ('Excelente', 'No Caminho', 'Alerta Médio', 'Em Risco')) DEFAULT 'No Caminho';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS media_digitacao INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tempo_resolucao INTEGER DEFAULT 0;

-- Sync emails for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2. Update RLS Policy for Profiles to allow Admins/Teachers full management
DROP POLICY IF EXISTS "Admins/Teachers can manage all profiles" ON public.profiles;
CREATE POLICY "Admins/Teachers can manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'teacher')
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'teacher')
  );

-- 3. Update handle_new_user function to sync email automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  insert into public.profiles (id, nome, email, role, turma_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    v_turma_id
  );
  return new;
end;
$$;

-- 4. Create public.observacoes_autonomia table
CREATE TABLE IF NOT EXISTS public.observacoes_autonomia (
  aluno_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  usa_computador TEXT CHECK (usa_computador IN ('S', 'P', 'N')) DEFAULT 'S',
  navega_internet TEXT CHECK (navega_internet IN ('S', 'P', 'N')) DEFAULT 'S',
  cria_salva_arquivos TEXT CHECK (cria_salva_arquivos IN ('S', 'P', 'N')) DEFAULT 'S',
  organiza_pastas TEXT CHECK (organiza_pastas IN ('S', 'P', 'N')) DEFAULT 'S',
  copia_cola_links TEXT CHECK (copia_cola_links IN ('S', 'P', 'N')) DEFAULT 'S',
  conhece_redes_sociais TEXT CHECK (conhece_redes_sociais IN ('S', 'P', 'N')) DEFAULT 'S',
  conhece_ferramentas TEXT CHECK (conhece_ferramentas IN ('S', 'P', 'N')) DEFAULT 'S',
  precisa_apoio TEXT CHECK (precisa_apoio IN ('S', 'N')) DEFAULT 'N',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS and Policies for observacoes_autonomia
ALTER TABLE public.observacoes_autonomia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Teachers can manage observacoes_autonomia" ON public.observacoes_autonomia;
CREATE POLICY "Admins/Teachers can manage observacoes_autonomia" ON public.observacoes_autonomia
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Students can read their own observacoes_autonomia" ON public.observacoes_autonomia;
CREATE POLICY "Students can read their own observacoes_autonomia" ON public.observacoes_autonomia
  FOR SELECT TO authenticated USING (aluno_id = auth.uid());

-- 5. Create public.chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remetente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS and Policies for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Teachers can manage chat_messages" ON public.chat_messages;
CREATE POLICY "Admins/Teachers can manage chat_messages" ON public.chat_messages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Students can see their own chats" ON public.chat_messages;
CREATE POLICY "Students can see their own chats" ON public.chat_messages
  FOR SELECT TO authenticated USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert their own messages" ON public.chat_messages;
CREATE POLICY "Students can insert their own messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid() AND remetente_id = auth.uid());

-- 6. Create public.diario_classe table
CREATE TABLE IF NOT EXISTS public.diario_classe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  data DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT CHECK (status IN ('presente', 'falta', 'atrasado')) DEFAULT 'presente' NOT NULL,
  observacao TEXT,
  compreendeu TEXT CHECK (compreendeu IN ('S', 'P', 'N')) DEFAULT 'S',
  participou TEXT CHECK (participou IN ('S', 'P', 'N')) DEFAULT 'S',
  precisou_apoio TEXT CHECK (precisou_apoio IN ('S', 'P', 'N')) DEFAULT 'N',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (aluno_id, aula_id)
);

-- Enable RLS and Policies for diario_classe
ALTER TABLE public.diario_classe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Teachers can manage diario_classe" ON public.diario_classe;
CREATE POLICY "Admins/Teachers can manage diario_classe" ON public.diario_classe
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Students can view their own diario_classe" ON public.diario_classe;
CREATE POLICY "Students can view their own diario_classe" ON public.diario_classe
  FOR SELECT TO authenticated USING (aluno_id = auth.uid());

-- 7. Create frequency automatic update trigger function
CREATE OR REPLACE FUNCTION public.update_student_frequencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_total int;
  v_present int;
  v_frequencia int;
  v_target_id uuid;
begin
  v_target_id := coalesce(new.aluno_id, old.aluno_id);

  -- Count total classes for the student
  select count(*) into v_total from public.diario_classe where aluno_id = v_target_id;
  
  -- Count present and late classes (status IN ('presente', 'atrasado'))
  select count(*) into v_present from public.diario_classe 
  where aluno_id = v_target_id and status in ('presente', 'atrasado');

  if v_total > 0 then
    v_frequencia := round((v_present * 100.0) / v_total);
  else
    v_frequencia := 100; -- Default if no records
  end if;

  update public.profiles 
  set frequencia = v_frequencia 
  where id = v_target_id;

  return new;
end;
$$;

-- Create frequency automatic update trigger
DROP TRIGGER IF EXISTS trigger_update_frequencia ON public.diario_classe;
CREATE TRIGGER trigger_update_frequencia
  AFTER INSERT OR DELETE OR UPDATE
  ON public.diario_classe
  FOR EACH ROW
  EXECUTE FUNCTION update_student_frequencia();
