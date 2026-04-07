import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermissions {
  stores: string[];
  modules: ('diretoria' | 'gerencia' | 'pos-venda')[];
  canExport: boolean;
  canViewSellerDetails: boolean;
  canViewVehicleDetails: boolean;
  canViewFullTables: boolean;
  role: 'admin' | 'manager' | 'salesperson' | null;
}

export const useUserPermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermissions(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Buscar role do usuário
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const userRole = roleData?.role as 'admin' | 'manager' | 'salesperson' | null;

        // Admin tem tudo (único bypass)
        if (userRole === 'admin') {
          setPermissions({
            stores: [],
            modules: ['diretoria', 'gerencia', 'pos-venda'],
            canExport: true,
            canViewSellerDetails: true,
            canViewVehicleDetails: true,
            canViewFullTables: true,
            role: 'admin',
          });
          setLoading(false);
          return;
        }

        // Para todos os outros: acesso = exatamente o que foi configurado
        // Buscar lojas configuradas
        const { data: stores } = await supabase
          .from('user_stores')
          .select('store')
          .eq('user_id', user.id);

        // Buscar módulos configurados
        const { data: modules } = await supabase
          .from('user_modules')
          .select('module')
          .eq('user_id', user.id);

        // Buscar permissões específicas
        const { data: perms } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setPermissions({
          stores: stores?.map(s => s.store) || [],
          modules: modules?.map(m => m.module) || [],
          canExport: perms?.can_export || false,
          canViewSellerDetails: perms?.can_view_seller_details || false,
          canViewVehicleDetails: perms?.can_view_vehicle_details || false,
          canViewFullTables: perms?.can_view_full_tables || false,
          role: userRole,
        });
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Funções helper de validação
  const hasAccess = {
    // Verificar acesso a módulo
    toModule: (module: 'diretoria' | 'gerencia' | 'pos-venda'): boolean => {
      if (!permissions) return false;
      // Admin sempre tem acesso
      if (permissions.role === 'admin') return true;
      // Outros: acesso EXATO ao que foi configurado
      return permissions.modules.includes(module);
    },

    // Verificar acesso a loja
    toStore: (store: string): boolean => {
      if (!permissions) return false;
      // Admin sempre tem acesso
      if (permissions.role === 'admin') return true;
      // Se não tem lojas configuradas = SEM acesso a nenhuma loja
      if (permissions.stores.length === 0) return false;
      // Senão, verifica se tem a loja específica
      return permissions.stores.includes(store);
    },

    // Verificar se pode exportar
    toExport: (): boolean => {
      if (!permissions) return false;
      return permissions.canExport;
    },

    // Verificar se pode ver detalhes de vendedor
    toSellerDetails: (): boolean => {
      if (!permissions) return false;
      return permissions.canViewSellerDetails;
    },

    // Verificar se pode ver detalhes de veículo
    toVehicleDetails: (): boolean => {
      if (!permissions) return false;
      return permissions.canViewVehicleDetails;
    },

    // Verificar se pode ver tabelas completas
    toFullTables: (): boolean => {
      if (!permissions) return false;
      return permissions.canViewFullTables;
    },

    // Verificar se é admin
    isAdmin: (): boolean => {
      return permissions?.role === 'admin';
    },

    // Verificar se é gerente
    isManager: (): boolean => {
      return permissions?.role === 'manager';
    },

    // Verificar se é vendedor
    isSalesperson: (): boolean => {
      return permissions?.role === 'salesperson';
    },
  };

  // Filtrar dados por lojas permitidas
  const filterByStores = <T extends { empresa_vendedora?: string | null }>(data: T[]): T[] => {
    // Enquanto permissões estiverem carregando, não filtra nada para evitar "sumir" com os dados
    if (loading || !permissions) return data;
    // Admin vê tudo
    if (permissions.role === 'admin') return data;
    // Se não tem lojas configuradas = não vê nada
    if (permissions.stores.length === 0) return [];
    // Senão, filtra pelas lojas permitidas
    return data.filter(item => 
      item.empresa_vendedora && permissions.stores.includes(item.empresa_vendedora)
    );
  };

  return {
    permissions,
    loading,
    userId,
    hasAccess,
    filterByStores,
  };
};
