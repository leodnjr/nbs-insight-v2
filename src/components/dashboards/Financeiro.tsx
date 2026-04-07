import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, Rectangle } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { normalizarMarca, getCorMarca } from '@/lib/marcaUtils';
import { calcularPeriodos } from '@/lib/periodoUtils';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

export const Financeiro = ({ vendas, filtros }: Props) => {
  // Calcula período atual
  const { periodoAtual } = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return { periodoAtual: { inicio: '', fim: '' } };
    }

    return {
      periodoAtual: { inicio: filtros.dataInicio, fim: filtros.dataFim }
    };
  }, [filtros.dataInicio, filtros.dataFim]);

  // Filtra vendas do período
  const vendasPeriodo = useMemo(() => {
    return vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !periodoAtual.inicio || !periodoAtual.fim) return false;
      return data >= periodoAtual.inicio && data <= periodoAtual.fim;
    });
  }, [vendas, periodoAtual, filtros]);

  // Calcula período anterior
  const { periodoAnterior, vendasAnterior } = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return { periodoAnterior: null, vendasAnterior: [] };
    }

    const { periodoAnterior: periodoAnt } = calcularPeriodos(
      filtros.dataInicio,
      filtros.dataFim,
      filtros.tipoPeriodo
    );

    const vendasAnt = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      return data >= periodoAnt.inicio && data <= periodoAnt.fim;
    });

    return {
      periodoAnterior: periodoAnt,
      vendasAnterior: vendasAnt
    };
  }, [vendas, filtros]);

  // Indicadores principais
  const indicadores = useMemo(() => {
    const calcularIndicadores = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;

      const margemMedia = vendas.reduce((sum, v) => sum + (v.margem_percent || 0), 0) / vendas.length;
      const lucroMedioPorCarro = vendas.reduce((sum, v) => sum + v.lucro_liquido, 0) / vendas.length;
      const ticketMedio = vendas.reduce((sum, v) => sum + (v.valor_venda || 0), 0) / vendas.length;
      const comissaoMedia = vendas.reduce((sum, v) => sum + v.comissao_total, 0) / vendas.length;
      const percComissaoVenda = ticketMedio > 0 ? (comissaoMedia / ticketMedio) * 100 : 0;

      return {
        margemMedia,
        lucroMedioPorCarro,
        ticketMedio,
        comissaoMedia,
        percComissaoVenda
      };
    };

    const atual = calcularIndicadores(vendasPeriodo);
    const anterior = calcularIndicadores(vendasAnterior);

    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // Dados do Waterfall
  // Estrutura: Faturamento → Custo (negativo) → Lucro
  const waterfallData = useMemo(() => {
    const faturamento = vendasPeriodo.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
    const custo = vendasPeriodo.reduce((sum, v) => sum + (v.custo_total_final || 0), 0);
    const lucroLiquido = faturamento - custo;

    return [
      { 
        name: 'Faturamento',
        start: 0,
        end: faturamento,
        value: faturamento,
        color: '#1E3A8A'
      },
      { 
        name: 'Custo Total',
        start: faturamento,
        end: lucroLiquido,
        value: custo,
        color: '#DC2626',
        isNegative: true
      },
      { 
        name: 'Lucro Líquido',
        start: 0,
        end: lucroLiquido,
        value: lucroLiquido,
        color: '#16A34A'
      }
    ];
  }, [vendasPeriodo]);

  // Calcula valores para o eixo Y com múltiplos redondos
  const yAxisConfig = useMemo(() => {
    const maxVal = Math.max(...waterfallData.map(d => d.end));
    
    // Determina o intervalo baseado na magnitude
    let interval;
    if (maxVal > 50_000_000) {
      interval = 10_000_000; // 10 milhões
    } else if (maxVal > 20_000_000) {
      interval = 5_000_000; // 5 milhões
    } else if (maxVal > 10_000_000) {
      interval = 2_000_000; // 2 milhões
    } else {
      interval = 1_000_000; // 1 milhão
    }
    
    const max = Math.ceil(maxVal / interval) * interval * 1.1;
    
    return { max, interval };
  }, [waterfallData]);

  // Ranking por Marca
  const rankingMarca = useMemo(() => {
    const porMarca = vendasPeriodo.reduce((acc, v) => {
      const marca = normalizarMarca(v.marca);
      if (!acc[marca]) {
        acc[marca] = {
          lucro: 0,
          faturamento: 0,
          comissao: 0,
          unidades: 0
        };
      }
      acc[marca].lucro += v.lucro_liquido;
      acc[marca].faturamento += v.valor_venda || 0;
      acc[marca].comissao += v.comissao_total;
      acc[marca].unidades += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porMarca)
      .map(([marca, data]) => ({
        marca,
        lucroLiquido: data.lucro,
        margemPercent: data.faturamento > 0 ? (data.lucro / data.faturamento) * 100 : 0,
        comissaoUnid: data.unidades > 0 ? data.comissao / data.unidades : 0
      }))
      .sort((a, b) => b.lucroLiquido - a.lucroLiquido);
  }, [vendasPeriodo]);

  // Ranking por Loja
  const rankingLoja = useMemo(() => {
    const porLoja = vendasPeriodo.reduce((acc, v) => {
      const loja = v.empresa_vendedora || 'Sem Loja';
      if (!acc[loja]) {
        acc[loja] = {
          lucro: 0,
          faturamento: 0,
          comissao: 0,
          unidades: 0
        };
      }
      acc[loja].lucro += v.lucro_liquido;
      acc[loja].faturamento += v.valor_venda || 0;
      acc[loja].comissao += v.comissao_total;
      acc[loja].unidades += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porLoja)
      .map(([loja, data]) => ({
        loja,
        lucroLiquido: data.lucro,
        margemPercent: data.faturamento > 0 ? (data.lucro / data.faturamento) * 100 : 0,
        comissaoUnid: data.unidades > 0 ? data.comissao / data.unidades : 0
      }))
      .sort((a, b) => b.lucroLiquido - a.lucroLiquido);
  }, [vendasPeriodo]);

  const formatCurrencyCards = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    const absValue = Math.abs(value);
    return `R$ ${absValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercentTrend = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Componente customizado para rótulos internos
  const CustomLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    const data = waterfallData[index];
    
    if (!data || !data.value || data.value === 0) return null;
    
    // Calcular posição Y do centro da barra
    const centerY = y + height / 2;
    
    return (
      <text 
        x={x + width / 2} 
        y={centerY} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="middle"
        className="font-semibold text-sm"
      >
        {formatCurrencyShort(data.value)}
      </text>
    );
  };

  // Componente para desenhar linhas conectoras entre barras
  const renderConnectors = () => {
    return (
      <g>
        {waterfallData.map((item, index) => {
          if (index >= waterfallData.length - 1) return null;
          
          const nextItem = waterfallData[index + 1];
          // As linhas serão desenhadas via customShape
          return null;
        })}
      </g>
    );
  };

  // Componente para desenhar linhas conectoras
  const ConnectorLine = (props: any) => {
    const { x, y, width, payload, index, data } = props;
    if (index >= data.length - 1) return null;
    
    const currentEnd = payload.end;
    const nextStart = data[index + 1].start;
    
    if (currentEnd !== nextStart) {
      const x1 = x + width;
      const y1 = y;
      const x2 = x + width + 20;
      const y2 = y;
      
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#CBD5E1"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      );
    }
    return null;
  };

  const renderTrend = (current: number, previous: number) => {
    const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const isPositive = diff >= 0;
    
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span>{formatPercentTrend(diff)} vs M-1</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Margem Média */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {indicadores.atual ? `${indicadores.atual.margemMedia.toFixed(1)}%` : '0%'}
            </div>
            {indicadores.atual && indicadores.anterior && 
              renderTrend(indicadores.atual.margemMedia, indicadores.anterior.margemMedia)
            }
          </CardContent>
        </Card>

        {/* Lucro Médio/Carro */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Médio/Carro</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {indicadores.atual ? formatCurrencyCards(indicadores.atual.lucroMedioPorCarro) : 'R$ 0,00'}
            </div>
            {indicadores.atual && indicadores.anterior && 
              renderTrend(indicadores.atual.lucroMedioPorCarro, indicadores.anterior.lucroMedioPorCarro)
            }
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {indicadores.atual ? formatCurrencyCards(indicadores.atual.ticketMedio) : 'R$ 0,00'}
            </div>
            {indicadores.atual && indicadores.anterior && 
              renderTrend(indicadores.atual.ticketMedio, indicadores.anterior.ticketMedio)
            }
          </CardContent>
        </Card>

        {/* Comissão Média/Veículo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Média/Veículo</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {indicadores.atual ? formatCurrencyCards(indicadores.atual.comissaoMedia) : 'R$ 0,00'}
            </div>
            {indicadores.atual && indicadores.anterior && 
              renderTrend(indicadores.atual.comissaoMedia, indicadores.anterior.comissaoMedia)
            }
          </CardContent>
        </Card>
      </div>

      {/* Card % Comissão/Venda - linha separada */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">% Comissão/Venda</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {indicadores.atual ? `${indicadores.atual.percComissaoVenda.toFixed(1)}%` : '0%'}
          </div>
          {indicadores.atual && indicadores.anterior && 
            renderTrend(indicadores.atual.percComissaoVenda, indicadores.anterior.percComissaoVenda)
          }
        </CardContent>
      </Card>

      {/* Waterfall Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Análise Waterfall - Faturamento ao Lucro Líquido
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Custo Total já inclui comissões e outros custos financeiros
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={waterfallData} 
              margin={{ top: 20, right: 40, left: 60, bottom: 60 }}
            >
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 14 }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, yAxisConfig.max]}
                ticks={Array.from(
                  { length: Math.ceil(yAxisConfig.max / yAxisConfig.interval) + 1 }, 
                  (_, i) => i * yAxisConfig.interval
                )}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <div className="font-semibold mb-2">{data.name}</div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Valor:</span>
                            <span className="font-medium">{formatCurrency(data.value)}</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-semibold">{formatCurrency(data.end)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {/* Barra base (transparente para criar o offset) */}
              <Bar dataKey="start" stackId="stack" fill="transparent" />
              
              {/* Barra de valor visível */}
              <Bar 
                dataKey={(entry) => entry.end - entry.start} 
                stackId="stack" 
                radius={[4, 4, 0, 0]}
              >
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList content={CustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ranking por Marca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ranking por Marca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Lucro Líquido</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                  <TableHead className="text-right">Comissão/unid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingMarca.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.marca}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.lucroLiquido)}</TableCell>
                    <TableCell className="text-right">{formatPercent(item.margemPercent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.comissaoUnid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Ranking por Loja */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Ranking por Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Lucro Líquido</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                  <TableHead className="text-right">Comissão/unid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingLoja.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.loja}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.lucroLiquido)}</TableCell>
                    <TableCell className="text-right">{formatPercent(item.margemPercent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.comissaoUnid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
