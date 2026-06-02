DROP POLICY IF EXISTS "Staff insert ratings" ON public.ticket_ratings;
DROP POLICY IF EXISTS "Staff update ratings" ON public.ticket_ratings;
DROP POLICY IF EXISTS "Write ratings for accessible tickets" ON public.ticket_ratings;

CREATE POLICY "Write ratings for accessible tickets"
  ON public.ticket_ratings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_ratings.ticket_id
    AND (public.is_staff(auth.uid()) OR t.assigned_to = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_ratings.ticket_id
    AND (public.is_staff(auth.uid()) OR t.assigned_to = auth.uid())));