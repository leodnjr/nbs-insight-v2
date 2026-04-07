-- Modify the handle_new_user trigger to NOT assign roles automatically
-- New users will be pending until an admin approves them

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Create profile only, NO role assignment
  INSERT INTO public.profiles (id, full_name, store)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'store'
  );
  
  -- First user ever still gets admin automatically
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  -- All other users remain pending (no role assigned)
  
  RETURN NEW;
END;
$function$;