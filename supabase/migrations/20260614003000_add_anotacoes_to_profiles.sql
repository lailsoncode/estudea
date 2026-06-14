-- Migration: Add anotacoes column to public.profiles
-- Date: 2026-06-14

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anotacoes TEXT;
