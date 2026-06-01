
-- Create storage bucket for ticket evidence uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ticket-evidence', 'ticket-evidence', true, 10485760, ARRAY['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Helper: allow staff to upload/read evidence
CREATE POLICY "Evidence public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-evidence');

CREATE POLICY "Authenticated upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-evidence');

CREATE POLICY "Authenticated delete own evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-evidence' AND owner = auth.uid());

-- Bucket for technician photos (used by the badge)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('technician-photos', 'technician-photos', true, 5242880, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tech photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'technician-photos');

CREATE POLICY "Staff upload tech photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'technician-photos' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff delete tech photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'technician-photos' AND public.is_staff(auth.uid()));

-- Allow admins to delete profiles (used by "Excluir técnico")
CREATE POLICY "Admins delete profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
