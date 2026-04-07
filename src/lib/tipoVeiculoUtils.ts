import type { Venda } from '@/types/vendas';

/**
 * Normaliza o tipo de veículo seguindo as regras:
 * - Novo: tipo contém "novo", "0km", "zero km", "zero-km"
 * - Usado: tipo contém "usado", "semi", "semi-novo", "seminovo", "pre-owned", "pre owned", "preowned", "SN"
 * - Inferência: se tipo vazio e veículo começa com "SN-", considera Usado
 * - Semi-novos são sempre considerados Usados
 */
export const normalizarTipoVeiculo = (venda: Venda): 'novo' | 'usado' => {
  const tipo = (venda.tipo || '').toLowerCase().trim();
  const veiculo = (venda.veiculo || '').trim();

  // Palavras-chave para Novo
  const palavrasNovo = ['novo', '0km', 'zero km', 'zero-km'];
  
  // Palavras-chave para Usado (incluindo semi-novos)
  const palavrasUsado = ['usado', 'semi', 'semi-novo', 'seminovo', 'pre-owned', 'pre owned', 'preowned', 'sn'];

  // Se o tipo está definido, verificar palavras-chave
  if (tipo) {
    // Verifica se contém palavras de Usado (prioridade para semi-novo)
    if (palavrasUsado.some(palavra => tipo.includes(palavra))) {
      return 'usado';
    }
    
    // Verifica se contém palavras de Novo
    if (palavrasNovo.some(palavra => tipo.includes(palavra))) {
      return 'novo';
    }
  }

  // Inferência pelo campo veículo: se começa com "SN-", é Usado
  if (veiculo.startsWith('SN-')) {
    return 'usado';
  }

  // Default: considera Novo se não conseguiu classificar
  return 'novo';
};

/**
 * Filtra vendas com base no tipo de veículo selecionado
 */
export const filtrarPorTipoVeiculo = (
  vendas: any[],
  tipoVeiculo: 'novos' | 'novos_seminovos'
): any[] => {
  if (tipoVeiculo === 'novos_seminovos') {
    return vendas; // Retorna todos
  }

  // Filtra apenas Novos
  return vendas.filter(venda => normalizarTipoVeiculo(venda) === 'novo');
};
