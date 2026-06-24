-- Migration: Add drive_url to pi_marca_detalhes
ALTER TABLE public.pi_marca_detalhes ADD COLUMN IF NOT EXISTS drive_url TEXT;
