CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Staff read settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins manage settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id uuid PRIMARY KEY,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read admin permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Admins manage admin permissions" ON public.admin_permissions;
CREATE POLICY "Staff read admin permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins manage admin permissions"
ON public.admin_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;
CREATE POLICY "Admins manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_unique
ON public.user_roles (user_id, role);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_ratings_ticket_unique
ON public.ticket_ratings (ticket_id);

CREATE OR REPLACE FUNCTION public.validate_ticket_finalization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  final_statuses text[] := ARRAY['resolved', 'partially_resolved', 'not_resolved'];
  report_ok boolean;
BEGIN
  IF NEW.status::text = ANY(final_statuses)
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.ticket_reports tr
      WHERE tr.ticket_id = NEW.id
        AND length(trim(coalesce(tr.routine_performed, ''))) >= 8
        AND jsonb_typeof(coalesce(tr.parts_used, '[]'::jsonb)) = 'array'
        AND jsonb_array_length(coalesce(tr.parts_used, '[]'::jsonb)) >= 1
    ) INTO report_ok;

    IF NOT report_ok THEN
      RAISE EXCEPTION 'Para encerrar o chamado, preencha a rotina executada e ao menos um equipamento/peça no relatório técnico.';
    END IF;

    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ticket_finalization_before_write ON public.tickets;
CREATE TRIGGER validate_ticket_finalization_before_write
BEFORE INSERT OR UPDATE OF status ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.validate_ticket_finalization();

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status_created
ON public.tickets (assigned_to, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_created
ON public.ticket_attachments (ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_technician_messages_ticket_created
ON public.technician_messages (ticket_id, created_at DESC);

INSERT INTO public.app_settings (key, value)
VALUES
  ('security', '{"antiTamper":true,"require2FAForAdmins":false,"sessionHardening":true}'::jsonb),
  ('operations', '{"defaultSlaHours":24,"autoAssign":false,"requireClosureReport":true,"slaAlerts":true}'::jsonb),
  ('notifications', '{"ticket":true,"signup":true,"message":true,"sla":true,"sound":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;