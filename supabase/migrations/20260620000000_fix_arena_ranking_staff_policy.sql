-- Allow both admins and teachers to persist Arena/Kahoot ranking history.

DROP POLICY IF EXISTS "Admins can manage arena ranking" ON public.arena_ranking;
DROP POLICY IF EXISTS "Staff can manage arena ranking" ON public.arena_ranking;

CREATE POLICY "Staff can manage arena ranking" ON public.arena_ranking
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_teacher())
  WITH CHECK (public.is_admin_or_teacher());
