-- Prevent non-admins from changing full_name and store on their own profile
-- These fields are used by RLS policies on vendas and metas tables
CREATE OR REPLACE FUNCTION public.prevent_profile_rls_field_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.full_name := OLD.full_name;
    NEW.store := OLD.store;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_rls_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_rls_field_change();