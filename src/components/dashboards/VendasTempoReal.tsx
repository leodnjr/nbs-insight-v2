import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, Settings2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { calcularPeriodos, getHojeSaoPaulo } from '@/lib/periodoUtils';
import { normalizarMarca, getCorMarca } from '@/lib/marcaUtils';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

export const VendasTempoReal = ({ vendas, filtros }: Props) => {
  // Estado para panorama (marca ou loja) - padrão é marca
  const [tipoPanorama, setTipoPanorama] = useState<'loja' | 'marca'>('marca');

  // Lista de todas as lojas disponíveis
  const todasLojas = useMemo(() => {
    const lojas = Array.from(new Set(vendas.map(v => v.empresa_vendedora).filter(Boolean)));
    return lojas.sort();
  }, [vendas]);

  // Lista de todas as marcas disponíveis
  const todasMarcas = useMemo(() => {
    const marcas = Array.from(new Set(vendas.map(v => normalizarMarca(v.marca))));
    return marcas.sort();
  }, [vendas]);

  // Estado para lojas selecionadas (inicialmente todas)
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([]);

  // Estado para marcas selecionadas (inicialmente todas)
  const [marcasSelecionadas, setMarcasSelecionadas] = useState<string[]>([]);

  // Inicializa lojas selecionadas quando todasLojas muda
  useMemo(() => {
    if (todasLojas.length > 0 && lojasSelecionadas.length === 0) {
      setLojasSelecionadas(todasLojas);
    }
  }, [todasLojas]);

  // Inicializa marcas selecionadas quando todasMarcas muda
  useMemo(() => {
    if (todasMarcas.length > 0 && marcasSelecionadas.length === 0) {
      setMarcasSelecionadas(todasMarcas);
    }
  }, [todasMarcas]);

  const toggleLoja = (loja: string) => {
    setLojasSelecionadas(prev => 
      prev.includes(loja) 
        ? prev.filter(l => l !== loja)
        : [...prev, loja]
    );
  };

  const toggleMarca = (marca: string) => {
    setMarcasSelecionadas(prev => 
      prev.includes(marca) 
        ? prev.filter(m => m !== marca)
        : [...prev, marca]
    );
  };

  const selecionarTodas = () => {
    if (tipoPanorama === 'loja') {
      setLojasSelecionadas(todasLojas);
    } else {
      setMarcasSelecionadas(todasMarcas);
    }
  };

  const desmarcarTodas = () => {
    if (tipoPanorama === 'loja') {
      setLojasSelecionadas([]);
    } else {
      setMarcasSelecionadas([]);
    }
  };

  // Calcula períodos usando a nova lógica
  const { periodoAtual, periodoAnterior, infoPeriodo } = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return { 
        periodoAtual: { inicio: '', fim: '' }, 
        periodoAnterior: { inicio: '', fim: '' },
        infoPeriodo: null
      };
    }

    const { periodoAtual: periodoAt, periodoAnterior: periodoAnt, ehMesCorrente, diasCorridos } = calcularPeriodos(
      filtros.dataInicio,
      filtros.dataFim,
      filtros.tipoPeriodo
    );

    return {
      periodoAtual: periodoAt,
      periodoAnterior: periodoAnt,
      infoPeriodo: { ehMesCorrente, diasCorridos }
    };
  }, [filtros.dataInicio, filtros.dataFim]);
  
  const stats = useMemo(() => {
    // Filtra vendas pelo período atual
    const vendasPeriodo = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAtual.inicio || !periodoAtual.fim) return false;
      return data >= periodoAtual.inicio && data <= periodoAtual.fim;
    });

    // Filtra vendas pelo período anterior
    const vendasPeriodoAnterior = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAnterior.inicio || !periodoAnterior.fim) return false;
      return data >= periodoAnterior.inicio && data <= periodoAnterior.fim;
    });

    const unidades = vendasPeriodo.length;
    const faturamento = vendasPeriodo.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
    const ticketMedio = unidades > 0 ? faturamento / unidades : 0;

    const unidadesAnterior = vendasPeriodoAnterior.length;
    const faturamentoAnterior = vendasPeriodoAnterior.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
    const ticketMedioAnterior = unidadesAnterior > 0 ? faturamentoAnterior / unidadesAnterior : 0;

    const variacaoUnidades = unidadesAnterior > 0 ? ((unidades - unidadesAnterior) / unidadesAnterior) * 100 : 0;
    const variacaoFaturamento = faturamentoAnterior > 0 ? ((faturamento - faturamentoAnterior) / faturamentoAnterior) * 100 : 0;
    const variacaoTicket = ticketMedioAnterior > 0 ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100 : 0;
    
    return { 
      unidades, 
      faturamento, 
      ticketMedio,
      unidadesAnterior,
      faturamentoAnterior,
      ticketMedioAnterior,
      variacaoUnidades,
      variacaoFaturamento,
      variacaoTicket
    };
  }, [vendas, periodoAtual, periodoAnterior, filtros]);

  const { dadosAcumulados, marcasVendas } = useMemo(() => {
    if (!periodoAtual.inicio || !periodoAtual.fim || !periodoAnterior.inicio || !periodoAnterior.fim) {
      return { dadosAcumulados: [], marcasVendas: [] };
    }

    // Obter todas as marcas únicas
    const marcas = Array.from(new Set(vendas.map(v => normalizarMarca(v.marca)))).sort();
    
    // Função para agrupar vendas por data e marca
    const agruparPorDataMarca = (vendasFiltradas: VendaCalculada[]) => {
      const agrupado: Record<string, Record<string, number>> = {};
      vendasFiltradas.forEach(v => {
        const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
        const marca = normalizarMarca(v.marca);
        if (!data || !marca) return;
        
        if (!agrupado[data]) agrupado[data] = {};
        if (!agrupado[data][marca]) agrupado[data][marca] = 0;
        agrupado[data][marca]++;
      });
      return agrupado;
    };

    // Filtra vendas período atual
    const vendasAtual = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      if (data < periodoAtual.inicio || data > periodoAtual.fim) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Filtra vendas período anterior
    const fimAnteriorGrafico = (() => {
      if (!infoPeriodo?.ehMesCorrente) return periodoAnterior.fim;
      const hoje = getHojeSaoPaulo();
      const endPrev = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return endPrev.toISOString().split('T')[0];
    })();

    const vendasAnterior = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      if (data < periodoAnterior.inicio || data > fimAnteriorGrafico) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    const vendasPorDiaAtual = agruparPorDataMarca(vendasAtual);
    const vendasPorDiaAnterior = agruparPorDataMarca(vendasAnterior);

    // Se for mês corrente
    if (infoPeriodo?.ehMesCorrente) {
      const hoje = getHojeSaoPaulo();
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const ultimoDiaAnterior = fimMesAnterior.getDate();
      const hojeDia = hoje.getDate();

      // Acumuladores por marca
      const acumAtual: Record<string, number> = {};
      const acumAnterior: Record<string, number> = {};
      marcas.forEach(m => {
        acumAtual[m] = 0;
        acumAnterior[m] = 0;
      });

      const resultado: any[] = [];
      const cursor = new Date(inicioMesAtual);
      let diaIndex = 1;
      
      while (cursor <= fimMesAtual) {
        const dataCurISO = cursor.toISOString().split('T')[0];
        const dataPrevISO = new Date(cursor.getFullYear(), cursor.getMonth() - 1, diaIndex).toISOString().split('T')[0];

        // Acumula por marca
        marcas.forEach(marca => {
          if (vendasPorDiaAtual[dataCurISO]?.[marca]) {
            acumAtual[marca] += vendasPorDiaAtual[dataCurISO][marca];
          }
          if (diaIndex <= ultimoDiaAnterior && vendasPorDiaAnterior[dataPrevISO]?.[marca]) {
            acumAnterior[marca] += vendasPorDiaAnterior[dataPrevISO][marca];
          }
        });

        const ponto: any = {
          data: cursor.toLocaleDateString('pt-BR')
        };

        // Adiciona linhas por marca
        marcas.forEach(marca => {
          ponto[`${marca}_anterior`] = diaIndex <= ultimoDiaAnterior ? acumAnterior[marca] : null;
          ponto[`${marca}_atual_solid`] = diaIndex <= hojeDia ? acumAtual[marca] : null;
          ponto[`${marca}_atual_futuro`] = diaIndex > hojeDia ? acumAtual[marca] : null;
        });

        resultado.push(ponto);
        cursor.setDate(cursor.getDate() + 1);
        diaIndex++;
      }

      return { dadosAcumulados: resultado, marcasVendas: marcas };
    }

    // Lógica padrão para outros períodos
    const todasDatas: string[] = [];
    const cursor = new Date(periodoAtual.inicio);
    const fim = new Date(periodoAtual.fim);
    while (cursor <= fim) {
      todasDatas.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    const todasDatasAnterior: string[] = [];
    const cursorAnt = new Date(periodoAnterior.inicio);
    const fimAnt = new Date(periodoAnterior.fim);
    while (cursorAnt <= fimAnt) {
      todasDatasAnterior.push(cursorAnt.toISOString().split('T')[0]);
      cursorAnt.setDate(cursorAnt.getDate() + 1);
    }

    // Acumuladores por marca
    const acumAtual: Record<string, number> = {};
    const acumAnterior: Record<string, number> = {};
    marcas.forEach(m => {
      acumAtual[m] = 0;
      acumAnterior[m] = 0;
    });

    const resultado = todasDatas.map((data, index) => {
      const ponto: any = {
        data: new Date(data).toLocaleDateString('pt-BR')
      };

      marcas.forEach(marca => {
        if (vendasPorDiaAtual[data]?.[marca]) {
          acumAtual[marca] += vendasPorDiaAtual[data][marca];
        }
        if (todasDatasAnterior[index]) {
          const dataAnt = todasDatasAnterior[index];
          if (vendasPorDiaAnterior[dataAnt]?.[marca]) {
            acumAnterior[marca] += vendasPorDiaAnterior[dataAnt][marca];
          }
        }

        ponto[`${marca}_atual`] = acumAtual[marca];
        ponto[`${marca}_anterior`] = acumAnterior[marca];
      });

      return ponto;
    });

    return { dadosAcumulados: resultado, marcasVendas: marcas };
  }, [vendas, filtros, periodoAtual, periodoAnterior, infoPeriodo]);

  const { dadosFaturamento, marcasFaturamento } = useMemo(() => {
    if (!periodoAtual.inicio || !periodoAtual.fim || !periodoAnterior.inicio || !periodoAnterior.fim) {
      return { dadosFaturamento: [], marcasFaturamento: [] };
    }

    // Obter todas as marcas únicas
    const marcas = Array.from(new Set(vendas.map(v => normalizarMarca(v.marca)))).sort();
    
    // Função para agrupar faturamento por data e marca
    const agruparPorDataMarca = (vendasFiltradas: VendaCalculada[]) => {
      const agrupado: Record<string, Record<string, number>> = {};
      vendasFiltradas.forEach(v => {
        const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
        const marca = normalizarMarca(v.marca);
        if (!data || !marca) return;
        
        if (!agrupado[data]) agrupado[data] = {};
        if (!agrupado[data][marca]) agrupado[data][marca] = 0;
        agrupado[data][marca] += v.valor_venda || 0;
      });
      return agrupado;
    };

    // Filtra vendas período atual
    const vendasAtual = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      if (data < periodoAtual.inicio || data > periodoAtual.fim) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Filtra vendas período anterior
    const fimAnteriorGrafico = (() => {
      if (!infoPeriodo?.ehMesCorrente) return periodoAnterior.fim;
      const hoje = getHojeSaoPaulo();
      const endPrev = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return endPrev.toISOString().split('T')[0];
    })();

    const vendasAnterior = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      if (data < periodoAnterior.inicio || data > fimAnteriorGrafico) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    const faturamentoPorDiaAtual = agruparPorDataMarca(vendasAtual);
    const faturamentoPorDiaAnterior = agruparPorDataMarca(vendasAnterior);

    // Se for mês corrente
    if (infoPeriodo?.ehMesCorrente) {
      const hoje = getHojeSaoPaulo();
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const ultimoDiaAnterior = fimMesAnterior.getDate();
      const hojeDia = hoje.getDate();

      // Acumuladores por marca
      const acumAtual: Record<string, number> = {};
      const acumAnterior: Record<string, number> = {};
      marcas.forEach(m => {
        acumAtual[m] = 0;
        acumAnterior[m] = 0;
      });

      const resultado: any[] = [];
      const cursor = new Date(inicioMesAtual);
      let diaIndex = 1;
      
      while (cursor <= fimMesAtual) {
        const dataCurISO = cursor.toISOString().split('T')[0];
        const dataPrevISO = new Date(cursor.getFullYear(), cursor.getMonth() - 1, diaIndex).toISOString().split('T')[0];

        // Acumula por marca
        marcas.forEach(marca => {
          if (faturamentoPorDiaAtual[dataCurISO]?.[marca]) {
            acumAtual[marca] += faturamentoPorDiaAtual[dataCurISO][marca];
          }
          if (diaIndex <= ultimoDiaAnterior && faturamentoPorDiaAnterior[dataPrevISO]?.[marca]) {
            acumAnterior[marca] += faturamentoPorDiaAnterior[dataPrevISO][marca];
          }
        });

        const ponto: any = {
          data: cursor.toLocaleDateString('pt-BR')
        };

        // Adiciona linhas por marca
        marcas.forEach(marca => {
          ponto[`${marca}_anterior`] = diaIndex <= ultimoDiaAnterior ? acumAnterior[marca] : null;
          ponto[`${marca}_atual_solid`] = diaIndex <= hojeDia ? acumAtual[marca] : null;
          ponto[`${marca}_atual_futuro`] = diaIndex > hojeDia ? acumAtual[marca] : null;
        });

        resultado.push(ponto);
        cursor.setDate(cursor.getDate() + 1);
        diaIndex++;
      }

      return { dadosFaturamento: resultado, marcasFaturamento: marcas };
    }

    // Lógica padrão para outros períodos
    const todasDatas: string[] = [];
    const cursor = new Date(periodoAtual.inicio);
    const fim = new Date(periodoAtual.fim);
    while (cursor <= fim) {
      todasDatas.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    const todasDatasAnterior: string[] = [];
    const cursorAnt = new Date(periodoAnterior.inicio);
    const fimAnt = new Date(periodoAnterior.fim);
    while (cursorAnt <= fimAnt) {
      todasDatasAnterior.push(cursorAnt.toISOString().split('T')[0]);
      cursorAnt.setDate(cursorAnt.getDate() + 1);
    }

    // Acumuladores por marca
    const acumAtual: Record<string, number> = {};
    const acumAnterior: Record<string, number> = {};
    marcas.forEach(m => {
      acumAtual[m] = 0;
      acumAnterior[m] = 0;
    });

    const resultado = todasDatas.map((data, index) => {
      const ponto: any = {
        data: new Date(data).toLocaleDateString('pt-BR')
      };

      marcas.forEach(marca => {
        if (faturamentoPorDiaAtual[data]?.[marca]) {
          acumAtual[marca] += faturamentoPorDiaAtual[data][marca];
        }
        if (todasDatasAnterior[index]) {
          const dataAnt = todasDatasAnterior[index];
          if (faturamentoPorDiaAnterior[dataAnt]?.[marca]) {
            acumAnterior[marca] += faturamentoPorDiaAnterior[dataAnt][marca];
          }
        }

        ponto[`${marca}_atual`] = acumAtual[marca];
        ponto[`${marca}_anterior`] = acumAnterior[marca];
      });

      return ponto;
    });

    return { dadosFaturamento: resultado, marcasFaturamento: marcas };
  }, [vendas, filtros, periodoAtual, periodoAnterior, infoPeriodo]);

  const { dadosLucro, marcasLucro } = useMemo(() => {
    if (!periodoAtual.inicio || !periodoAtual.fim || !periodoAnterior.inicio || !periodoAnterior.fim) {
      return { dadosLucro: [], marcasLucro: [] };
    }

    // Obter todas as marcas únicas
    const marcas = Array.from(new Set(vendas.map(v => normalizarMarca(v.marca)))).sort();
    
    // Função para agrupar lucro por data e marca
    const agruparPorDataMarca = (vendasFiltradas: VendaCalculada[]) => {
      const agrupado: Record<string, Record<string, number>> = {};
      vendasFiltradas.forEach(v => {
        const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
        const marca = normalizarMarca(v.marca);
        if (!data || !marca) return;
        
        if (!agrupado[data]) agrupado[data] = {};
        if (!agrupado[data][marca]) agrupado[data][marca] = 0;
        agrupado[data][marca] += v.lucro_liquido || 0;
      });
      return agrupado;
    };

    // Filtra vendas período atual
    const vendasAtual = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      if (data < periodoAtual.inicio || data > periodoAtual.fim) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Filtra vendas período anterior
    const fimAnteriorGrafico = (() => {
      if (!infoPeriodo?.ehMesCorrente) return periodoAnterior.fim;
      const hoje = getHojeSaoPaulo();
      const endPrev = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return endPrev.toISOString().split('T')[0];
    })();

    const vendasAnterior = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      if (data < periodoAnterior.inicio || data > fimAnteriorGrafico) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    const lucroPorDiaAtual = agruparPorDataMarca(vendasAtual);
    const lucroPorDiaAnterior = agruparPorDataMarca(vendasAnterior);

    // Se for mês corrente
    if (infoPeriodo?.ehMesCorrente) {
      const hoje = getHojeSaoPaulo();
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const ultimoDiaAnterior = fimMesAnterior.getDate();
      const hojeDia = hoje.getDate();

      // Acumuladores por marca
      const acumAtual: Record<string, number> = {};
      const acumAnterior: Record<string, number> = {};
      marcas.forEach(m => {
        acumAtual[m] = 0;
        acumAnterior[m] = 0;
      });

      const resultado: any[] = [];
      const cursor = new Date(inicioMesAtual);
      let diaIndex = 1;
      
      while (cursor <= fimMesAtual) {
        const dataCurISO = cursor.toISOString().split('T')[0];
        const dataPrevISO = new Date(cursor.getFullYear(), cursor.getMonth() - 1, diaIndex).toISOString().split('T')[0];

        // Acumula por marca
        marcas.forEach(marca => {
          if (lucroPorDiaAtual[dataCurISO]?.[marca]) {
            acumAtual[marca] += lucroPorDiaAtual[dataCurISO][marca];
          }
          if (diaIndex <= ultimoDiaAnterior && lucroPorDiaAnterior[dataPrevISO]?.[marca]) {
            acumAnterior[marca] += lucroPorDiaAnterior[dataPrevISO][marca];
          }
        });

        const ponto: any = {
          data: cursor.toLocaleDateString('pt-BR')
        };

        // Adiciona linhas por marca
        marcas.forEach(marca => {
          if (diaIndex <= hojeDia) {
            ponto[`${marca}_atual_solid`] = acumAtual[marca];
          }
          if (diaIndex > hojeDia) {
            ponto[`${marca}_atual_futuro`] = acumAtual[marca];
          }
          if (diaIndex <= ultimoDiaAnterior) {
            ponto[`${marca}_anterior`] = acumAnterior[marca];
          }
        });

        resultado.push(ponto);
        cursor.setDate(cursor.getDate() + 1);
        diaIndex++;
      }

      return { dadosLucro: resultado, marcasLucro: marcas };
    } else {
      // Período completo
      const todasDatas = new Set<string>();
      Object.keys(lucroPorDiaAtual).forEach(d => todasDatas.add(d));
      Object.keys(lucroPorDiaAnterior).forEach(d => todasDatas.add(d));

      const datasOrdenadas = Array.from(todasDatas).sort();

      const acumAtual: Record<string, number> = {};
      const acumAnterior: Record<string, number> = {};
      marcas.forEach(m => {
        acumAtual[m] = 0;
        acumAnterior[m] = 0;
      });

      const resultado = datasOrdenadas.map(data => {
        const ponto: any = {
          data: new Date(data).toLocaleDateString('pt-BR')
        };

        marcas.forEach(marca => {
          if (lucroPorDiaAtual[data]?.[marca]) {
            acumAtual[marca] += lucroPorDiaAtual[data][marca];
          }
          if (lucroPorDiaAnterior[data]?.[marca]) {
            acumAnterior[marca] += lucroPorDiaAnterior[data][marca];
          }

          ponto[`${marca}_atual`] = acumAtual[marca];
          ponto[`${marca}_anterior`] = acumAnterior[marca];
        });

        return ponto;
      });

      return { dadosLucro: resultado, marcasLucro: marcas };
    }
  }, [vendas, filtros, periodoAtual, periodoAnterior, infoPeriodo]);

  const dadosPorFamilia = useMemo(() => {
    // Filtra vendas do período atual com filtros globais
    const vendasPeriodo = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAtual.inicio || !periodoAtual.fim) return false;
      if (data < periodoAtual.inicio || data > periodoAtual.fim) return false;
      if (filtros.marca && normalizarMarca(v.marca) !== normalizarMarca(filtros.marca)) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.familia && v.familia !== filtros.familia) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    const porFamilia = vendasPeriodo.reduce((acc, v) => {
      const familia = v.familia;
      if (!acc[familia]) {
        acc[familia] = { unidades: 0, faturamento: 0 };
      }
      acc[familia].unidades++;
      acc[familia].faturamento += v.valor_venda || 0;
      return acc;
    }, {} as Record<string, { unidades: number; faturamento: number }>);

    return Object.entries(porFamilia)
      .map(([familia, dados]) => ({ familia, ...dados }))
      .sort((a, b) => b.unidades - a.unidades);
  }, [vendas, periodoAtual, filtros]);

  const dadosPorLoja = useMemo(() => {
    // Filtra vendas do período atual com filtros globais
    const vendasPeriodoAtual = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAtual.inicio || !periodoAtual.fim) return false;
      if (data < periodoAtual.inicio || data > periodoAtual.fim) return false;
      if (filtros.marca && normalizarMarca(v.marca) !== normalizarMarca(filtros.marca)) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.familia && v.familia !== filtros.familia) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Filtra vendas do período anterior com filtros globais
    const vendasPeriodoAnterior = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAnterior.inicio || !periodoAnterior.fim) return false;
      if (data < periodoAnterior.inicio || data > periodoAnterior.fim) return false;
      if (filtros.marca && normalizarMarca(v.marca) !== normalizarMarca(filtros.marca)) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.familia && v.familia !== filtros.familia) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Agrupa por loja (apenas lojas selecionadas)
    const lojas = lojasSelecionadas;
    
    return lojas.map(loja => {
      const vendasLojaAtual = vendasPeriodoAtual.filter(v => v.empresa_vendedora === loja);
      const vendasLojaAnterior = vendasPeriodoAnterior.filter(v => v.empresa_vendedora === loja);

      const unidadesAtual = vendasLojaAtual.length;
      const unidadesAnterior = vendasLojaAnterior.length;
      const faturamentoAtual = vendasLojaAtual.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
      const faturamentoAnterior = vendasLojaAnterior.reduce((sum, v) => sum + (v.valor_venda || 0), 0);

      const variacaoUnidades = unidadesAnterior > 0 
        ? ((unidadesAtual - unidadesAnterior) / unidadesAnterior) * 100 
        : unidadesAtual > 0 ? 100 : 0;

      const variacaoFaturamento = faturamentoAnterior > 0
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100
        : faturamentoAtual > 0 ? 100 : 0;

      return {
        loja,
        unidadesAtual,
        unidadesAnterior,
        faturamentoAtual,
        faturamentoAnterior,
        variacaoUnidades,
        variacaoFaturamento
      };
    }).sort((a, b) => b.unidadesAtual - a.unidadesAtual);
  }, [vendas, filtros, periodoAtual, periodoAnterior, lojasSelecionadas]);

  const dadosPorMarca = useMemo(() => {
    // Filtra vendas do período atual com filtros globais
    const vendasPeriodoAtual = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAtual.inicio || !periodoAtual.fim) return false;
      if (data < periodoAtual.inicio || data > periodoAtual.fim) return false;
      if (filtros.marca && normalizarMarca(v.marca) !== normalizarMarca(filtros.marca)) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.familia && v.familia !== filtros.familia) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Filtra vendas do período anterior com filtros globais
    const vendasPeriodoAnterior = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAnterior.inicio || !periodoAnterior.fim) return false;
      if (data < periodoAnterior.inicio || data > periodoAnterior.fim) return false;
      if (filtros.marca && normalizarMarca(v.marca) !== normalizarMarca(filtros.marca)) return false;
      if (filtros.loja && v.empresa_vendedora !== filtros.loja) return false;
      if (filtros.familia && v.familia !== filtros.familia) return false;
      if (filtros.vendedor && v.nome_vendedor_completo !== filtros.vendedor) return false;
      return true;
    });

    // Agrupa por marca (apenas marcas selecionadas)
    const marcas = marcasSelecionadas;
    
    return marcas.map(marca => {
      const vendasMarcaAtual = vendasPeriodoAtual.filter(v => normalizarMarca(v.marca) === marca);
      const vendasMarcaAnterior = vendasPeriodoAnterior.filter(v => normalizarMarca(v.marca) === marca);

      const unidadesAtual = vendasMarcaAtual.length;
      const unidadesAnterior = vendasMarcaAnterior.length;
      const faturamentoAtual = vendasMarcaAtual.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
      const faturamentoAnterior = vendasMarcaAnterior.reduce((sum, v) => sum + (v.valor_venda || 0), 0);

      const variacaoUnidades = unidadesAnterior > 0 
        ? ((unidadesAtual - unidadesAnterior) / unidadesAnterior) * 100 
        : unidadesAtual > 0 ? 100 : 0;

      const variacaoFaturamento = faturamentoAnterior > 0
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100
        : faturamentoAtual > 0 ? 100 : 0;

      return {
        marca,
        unidadesAtual,
        unidadesAnterior,
        faturamentoAtual,
        faturamentoAnterior,
        variacaoUnidades,
        variacaoFaturamento
      };
    }).sort((a, b) => b.unidadesAtual - a.unidadesAtual);
  }, [vendas, filtros, periodoAtual, periodoAnterior, marcasSelecionadas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCurrencyAxis = (value: number) => {
    const valueInThousands = value / 1000;
    return valueInThousands.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Vendidas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unidades}</div>
            <div className="flex items-center gap-1 mt-1">
              {stats.variacaoUnidades > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : stats.variacaoUnidades < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <p className={`text-xs ${
                stats.variacaoUnidades > 0 ? 'text-green-500' : 
                stats.variacaoUnidades < 0 ? 'text-red-500' : 
                'text-muted-foreground'
              }`}>
                {stats.variacaoUnidades > 0 ? '+' : ''}{stats.variacaoUnidades.toFixed(1)}% vs período anterior
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Período anterior: {stats.unidadesAnterior}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.faturamento)}</div>
            <div className="flex items-center gap-1 mt-1">
              {stats.variacaoFaturamento > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : stats.variacaoFaturamento < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <p className={`text-xs ${
                stats.variacaoFaturamento > 0 ? 'text-green-500' : 
                stats.variacaoFaturamento < 0 ? 'text-red-500' : 
                'text-muted-foreground'
              }`}>
                {stats.variacaoFaturamento > 0 ? '+' : ''}{stats.variacaoFaturamento.toFixed(1)}% vs período anterior
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Período anterior: {formatCurrency(stats.faturamentoAnterior)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.ticketMedio)}</div>
            <div className="flex items-center gap-1 mt-1">
              {stats.variacaoTicket > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : stats.variacaoTicket < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <p className={`text-xs ${
                stats.variacaoTicket > 0 ? 'text-green-500' : 
                stats.variacaoTicket < 0 ? 'text-red-500' : 
                'text-muted-foreground'
              }`}>
                {stats.variacaoTicket > 0 ? '+' : ''}{stats.variacaoTicket.toFixed(1)}% vs período anterior
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Período anterior: {formatCurrency(stats.ticketMedioAnterior)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de panorama por loja ou marca */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Tabs value={tipoPanorama} onValueChange={(v) => setTipoPanorama(v as 'loja' | 'marca')}>
              <TabsList>
                <TabsTrigger value="marca">Panorama por Marca</TabsTrigger>
                <TabsTrigger value="loja">Panorama por Loja</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                {tipoPanorama === 'loja' 
                  ? `Selecionar Lojas (${lojasSelecionadas.length})`
                  : `Selecionar Marcas (${marcasSelecionadas.length})`
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-background z-50" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    {tipoPanorama === 'loja' ? 'Lojas a exibir' : 'Marcas a exibir'}
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selecionarTodas}>
                      Todas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={desmarcarTodas}>
                      Nenhuma
                    </Button>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {tipoPanorama === 'loja' ? (
                    todasLojas.map(loja => (
                      <div key={loja} className="flex items-center space-x-2">
                        <Checkbox
                          id={`loja-${loja}`}
                          checked={lojasSelecionadas.includes(loja)}
                          onCheckedChange={() => toggleLoja(loja)}
                        />
                        <label
                          htmlFor={`loja-${loja}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {loja}
                        </label>
                      </div>
                    ))
                  ) : (
                    todasMarcas.map(marca => (
                      <div key={marca} className="flex items-center space-x-2">
                        <Checkbox
                          id={`marca-${marca}`}
                          checked={marcasSelecionadas.includes(marca)}
                          onCheckedChange={() => toggleMarca(marca)}
                        />
                        <label
                          htmlFor={`marca-${marca}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {marca}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tipoPanorama === 'loja' ? (
            dadosPorLoja.map(loja => (
              <Card key={loja.loja}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{loja.loja}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-muted-foreground">Unidades</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{loja.unidadesAtual}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {loja.variacaoUnidades >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs font-medium ${loja.variacaoUnidades >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {loja.variacaoUnidades.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {loja.unidadesAnterior}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-muted-foreground">Faturamento</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(loja.faturamentoAtual)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {loja.variacaoFaturamento >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs font-medium ${loja.variacaoFaturamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {loja.variacaoFaturamento.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(loja.faturamentoAnterior)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            dadosPorMarca.map(marca => (
              <Card key={marca.marca}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{marca.marca}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-muted-foreground">Unidades</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{marca.unidadesAtual}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {marca.variacaoUnidades >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs font-medium ${marca.variacaoUnidades >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {marca.variacaoUnidades.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {marca.unidadesAnterior}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-muted-foreground">Faturamento</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(marca.faturamentoAtual)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {marca.variacaoFaturamento >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs font-medium ${marca.variacaoFaturamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {marca.variacaoFaturamento.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(marca.faturamentoAnterior)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vendas Acumuladas no Período</CardTitle>
        </CardHeader>
        <CardContent>
          {!dadosAcumulados || dadosAcumulados.length === 0 || !marcasVendas || marcasVendas.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dadosAcumulados}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                {marcasVendas && marcasVendas.map((marca: string, index: number) => {
                  const color = getCorMarca(marca, index);
                  
                  if (infoPeriodo?.ehMesCorrente) {
                    return (
                      <React.Fragment key={marca}>
                        <Line
                          type="monotone"
                          dataKey={`${marca}_atual_solid`}
                          stroke={color}
                          strokeWidth={2}
                          name={`${marca}`}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={`${marca}_anterior`}
                          stroke={color}
                          strokeWidth={2}
                          strokeOpacity={0.7}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  } else {
                    return (
                      <React.Fragment key={marca}>
                        <Line
                          type="monotone"
                          dataKey={`${marca}_atual`}
                          stroke={color}
                          strokeWidth={2}
                          name={`${marca}`}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={`${marca}_anterior`}
                          stroke={color}
                          strokeWidth={2}
                          strokeOpacity={0.7}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  }
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento Acumulado no Período</CardTitle>
        </CardHeader>
        <CardContent>
          {!dadosFaturamento || dadosFaturamento.length === 0 || !marcasFaturamento || marcasFaturamento.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dadosFaturamento}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis 
                  className="text-xs" 
                  tickFormatter={formatCurrencyAxis}
                  label={{ value: '(em milhares R$)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12 } }}
                />
                <Tooltip 
                  formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                {marcasFaturamento && marcasFaturamento.map((marca: string, index: number) => {
                  const color = getCorMarca(marca, index);
                  
                  if (infoPeriodo?.ehMesCorrente) {
                    return (
                      <React.Fragment key={marca}>
                        <Line
                          type="monotone"
                          dataKey={`${marca}_atual_solid`}
                          stroke={color}
                          strokeWidth={2}
                          name={`${marca}`}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={`${marca}_anterior`}
                          stroke={color}
                          strokeWidth={2}
                          strokeOpacity={0.7}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  } else {
                    return (
                      <React.Fragment key={marca}>
                        <Line
                          type="monotone"
                          dataKey={`${marca}_atual`}
                          stroke={color}
                          strokeWidth={2}
                          name={`${marca}`}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={`${marca}_anterior`}
                          stroke={color}
                          strokeWidth={2}
                          strokeOpacity={0.7}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  }
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lucro Líquido Acumulado no Período</CardTitle>
        </CardHeader>
        <CardContent>
          {!dadosLucro || dadosLucro.length === 0 || !marcasLucro || marcasLucro.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dadosLucro}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis 
                  className="text-xs" 
                  tickFormatter={formatCurrencyAxis}
                  label={{ value: '(em milhares R$)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12 } }}
                />
                <Tooltip 
                  formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                {marcasLucro && marcasLucro.map((marca: string, index: number) => {
                  const color = getCorMarca(marca, index);
                  
                  if (infoPeriodo?.ehMesCorrente) {
                    return (
                      <React.Fragment key={marca}>
                        <Line
                          type="monotone"
                          dataKey={`${marca}_atual_solid`}
                          stroke={color}
                          strokeWidth={2}
                          name={`${marca}`}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={`${marca}_anterior`}
                          stroke={color}
                          strokeWidth={2}
                          strokeOpacity={0.7}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  } else {
                    return (
                      <React.Fragment key={marca}>
                        <Line
                          type="monotone"
                          dataKey={`${marca}_atual`}
                          stroke={color}
                          strokeWidth={2}
                          name={`${marca}`}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={`${marca}_anterior`}
                          stroke={color}
                          strokeWidth={2}
                          strokeOpacity={0.7}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  }
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Família</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosPorFamilia}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="familia" className="text-xs" />
              <YAxis 
                yAxisId="left" 
                className="text-xs" 
                tickFormatter={(value) => formatCurrency(value)}
                label={{ value: 'Faturamento', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                className="text-xs"
                label={{ value: 'Unidades', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Faturamento') return formatCurrency(value as number);
                  return value;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="faturamento" fill="hsl(var(--chart-2))" name="Faturamento" />
              <Bar yAxisId="right" dataKey="unidades" fill="hsl(var(--chart-1))" name="Unidades" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
