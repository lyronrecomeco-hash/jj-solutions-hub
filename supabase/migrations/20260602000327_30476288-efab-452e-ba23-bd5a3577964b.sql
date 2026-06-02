CREATE POLICY "Mark messages read"
ON public.technician_messages
FOR UPDATE
TO authenticated
USING ((technician_id = auth.uid()) OR is_staff(auth.uid()))
WITH CHECK ((technician_id = auth.uid()) OR is_staff(auth.uid()));