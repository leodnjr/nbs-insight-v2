import type { Venda, VendaCalculada } from '@/types/vendas';

export const calcularVenda = (venda: Venda): VendaCalculada => {
  // Comissão total apenas para exibição (já está incluída no Custo Total Final)
  const comissao_total = (venda.comissao_final_vendedor || 0) + (venda.comissao_final_gerente || 0);
  
  // Lucro líquido = Valor Venda - Custo Total Final
  // Custo Total Final já inclui: comissões, forplan, juros e outros custos
  const lucro_liquido = (venda.valor_venda || 0) - (venda.custo_total_final || 0);
  
  const margem_percent = venda.valor_venda && venda.valor_venda > 0
    ? (lucro_liquido / venda.valor_venda) * 100
    : null;
  
  // Determina a família
  let familia = venda.veiculo || 'Outros';
  if (familia.startsWith('SN-')) {
    familia = 'Semi-Novos';
  }
  
  return {
    ...venda,
    comissao_total,
    lucro_liquido,
    margem_percent,
    familia
  };
};

export const calcularMetaAjustada = (
  metaTotal: number,
  dataInicio: Date,
  dataFim: Date,
  vendasAteHoje: number
): { metaAjustada: number; metaDiaria: number } => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const totalDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasPassados = Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasRestantes = Math.max(totalDias - diasPassados, 0);
  
  const faltaVender = Math.max(metaTotal - vendasAteHoje, 0);
  const metaDiaria = diasRestantes > 0 ? faltaVender / diasRestantes : 0;
  const metaAjustada = vendasAteHoje + (metaDiaria * diasRestantes);
  
  return { metaAjustada, metaDiaria };
};

export const calcularMetaLinear = (
  metaTotal: number,
  dataInicio: Date,
  dataFim: Date,
  dataAtual: Date
): number => {
  const totalDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasPassados = Math.ceil((dataAtual.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return (metaTotal / totalDias) * Math.min(diasPassados, totalDias);
};
