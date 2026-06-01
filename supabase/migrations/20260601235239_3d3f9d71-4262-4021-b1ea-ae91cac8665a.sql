
-- 1. Read receipts on technician_messages
ALTER TABLE public.technician_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  entity TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update their notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Technician locations
CREATE TABLE IF NOT EXISTS public.technician_locations (
  user_id UUID PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_locations TO authenticated;
GRANT ALL ON public.technician_locations TO service_role;

ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read all locations"
  ON public.technician_locations FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "User upsert own location"
  ON public.technician_locations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User updates own location"
  ON public.technician_locations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Add 'on_hold' to signup_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'on_hold'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'signup_status')) THEN
    ALTER TYPE signup_status ADD VALUE 'on_hold';
  END IF;
END $$;

-- 5. Allow staff to delete signups (so the 🗑 action works)
DROP POLICY IF EXISTS "Staff delete signups" ON public.technician_signups;
CREATE POLICY "Staff delete signups"
  ON public.technician_signups FOR DELETE TO authenticated
  USING (is_staff(auth.uid()));

-- 6. Auto-notification triggers
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
  SELECT ur.user_id, 'signup', 'Nova solicitação de cadastro',
         NEW.full_name || ' solicitou cadastro como técnico.',
         '/cadastros-pendentes', 'signup', NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','supervisor');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_signup ON public.technician_signups;
CREATE TRIGGER trg_notify_new_signup
  AFTER INSERT ON public.technician_signups
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_signup();

CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
    SELECT ur.user_id, 'ticket', 'Novo chamado: ' || NEW.ticket_number,
           NEW.title, '/chamados/' || NEW.id::text, 'ticket', NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','supervisor');
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
      VALUES (NEW.assigned_to, 'ticket', 'Você recebeu um chamado',
              NEW.ticket_number || ' — ' || NEW.title,
              '/chamados/' || NEW.id::text, 'ticket', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
    VALUES (NEW.assigned_to, 'ticket', 'Chamado atribuído a você',
            NEW.ticket_number || ' — ' || NEW.title,
            '/chamados/' || NEW.id::text, 'ticket', NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_ticket_changes ON public.tickets;
CREATE TRIGGER trg_notify_ticket_changes
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_changes();

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID;
BEGIN
  -- If author is the mural owner: notify staff. Otherwise: notify the mural owner.
  IF NEW.author_id = NEW.technician_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
    SELECT ur.user_id, 'message', 'Nova mensagem do técnico',
           COALESCE(LEFT(NEW.body, 80), '[mídia]'),
           '/mensagens?t=' || NEW.technician_id::text, 'message', NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','supervisor') AND ur.user_id <> NEW.author_id;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
    VALUES (NEW.technician_id, 'message', 'Nova mensagem',
            COALESCE(LEFT(NEW.body, 80), '[mídia]'),
            '/mensagens?t=' || NEW.technician_id::text, 'message', NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.technician_messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.technician_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 7. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_signups;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.technician_messages REPLICA IDENTITY FULL;
ALTER TABLE public.technician_locations REPLICA IDENTITY FULL;
ALTER TABLE public.technician_signups REPLICA IDENTITY FULL;
