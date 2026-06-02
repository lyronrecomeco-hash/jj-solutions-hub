
-- 1. System logs (high-precision activity log)
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  level TEXT NOT NULL DEFAULT 'info',
  metadata JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read all logs" ON public.system_logs FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Authenticated insert own log" ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

CREATE INDEX idx_system_logs_created ON public.system_logs (created_at DESC);
CREATE INDEX idx_system_logs_entity ON public.system_logs (entity, entity_id);
CREATE INDEX idx_system_logs_actor ON public.system_logs (actor_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;

-- 2. Notification preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON public.notification_preferences FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Ticket ratings (stars + comment)
CREATE TABLE public.ticket_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  rated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id)
);

GRANT SELECT, INSERT, UPDATE ON public.ticket_ratings TO authenticated;
GRANT ALL ON public.ticket_ratings TO service_role;

ALTER TABLE public.ticket_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ratings if can view ticket" ON public.ticket_ratings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_ratings.ticket_id
  AND (public.is_staff(auth.uid()) OR t.assigned_to = auth.uid())));

CREATE POLICY "Staff insert ratings" ON public.ticket_ratings FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- 4. Trigger: log ticket status changes automatically
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_logs (actor_id, action, entity, entity_id, level, metadata)
    VALUES (NEW.created_by, 'ticket.created', 'ticket', NEW.id, 'info',
      jsonb_build_object('ticket_number', NEW.ticket_number, 'title', NEW.title, 'priority', NEW.priority));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.system_logs (actor_id, action, entity, entity_id, level, metadata)
      VALUES (auth.uid(), 'ticket.status_changed', 'ticket', NEW.id, 'info',
        jsonb_build_object('from', OLD.status, 'to', NEW.status, 'ticket_number', NEW.ticket_number));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.system_logs (actor_id, action, entity, entity_id, level, metadata)
      VALUES (auth.uid(), 'ticket.assigned', 'ticket', NEW.id, 'info',
        jsonb_build_object('assigned_to', NEW.assigned_to, 'ticket_number', NEW.ticket_number));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.system_logs (actor_id, action, entity, entity_id, level, metadata)
    VALUES (auth.uid(), 'ticket.deleted', 'ticket', OLD.id, 'warn',
      jsonb_build_object('ticket_number', OLD.ticket_number));
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_log_tickets
AFTER INSERT OR UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();

-- 5. Trigger: log signups
CREATE OR REPLACE FUNCTION public.log_signup_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_logs (action, entity, entity_id, level, metadata)
    VALUES ('signup.created', 'signup', NEW.id, 'info',
      jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.system_logs (actor_id, action, entity, entity_id, level, metadata)
    VALUES (auth.uid(), 'signup.status_changed', 'signup', NEW.id, 'info',
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'email', NEW.email));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_signups
AFTER INSERT OR UPDATE ON public.technician_signups
FOR EACH ROW EXECUTE FUNCTION public.log_signup_changes();
