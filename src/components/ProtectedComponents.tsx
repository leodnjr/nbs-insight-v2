import { ReactNode } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { AccessDenied } from './AccessDenied';
import { Loader2 } from 'lucide-react';

interface ProtectedModuleProps {
  module: 'diretoria' | 'gerencia' | 'pos-venda';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que protege módulos verificando permissões do usuário
 * Uso: <ProtectedModule module="diretoria">Conteúdo</ProtectedModule>
 */
export const ProtectedModule = ({ module, children, fallback }: ProtectedModuleProps) => {
  const { hasAccess, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess.toModule(module)) {
    return fallback || <AccessDenied motivo="modulo" textoAdicional="Entre em contato com o administrador para solicitar acesso" />;
  }

  return <>{children}</>;
};

interface ProtectedActionProps {
  action: 'export' | 'sellerDetails' | 'vehicleDetails' | 'fullTables';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que protege ações específicas
 * Uso: <ProtectedAction action="export"><Button>Exportar</Button></ProtectedAction>
 */
export const ProtectedAction = ({ action, children, fallback }: ProtectedActionProps) => {
  const { hasAccess, loading } = useUserPermissions();

  if (loading) return null;

  const actionMap = {
    export: hasAccess.toExport(),
    sellerDetails: hasAccess.toSellerDetails(),
    vehicleDetails: hasAccess.toVehicleDetails(),
    fullTables: hasAccess.toFullTables(),
  };

  if (!actionMap[action]) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};
