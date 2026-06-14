-- Migration: Update default values for observacoes_autonomia to 'N' (Não/No)
-- Date: 2026-06-17

ALTER TABLE public.observacoes_autonomia ALTER COLUMN usa_computador SET DEFAULT 'N';
ALTER TABLE public.observacoes_autonomia ALTER COLUMN navega_internet SET DEFAULT 'N';
ALTER TABLE public.observacoes_autonomia ALTER COLUMN cria_salva_arquivos SET DEFAULT 'N';
ALTER TABLE public.observacoes_autonomia ALTER COLUMN organiza_pastas SET DEFAULT 'N';
ALTER TABLE public.observacoes_autonomia ALTER COLUMN copia_cola_links SET DEFAULT 'N';
ALTER TABLE public.observacoes_autonomia ALTER COLUMN conhece_redes_sociais SET DEFAULT 'N';
ALTER TABLE public.observacoes_autonomia ALTER COLUMN conhece_ferramentas SET DEFAULT 'N';
