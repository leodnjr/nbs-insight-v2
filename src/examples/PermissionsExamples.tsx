/**
 * GUIA DE USO: Hook useUserPermissions
 * 
 * Este hook fornece validação completa de permissões do usuário logado.
 * Inclui verificação de acesso a módulos, lojas, e ações específicas.
 */

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Download, Eye, Table } from 'lucide-react';
import { ProtectedAction, ProtectedModule } from '@/components/ProtectedComponents';

// ==================== EXEMPLO 1: Verificar permissões básicas ====================
export const PermissionsExample1 = () => {
  const { permissions, loading, hasAccess } = useUserPermissions();

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <h2>Suas Permissões:</h2>
      <ul>
        <li>Role: {permissions?.role}</li>
        <li>Pode exportar: {hasAccess.toExport() ? 'Sim' : 'Não'}</li>
        <li>Pode ver detalhes vendedor: {hasAccess.toSellerDetails() ? 'Sim' : 'Não'}</li>
        <li>É admin: {hasAccess.isAdmin() ? 'Sim' : 'Não'}</li>
      </ul>
    </div>
  );
};

// ==================== EXEMPLO 2: Proteger módulos inteiros ====================
export const ModuleExample = () => {
  return (
    <ProtectedModule module="diretoria">
      <div>
        <h1>Módulo Diretoria</h1>
        <p>Este conteúdo só é visível para quem tem acesso ao módulo Diretoria</p>
      </div>
    </ProtectedModule>
  );
};

// ==================== EXEMPLO 3: Proteger ações específicas (botões) ====================
export const ActionsExample = () => {
  const handleExport = () => {
    console.log('Exportando...');
  };

  const handleViewDetails = () => {
    console.log('Visualizando detalhes...');
  };

  return (
    <div className="flex gap-2">
      {/* Botão só aparece se usuário pode exportar */}
      <ProtectedAction action="export">
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </ProtectedAction>

      {/* Botão só aparece se usuário pode ver detalhes de vendedor */}
      <ProtectedAction action="sellerDetails">
        <Button variant="outline" onClick={handleViewDetails}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalhes
        </Button>
      </ProtectedAction>

      {/* Botão só aparece se usuário pode ver tabelas completas */}
      <ProtectedAction action="fullTables">
        <Button variant="secondary">
          <Table className="h-4 w-4 mr-2" />
          Tabela Completa
        </Button>
      </ProtectedAction>
    </div>
  );
};

// ==================== EXEMPLO 4: Verificar acesso manualmente ====================
export const ManualCheckExample = () => {
  const { hasAccess } = useUserPermissions();

  const handleAction = () => {
    if (!hasAccess.toExport()) {
      alert('Você não tem permissão para exportar');
      return;
    }
    
    // Continuar com a ação
    console.log('Exportando...');
  };

  return <Button onClick={handleAction}>Tentar Exportar</Button>;
};

// ==================== EXEMPLO 5: Filtrar dados por lojas ====================
export const FilterDataExample = () => {
  const { filterByStores } = useUserPermissions();

  // Dados de exemplo com empresa_vendedora
  const vendas = [
    { id: 1, empresa_vendedora: 'MB - Sao Paulo', valor: 100000 },
    { id: 2, empresa_vendedora: 'CJDR - Campinas', valor: 85000 },
    { id: 3, empresa_vendedora: 'LR - Ibirapuera', valor: 120000 },
  ];

  // Filtra automaticamente baseado nas lojas do usuário
  const vendasFiltradas = filterByStores(vendas);

  return (
    <div>
      <h3>Vendas que você pode ver:</h3>
      <ul>
        {vendasFiltradas.map(venda => (
          <li key={venda.id}>
            {venda.empresa_vendedora}: R$ {venda.valor.toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ==================== EXEMPLO 6: Renderização condicional ====================
export const ConditionalRenderExample = () => {
  const { hasAccess, permissions } = useUserPermissions();

  return (
    <div className="space-y-4">
      {/* Mostrar mensagem especial para admin */}
      {hasAccess.isAdmin() && (
        <div className="bg-primary/10 p-4 rounded">
          Você é administrador - tem acesso total
        </div>
      )}

      {/* Mostrar lojas do usuário */}
      {permissions && permissions.stores.length > 0 && (
        <div>
          <h4>Suas lojas:</h4>
          <ul>
            {permissions.stores.map(store => (
              <li key={store}>{store}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mostrar diferentes opções por role */}
      {hasAccess.isManager() && (
        <Button>Opções de Gerente</Button>
      )}

      {hasAccess.isSalesperson() && (
        <Button>Opções de Vendedor</Button>
      )}
    </div>
  );
};

// ==================== EXEMPLO 7: Verificar acesso a loja específica ====================
export const StoreAccessExample = () => {
  const { hasAccess } = useUserPermissions();

  const handleViewStore = (storeName: string) => {
    if (!hasAccess.toStore(storeName)) {
      alert(`Você não tem acesso à loja ${storeName}`);
      return;
    }

    console.log(`Visualizando dados da loja ${storeName}`);
  };

  return (
    <div className="space-y-2">
      <Button onClick={() => handleViewStore('MB - Sao Paulo')}>
        Ver MB São Paulo
      </Button>
      <Button onClick={() => handleViewStore('CJDR - Campinas')}>
        Ver CJDR Campinas
      </Button>
    </div>
  );
};

/**
 * RESUMO DAS FUNÇÕES DISPONÍVEIS:
 * 
 * hasAccess.toModule(module) - Verifica acesso a módulo
 * hasAccess.toStore(store) - Verifica acesso a loja
 * hasAccess.toExport() - Pode exportar?
 * hasAccess.toSellerDetails() - Pode ver detalhes de vendedor?
 * hasAccess.toVehicleDetails() - Pode ver detalhes de veículo?
 * hasAccess.toFullTables() - Pode ver tabelas completas?
 * hasAccess.isAdmin() - É admin?
 * hasAccess.isManager() - É gerente?
 * hasAccess.isSalesperson() - É vendedor?
 * 
 * filterByStores(data) - Filtra array por lojas permitidas
 * 
 * COMPONENTES HELPER:
 * <ProtectedModule module="diretoria">...</ProtectedModule>
 * <ProtectedAction action="export">...</ProtectedAction>
 */
