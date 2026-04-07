-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'salesperson');

-- Create profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  store TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's store from profile
CREATE OR REPLACE FUNCTION public.get_user_store(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store FROM public.profiles WHERE id = _user_id
$$;

-- Create function to get user's full name from profile
CREATE OR REPLACE FUNCTION public.get_user_name(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = _user_id
$$;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old permissive policies on vendas table
DROP POLICY IF EXISTS "Permitir leitura de vendas para todos" ON public.vendas;
DROP POLICY IF EXISTS "Permitir inserção de vendas para todos" ON public.vendas;
DROP POLICY IF EXISTS "Permitir atualização de vendas para todos" ON public.vendas;
DROP POLICY IF EXISTS "Permitir exclusão de vendas para todos" ON public.vendas;

-- New secure RLS policies for vendas table
-- Admins can do everything
CREATE POLICY "Admins can view all vendas"
ON public.vendas
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert vendas"
ON public.vendas
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vendas"
ON public.vendas
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vendas"
ON public.vendas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Managers can view vendas from their store
CREATE POLICY "Managers can view their store vendas"
ON public.vendas
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') 
  AND empresa_vendedora = public.get_user_store(auth.uid())
);

-- Salespeople can view only their own vendas
CREATE POLICY "Salespeople can view their own vendas"
ON public.vendas
FOR SELECT
USING (
  public.has_role(auth.uid(), 'salesperson') 
  AND nome_vendedor_completo = public.get_user_name(auth.uid())
);

-- Drop old permissive policies on metas table
DROP POLICY IF EXISTS "Permitir leitura de metas para todos" ON public.metas;
DROP POLICY IF EXISTS "Permitir inserção de metas para todos" ON public.metas;
DROP POLICY IF EXISTS "Permitir atualização de metas para todos" ON public.metas;
DROP POLICY IF EXISTS "Permitir exclusão de metas para todos" ON public.metas;

-- New secure RLS policies for metas table
CREATE POLICY "Admins can view all metas"
ON public.metas
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert metas"
ON public.metas
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update metas"
ON public.metas
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete metas"
ON public.metas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Managers can view metas for their store
CREATE POLICY "Managers can view their store metas"
ON public.metas
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') 
  AND loja = public.get_user_store(auth.uid())
);

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, store)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'store'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();