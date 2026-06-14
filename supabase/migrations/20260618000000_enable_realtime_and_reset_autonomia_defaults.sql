-- Migration: Revert default values of observacoes_autonomia to NULL and enable Realtime for chat_messages
-- Date: 2026-06-18

-- Revert default values to NULL
ALTER TABLE public.observacoes_autonomia ALTER COLUMN usa_computador DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN navega_internet DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN cria_salva_arquivos DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN organiza_pastas DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN copia_cola_links DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN conhece_redes_sociais DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN conhece_ferramentas DROP DEFAULT;
ALTER TABLE public.observacoes_autonomia ALTER COLUMN precisa_apoio DROP DEFAULT;

-- Enable Realtime for chat_messages if not already added
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;
