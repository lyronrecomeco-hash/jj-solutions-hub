ALTER TABLE public.technician_signups
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_technician_signups_cpf_unique
  ON public.technician_signups (cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_technician_signups_rg_unique
  ON public.technician_signups (rg)
  WHERE rg IS NOT NULL AND rg <> '';