/**
 * Utilitário para cálculo de períodos com timezone America/Sao_Paulo
 */

/**
 * Retorna a data atual no timezone de São Paulo (apenas data, sem hora)
 */
export const getHojeSaoPaulo = (): Date => {
  const now = new Date();
  const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  // Zera hora para comparação apenas de data
  saoPauloTime.setHours(0, 0, 0, 0);
  return saoPauloTime;
};

/**
 * Converte string de data (YYYY-MM-DD) para Date sem timezone issues
 */
const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formata Date para string YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calcula o período "Últimos 30 dias"
 */
export const calcularUltimos30Dias = () => {
  const hoje = getHojeSaoPaulo();
  
  // Período atual: últimos 30 dias até hoje
  const fimAtual = hoje;
  const inicioAtual = new Date(hoje);
  inicioAtual.setDate(inicioAtual.getDate() - 29); // 30 dias incluindo hoje
  
  // Período anterior: 30 dias anteriores ao período atual
  const fimAnterior = new Date(inicioAtual);
  fimAnterior.setDate(fimAnterior.getDate() - 1); // Dia antes do início atual
  const inicioAnterior = new Date(fimAnterior);
  inicioAnterior.setDate(inicioAnterior.getDate() - 29); // 30 dias
  
  return {
    periodoAtual: {
      inicio: formatDate(inicioAtual),
      fim: formatDate(fimAtual)
    },
    periodoAnterior: {
      inicio: formatDate(inicioAnterior),
      fim: formatDate(fimAnterior)
    },
    diasCorridos: 30,
    ehMesCorrente: false
  };
};

/**
 * Calcula o período "Último mês fechado"
 */
export const calcularUltimoMesFechado = () => {
  const hoje = getHojeSaoPaulo();
  
  // Período atual: mês anterior completo (M-1)
  const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  
  // Período de comparação: mês anterior ao anterior (M-2)
  const primeiroDiaMesComparacao = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const ultimoDiaMesComparacao = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 0);
  
  const diasNoMes = ultimoDiaMesAnterior.getDate();
  
  return {
    periodoAtual: {
      inicio: formatDate(primeiroDiaMesAnterior),
      fim: formatDate(ultimoDiaMesAnterior)
    },
    periodoAnterior: {
      inicio: formatDate(primeiroDiaMesComparacao),
      fim: formatDate(ultimoDiaMesComparacao)
    },
    diasCorridos: diasNoMes,
    ehMesCorrente: false
  };
};

/**
 * Verifica se o período corresponde ao "Mês Corrente"
 */
export const isMesCorrente = (dataInicio: string, dataFim: string): boolean => {
  const hoje = getHojeSaoPaulo();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  const inicio = parseDate(dataInicio);
  const fim = parseDate(dataFim);
  
  // Normaliza para comparação (apenas data, sem hora)
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  primeiroDiaMes.setHours(0, 0, 0, 0);
  
  // Verifica se início é o 1º dia do mês atual
  const ehPrimeiroDia = inicio.getTime() === primeiroDiaMes.getTime();
  
  // Verifica se o fim está no mês atual (independente do dia exato)
  const ehMesmoMes = fim.getMonth() === hoje.getMonth() && fim.getFullYear() === hoje.getFullYear();
  
  return ehPrimeiroDia && ehMesmoMes;
};

/**
 * Calcula os períodos de comparação seguindo a regra de "Mês Corrente"
 * @param tipoPeriodo - Tipo do período selecionado
 */
export const calcularPeriodos = (dataInicio: string, dataFim: string, tipoPeriodo?: 'manual' | 'mes-corrente' | 'ultimos-30-dias' | 'ultimo-mes-fechado') => {
  // Se o tipo de período for especificado, usa o cálculo específico
  if (tipoPeriodo === 'ultimos-30-dias') {
    return calcularUltimos30Dias();
  }
  
  if (tipoPeriodo === 'ultimo-mes-fechado') {
    return calcularUltimoMesFechado();
  }
  
  // Para 'mes-corrente' ou 'manual', usa a lógica existente
  const hoje = getHojeSaoPaulo();
  const inicio = parseDate(dataInicio);
  const fim = parseDate(dataFim);
  
  // Verifica se é "Mês Corrente"
  const ehMesCorrente = isMesCorrente(dataInicio, dataFim);
  
  if (ehMesCorrente) {
    // Lógica para Mês Corrente
    // Período atual: 1º dia do mês até a data fim (que pode ser hoje ou último dia do mês)
    const inicioAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimAtual = fim;
    
    // Calcula quantos dias do mês atual estão no período
    const diasCorridos = fimAtual.getDate();
    
    // Período anterior: 1º dia do mês anterior até mesmo número de dias
    const inicioAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    
    // Último dia do mês anterior
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    
    // Fim do período anterior: min(diasCorridos, último dia do mês anterior)
    const diaFimAnterior = Math.min(diasCorridos, ultimoDiaMesAnterior);
    const fimAnterior = new Date(inicioAnterior.getFullYear(), inicioAnterior.getMonth(), diaFimAnterior);
    
    return {
      periodoAtual: {
        inicio: formatDate(inicioAtual),
        fim: formatDate(fimAtual)
      },
      periodoAnterior: {
        inicio: formatDate(inicioAnterior),
        fim: formatDate(fimAnterior)
      },
      diasCorridos,
      ehMesCorrente: true
    };
  } else {
    // Lógica para outros períodos: período anterior de mesma duração imediatamente anterior
    const diffMs = fim.getTime() - inicio.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24)); // número de dias no período
    
    // Período anterior termina 1 dia antes do início do período atual
    const fimAnterior = new Date(inicio);
    fimAnterior.setDate(fimAnterior.getDate() - 1);
    
    // Período anterior começa N dias antes do fim anterior
    const inicioAnterior = new Date(fimAnterior);
    inicioAnterior.setDate(inicioAnterior.getDate() - diffDias);
    
    return {
      periodoAtual: {
        inicio: dataInicio,
        fim: dataFim
      },
      periodoAnterior: {
        inicio: formatDate(inicioAnterior),
        fim: formatDate(fimAnterior)
      },
      diasCorridos: diffDias + 1,
      ehMesCorrente: false
    };
  }
};

/**
 * Formata o nome do período para exibição
 */
export const formatarNomePeriodo = (dataInicio: string, dataFim: string, tipoPeriodo?: 'manual' | 'mes-corrente' | 'ultimos-30-dias' | 'ultimo-mes-fechado'): string => {
  if (tipoPeriodo === 'ultimos-30-dias') {
    return 'Últimos 30 dias';
  }
  
  if (tipoPeriodo === 'ultimo-mes-fechado') {
    return 'Último mês fechado';
  }
  
  if (tipoPeriodo === 'mes-corrente' || isMesCorrente(dataInicio, dataFim)) {
    return 'Mês Corrente';
  }
  
  const inicio = parseDate(dataInicio);
  const fim = parseDate(dataFim);
  
  return `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
};
