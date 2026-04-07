export type ModuleType = 'diretoria' | 'gerencia' | 'pos-venda';

export interface Module {
  id: ModuleType;
  name: string;
  description: string;
  defaultTab: string;
}

export const MODULES: Record<ModuleType, Module> = {
  diretoria: {
    id: 'diretoria',
    name: 'Diretoria',
    description: 'Visão estratégica e análise de vendas',
    defaultTab: 'tempo-real'
  },
  gerencia: {
    id: 'gerencia',
    name: 'Gerência',
    description: 'Gestão operacional e performance',
    defaultTab: 'vendedores'
  },
  'pos-venda': {
    id: 'pos-venda',
    name: 'Pós-Venda',
    description: 'Service, peças e atendimento',
    defaultTab: 'panorama'
  }
};
