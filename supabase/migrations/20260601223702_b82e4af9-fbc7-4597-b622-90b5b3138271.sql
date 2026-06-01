-- Messages per technician (chat de campo: registro de atendimento com mídia)
CREATE TABLE public.technician_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL,
  author_id uuid NOT NULL,
  ticket_id uuid,
  body text,
  media_url text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_msgs_tech ON public.technician_messages(technician_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.technician_messages TO authenticated;
GRANT ALL ON public.technician_messages TO service_role;

ALTER TABLE public.technician_messages ENABLE ROW LEVEL SECURITY;

-- O técnico vê seu próprio mural; staff vê todos
CREATE POLICY "View own or staff" ON public.technician_messages
  FOR SELECT TO authenticated
  USING (technician_id = auth.uid() OR author_id = auth.uid() OR is_staff(auth.uid()));

CREATE POLICY "Insert if owner of mural or staff" ON public.technician_messages
  FOR INSERT TO authenticated
  WITH CHECK ((author_id = auth.uid()) AND (technician_id = auth.uid() OR is_staff(auth.uid())));

CREATE POLICY "Delete own message or staff" ON public.technician_messages
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR is_staff(auth.uid()));

-- Bucket para mídia de mensagens
INSERT INTO storage.buckets (id, name, public) VALUES ('technician-messages', 'technician-messages', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read tech messages media" ON storage.objects
  FOR SELECT USING (bucket_id = 'technician-messages');

CREATE POLICY "Auth users upload tech message media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'technician-messages');

-- Tabela de logs de auditoria (consultas read-only por admins)
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Authenticated insert own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());