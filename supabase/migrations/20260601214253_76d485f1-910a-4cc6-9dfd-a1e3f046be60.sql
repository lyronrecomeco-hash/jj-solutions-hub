-- 1. Enum de vínculo
CREATE TYPE public.employment_type AS ENUM ('field', 'clt', 'pj', 'internal');

-- 2. Campos adicionais no profile do técnico
ALTER TABLE public.profiles
  ADD COLUMN employment_type public.employment_type NOT NULL DEFAULT 'field',
  ADD COLUMN cpf text,
  ADD COLUMN rg text,
  ADD COLUMN birth_date date,
  ADD COLUMN cep text,
  ADD COLUMN address text,
  ADD COLUMN address_number text,
  ADD COLUMN address_complement text,
  ADD COLUMN neighborhood text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN photo_url text,
  ADD COLUMN bio text;

CREATE UNIQUE INDEX profiles_cpf_unique ON public.profiles (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX profiles_rg_unique  ON public.profiles (rg)  WHERE rg  IS NOT NULL;

-- 3. Equipamentos do técnico
CREATE TABLE public.technician_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  serial_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_equipment TO authenticated;
GRANT ALL ON public.technician_equipment TO service_role;

ALTER TABLE public.technician_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technician sees own equipment"
  ON public.technician_equipment FOR SELECT TO authenticated
  USING (technician_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "Technician manages own equipment"
  ON public.technician_equipment FOR ALL TO authenticated
  USING (technician_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (technician_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER trg_technician_equipment_updated
  BEFORE UPDATE ON public.technician_equipment
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Cadastros pendentes (auto-cadastro público)
CREATE TYPE public.signup_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.technician_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cpf text,
  rg text,
  birth_date date,
  cep text,
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  specialty text,
  desired_employment_type public.employment_type NOT NULL DEFAULT 'field',
  status public.signup_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.technician_signups TO anon;
GRANT SELECT, INSERT, UPDATE ON public.technician_signups TO authenticated;
GRANT ALL ON public.technician_signups TO service_role;

ALTER TABLE public.technician_signups ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode criar uma solicitação de cadastro
CREATE POLICY "Public can create signup"
  ON public.technician_signups FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Staff lê e gerencia todas
CREATE POLICY "Staff read signups"
  ON public.technician_signups FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff update signups"
  ON public.technician_signups FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_technician_signups_updated
  BEFORE UPDATE ON public.technician_signups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();