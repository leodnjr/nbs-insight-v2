export interface Venda {
  id?: string;
  chassi_completo: string;
  empresa_vendedora: string | null;
  marca: string | null;
  veiculo: string | null;
  tipo: string | null;
  nome_vendedor_completo: string | null;
  data_faturamento: string | null;
  data_venda: string | null;
  valor_venda: number | null;
  preco_venda: number | null;
  custo_total_final: number | null;
  comissao_final_vendedor: number | null;
  comissao_final_gerente: number | null;
  forplan: number | null;
  juros: number | null;
  margem_fi_percent: number | null;
  data_geracao: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VendaCalculada extends Venda {
  comissao_total: number;
  lucro_liquido: number;
  margem_percent: number | null;
  familia: string;
}

export interface Meta {
  id?: string;
  marca: string;
  loja: string;
  mes: string;
  meta_unidades: number;
  created_at?: string;
  updated_at?: string;
}

export interface FiltrosVenda {
  marca?: string;
  loja?: string;
  dataInicio?: string;
  dataFim?: string;
  familia?: string;
  vendedor?: string;
  usarDataVenda: boolean;
  tipoVeiculo: 'novos' | 'novos_seminovos';
  tipoPeriodo?: 'manual' | 'mes-corrente' | 'ultimos-30-dias' | 'ultimo-mes-fechado';
}
