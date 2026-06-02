DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_client_id_fkey'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_to_profiles_fkey'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_assigned_to_profiles_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_created_by_profiles_fkey'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_created_by_profiles_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';