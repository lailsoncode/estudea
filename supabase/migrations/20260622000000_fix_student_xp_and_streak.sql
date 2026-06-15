-- Migration: Fix student XP and streak update blocking issues by bypassing profile self-update blocks for database functions/triggers
-- Date: 2026-06-22

CREATE OR REPLACE FUNCTION public.prevent_unsafe_self_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Permite alterações se a atualização vier do próprio banco de dados (ex: triggers ou RPCs do sistema em SECURITY DEFINER)
  -- e não de um comando REST direto (onde o current_user seria 'authenticated' ou 'anon')
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_admin_or_teacher()
  THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.turma_id IS DISTINCT FROM OLD.turma_id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.progresso_geral IS DISTINCT FROM OLD.progresso_geral
       OR NEW.frequencia IS DISTINCT FROM OLD.frequencia
       OR NEW.autonomia_digital IS DISTINCT FROM OLD.autonomia_digital
       OR NEW.status_risco IS DISTINCT FROM OLD.status_risco
       OR NEW.media_digitacao IS DISTINCT FROM OLD.media_digitacao
       OR NEW.tempo_resolucao IS DISTINCT FROM OLD.tempo_resolucao
       OR NEW.ofensiva_atual IS DISTINCT FROM OLD.ofensiva_atual
       OR NEW.maior_ofensiva IS DISTINCT FROM OLD.maior_ofensiva
       OR NEW.ultimo_acesso_data IS DISTINCT FROM OLD.ultimo_acesso_data
       OR NEW.anotacoes IS DISTINCT FROM OLD.anotacoes
    THEN
      RAISE EXCEPTION 'unsafe_profile_update' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
