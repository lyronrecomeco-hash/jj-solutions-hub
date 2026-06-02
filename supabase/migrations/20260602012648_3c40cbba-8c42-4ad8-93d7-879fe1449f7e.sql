DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_ratings_ticket_id_fkey'
  ) THEN
    ALTER TABLE public.ticket_ratings
      ADD CONSTRAINT ticket_ratings_ticket_id_fkey
      FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "Staff update ratings" ON public.ticket_ratings;
CREATE POLICY "Staff update ratings"
  ON public.ticket_ratings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

ALTER TABLE public.ticket_reports
  ADD COLUMN IF NOT EXISTS routine_performed TEXT,
  ADD COLUMN IF NOT EXISTS parts_used JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.notification_enabled(_user_id uuid, _type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT np.enabled
    FROM public.notification_preferences np
    WHERE np.user_id = _user_id AND np.type = _type
    LIMIT 1
  ), true)
$$;

CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
  SELECT ur.user_id, 'signup', 'Nova solicitação de cadastro',
         NEW.full_name || ' solicitou cadastro como técnico.',
         '/cadastros-pendentes', 'signup', NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','supervisor')
    AND public.notification_enabled(ur.user_id, 'signup');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
    SELECT ur.user_id, 'ticket', 'Novo chamado: ' || NEW.ticket_number,
           NEW.title, '/chamados/' || NEW.id::text, 'ticket', NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','supervisor')
      AND public.notification_enabled(ur.user_id, 'ticket');
    IF NEW.assigned_to IS NOT NULL AND public.notification_enabled(NEW.assigned_to, 'ticket') THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
      VALUES (NEW.assigned_to, 'ticket', 'Você recebeu um chamado',
              NEW.ticket_number || ' — ' || NEW.title,
              '/chamados/' || NEW.id::text, 'ticket', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    IF public.notification_enabled(NEW.assigned_to, 'ticket') THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
      VALUES (NEW.assigned_to, 'ticket', 'Chamado atribuído a você',
              NEW.ticket_number || ' — ' || NEW.title,
              '/chamados/' || NEW.id::text, 'ticket', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.author_id = NEW.technician_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
    SELECT ur.user_id, 'message', 'Nova mensagem do técnico',
           COALESCE(LEFT(NEW.body, 80), '[mídia]'),
           '/mensagens?t=' || NEW.technician_id::text, 'message', NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','supervisor')
      AND ur.user_id <> NEW.author_id
      AND public.notification_enabled(ur.user_id, 'message');
  ELSE
    IF public.notification_enabled(NEW.technician_id, 'message') THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, entity, entity_id)
      VALUES (NEW.technician_id, 'message', 'Nova mensagem',
              COALESCE(LEFT(NEW.body, 80), '[mídia]'),
              '/mensagens?t=' || NEW.technician_id::text, 'message', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;