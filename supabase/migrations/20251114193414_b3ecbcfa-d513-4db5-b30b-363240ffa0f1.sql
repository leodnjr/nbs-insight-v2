-- 1. Criar enum para módulos
CREATE TYPE public.app_module AS ENUM ('diretoria', 'gerencia', 'pos-venda');

-- 2. Tabela de lojas permitidas por usuário
CREATE TABLE public.user_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, store)
);

-- 3. Tabela de módulos permitidos por usuário
CREATE TABLE public.user_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, module)
);

-- 4. Tabela de permissões específicas por usuário
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_export BOOLEAN DEFAULT false,
  can_view_seller_details BOOLEAN DEFAULT false,
  can_view_vehicle_details BOOLEAN DEFAULT false,
  can_view_full_tables BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Enable RLS
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies para user_stores
CREATE POLICY "Admins can manage all stores" ON public.user_stores
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own stores" ON public.user_stores
FOR SELECT USING (auth.uid() = user_id);

-- 7. RLS Policies para user_modules
CREATE POLICY "Admins can manage all modules" ON public.user_modules
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own modules" ON public.user_modules
FOR SELECT USING (auth.uid() = user_id);

-- 8. RLS Policies para user_permissions
CREATE POLICY "Admins can manage all permissions" ON public.user_permissions
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own permissions" ON public.user_permissions
FOR SELECT USING (auth.uid() = user_id);

-- 9. Funções helper para checar permissões
CREATE OR REPLACE FUNCTION public.user_has_store_access(_user_id UUID, _store TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin tem acesso a tudo
  SELECT CASE 
    WHEN has_role(_user_id, 'admin') THEN true
    -- Se não tem stores configuradas = acesso a todas
    WHEN NOT EXISTS (SELECT 1 FROM user_stores WHERE user_id = _user_id) THEN true
    -- Senão, verifica se tem acesso específico
    ELSE EXISTS (SELECT 1 FROM user_stores WHERE user_id = _user_id AND store = _store)
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_module_access(_user_id UUID, _module app_module)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin tem acesso a tudo
  SELECT CASE 
    WHEN has_role(_user_id, 'admin') THEN true
    -- Se não tem módulos configurados = acesso a todos
    WHEN NOT EXISTS (SELECT 1 FROM user_modules WHERE user_id = _user_id) THEN true
    -- Senão, verifica se tem acesso específico
    ELSE EXISTS (SELECT 1 FROM user_modules WHERE user_id = _user_id AND module = _module)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(can_export BOOLEAN, can_view_seller_details BOOLEAN, can_view_vehicle_details BOOLEAN, can_view_full_tables BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin tem todas as permissões
  SELECT CASE WHEN has_role(_user_id, 'admin') THEN true ELSE COALESCE(p.can_export, false) END,
         CASE WHEN has_role(_user_id, 'admin') THEN true ELSE COALESCE(p.can_view_seller_details, false) END,
         CASE WHEN has_role(_user_id, 'admin') THEN true ELSE COALESCE(p.can_view_vehicle_details, false) END,
         CASE WHEN has_role(_user_id, 'admin') THEN true ELSE COALESCE(p.can_view_full_tables, false) END
  FROM user_permissions p
  WHERE p.user_id = _user_id
  UNION ALL
  SELECT true, true, true, true
  WHERE has_role(_user_id, 'admin') AND NOT EXISTS (SELECT 1 FROM user_permissions WHERE user_id = _user_id)
  LIMIT 1;
$$;

-- 10. Trigger para atualizar updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Migração automática de usuários existentes baseado na role
DO $$
DECLARE
  user_record RECORD;
  user_role app_role;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT ur.user_id, ur.role, p.store
    FROM user_roles ur
    LEFT JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role != 'salesperson'
  LOOP
    user_role := user_record.role;
    
    -- Configurar módulos baseado na role
    IF user_role = 'admin' THEN
      -- Admin: todos os módulos
      INSERT INTO user_modules (user_id, module) 
      VALUES 
        (user_record.user_id, 'diretoria'),
        (user_record.user_id, 'gerencia'),
        (user_record.user_id, 'pos-venda')
      ON CONFLICT DO NOTHING;
      
    ELSIF user_role = 'manager' THEN
      -- Gerente: gerência + pós-venda
      INSERT INTO user_modules (user_id, module) 
      VALUES 
        (user_record.user_id, 'gerencia'),
        (user_record.user_id, 'pos-venda')
      ON CONFLICT DO NOTHING;
      
      -- Adicionar loja do perfil se existir
      IF user_record.store IS NOT NULL THEN
        INSERT INTO user_stores (user_id, store) 
        VALUES (user_record.user_id, user_record.store)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
    -- Configurar permissões baseado na role
    INSERT INTO user_permissions (user_id, can_export, can_view_seller_details, can_view_vehicle_details, can_view_full_tables)
    VALUES (
      user_record.user_id,
      user_role IN ('admin', 'manager'),  -- pode exportar
      user_role IN ('admin', 'manager'),  -- pode ver detalhes vendedor
      user_role = 'admin',                -- pode ver detalhes veículo
      user_role = 'admin'                 -- pode ver tabelas completas
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;