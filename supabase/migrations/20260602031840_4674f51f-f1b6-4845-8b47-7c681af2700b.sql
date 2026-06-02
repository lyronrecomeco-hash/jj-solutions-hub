CREATE OR REPLACE FUNCTION public.get_public_profile(_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  job_title text,
  specialty text,
  registration_code text,
  photo_url text,
  company text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.job_title, p.specialty, p.registration_code, p.photo_url, p.company
  FROM public.profiles p
  WHERE p.id = _id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;