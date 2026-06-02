
-- Phase 1: document upload on signup
ALTER TABLE public.technician_signups
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS document_type text;

-- Phase 1: storage bucket for signup documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('signup-documents', 'signup-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload (anonymous signup needs this)
DROP POLICY IF EXISTS "Anyone can upload signup documents" ON storage.objects;
CREATE POLICY "Anyone can upload signup documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'signup-documents');

DROP POLICY IF EXISTS "Anyone can read signup documents" ON storage.objects;
CREATE POLICY "Anyone can read signup documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'signup-documents');

-- Phase 6: enable realtime on tickets (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_reports;
  END IF;
END $$;

ALTER TABLE public.tickets REPLICA IDENTITY FULL;
