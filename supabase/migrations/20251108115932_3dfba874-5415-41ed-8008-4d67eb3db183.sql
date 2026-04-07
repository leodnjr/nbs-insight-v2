-- Fix: Auto-assign roles on user registration to prevent authentication lockout
-- This updates the handle_new_user trigger to assign roles automatically

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, store)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'store'
  );
  
  -- Assign role: First user becomes admin, others become salesperson
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    -- First user gets admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Subsequent users get salesperson role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'salesperson');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix existing user without role (assign admin to Leo De Nigris Jr)
INSERT INTO public.user_roles (user_id, role)
VALUES ('1a97c7d5-0812-4676-a3e3-7166c80bfa2b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;