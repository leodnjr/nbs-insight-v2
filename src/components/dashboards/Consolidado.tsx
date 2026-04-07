import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Percent, Calculator, Target, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { calcularPeriodos } from '@/lib/periodoUtils';
import { normalizarMarca, getCorMarca } from '@/lib/marcaUtils';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

export const Consolidado = ({ vendas, filtros }: Props) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Filtra vendas do período atual
  const vendasPeriodo = useMemo(() => {
    return vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !filtros.dataInicio || !filtros.dataFim) return false;
      return data >= filtros.dataInicio && data <= filtros.dataFim;
    });
  }, [vendas, filtros]);

  // Calcula período anterior usando a nova lógica
  const { periodoAnterior, vendasAnterior, infoPeriodo } = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return { periodoAnterior: null, vendasAnterior: [], infoPeriodo: null };
    }

    const { periodoAnterior: periodoAnt, ehMesCorrente, diasCorridos } = calcularPeriodos(
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
      vendasAnterior: vendasAnt,
      infoPeriodo: { ehMesCorrente, diasCorridos }
    };
  }, [vendas, filtros]);

  // Indicadores principais
  const indicadores = useMemo(() => {
    const calcularIndicadores = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;

      const unidades = vendas.length;
      const faturamentoTotal = vendas.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
      const lucroLiquidoTotal = vendas.reduce((sum, v) => sum + v.lucro_liquido, 0);
      const margemMedia = faturamentoTotal > 0 ? (lucroLiquidoTotal / faturamentoTotal) * 100 : 0;
      const ticketMedio = faturamentoTotal / unidades;
      const comissaoTotal = vendas.reduce((sum, v) => sum + v.comissao_total, 0);
      const percComissaoVenda = faturamentoTotal > 0 ? (comissaoTotal / faturamentoTotal) * 100 : 0;
      const forplanTotal = vendas.reduce((sum, v) => sum + (v.forplan || 0), 0);
      const lucroMedioPorVeiculo = lucroLiquidoTotal / unidades;

      return {
        unidades,
        faturamentoTotal,
        lucroLiquidoTotal,
        margemMedia,
        ticketMedio,
        comissaoTotal,
        percComissaoVenda,
        forplanTotal,
        lucroMedioPorVeiculo
      };
    };

    const atual = calcularIndicadores(vendasPeriodo);
    const anterior = calcularIndicadores(vendasAnterior);

    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // Ranking de Lojas (quando não filtrado por loja específica)
  const rankingLojas = useMemo(() => {
    if (filtros.loja) return [];

    const porLoja = vendasPeriodo.reduce((acc, v) => {
      const loja = v.empresa_vendedora || 'Sem Loja';
      if (!acc[loja]) {
        acc[loja] = {
          unidades: 0,
          faturamento: 0,
          lucro: 0,
          margem: 0
        };
      }
      acc[loja].unidades += 1;
      acc[loja].faturamento += v.valor_venda || 0;
      acc[loja].lucro += v.lucro_liquido;
      return acc;
    }, {} as Record<string, any>);

    let resultado = Object.entries(porLoja).map(([loja, data]) => ({
      loja,
      unidades: data.unidades,
      faturamento: data.faturamento,
      lucro: data.lucro,
      margemMedia: data.faturamento > 0 ? (data.lucro / data.faturamento) * 100 : 0,
      ticketMedio: data.faturamento / data.unidades,
      percMeta: 0 // TODO: Integrar com metas quando disponível
    }));

    // Aplicar ordenação
    if (sortConfig) {
      resultado.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof typeof a] as number;
        const bVal = b[sortConfig.key as keyof typeof b] as number;
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else {
      resultado.sort((a, b) => b.margemMedia - a.margemMedia);
    }

    // Identificar líder em margem
    const maxMargem = Math.max(...resultado.map(r => r.margemMedia));

    return resultado.map(r => ({
      ...r,
      isLider: r.margemMedia === maxMargem && maxMargem > 0
    }));
  }, [vendasPeriodo, filtros.loja, sortConfig]);

  // Ranking de Marcas (quando não filtrado)
  const rankingMarcas = useMemo(() => {
    if (filtros.marca || filtros.loja) return [];

    const porMarca = vendasPeriodo.reduce((acc, v) => {
      const marca = normalizarMarca(v.marca);
      if (!acc[marca]) {
        acc[marca] = {
          unidades: 0,
          faturamento: 0,
          lucro: 0
        };
      }
      acc[marca].unidades += 1;
      acc[marca].faturamento += v.valor_venda || 0;
      acc[marca].lucro += v.lucro_liquido;
      return acc;
    }, {} as Record<string, any>);

    let resultado = Object.entries(porMarca).map(([marca, data]) => ({
      marca,
      unidades: data.unidades,
      faturamento: data.faturamento,
      lucro: data.lucro,
      margemMedia: data.faturamento > 0 ? (data.lucro / data.faturamento) * 100 : 0,
      ticketMedio: data.faturamento / data.unidades
    }));

    // Aplicar ordenação
    if (sortConfig) {
      resultado.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof typeof a] as number;
        const bVal = b[sortConfig.key as keyof typeof b] as number;
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else {
      resultado.sort((a, b) => b.faturamento - a.faturamento);
    }

    return resultado;
  }, [vendasPeriodo, filtros.marca, filtros.loja, sortConfig]);

  // Histórico mensal (últimos 6 meses)
  const historicoMensal = useMemo(() => {
    const hoje = new Date();
    const meses: { mes: string; faturamento: number; lucro: number; margem: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesStr = data.toISOString().substring(0, 7); // YYYY-MM
      const mesNome = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      const vendasMes = vendas.filter(v => {
        const dataVenda = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
        return dataVenda && dataVenda.startsWith(mesStr);
      });

      const faturamento = vendasMes.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
      const lucro = vendasMes.reduce((sum, v) => sum + v.lucro_liquido, 0);
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      meses.push({
        mes: mesNome,
        faturamento,
        lucro,
        margem
      });
    }

    return meses;
  }, [vendas, filtros]);

  // Data da última atualização
  const ultimaAtualizacao = useMemo(() => {
    if (vendasPeriodo.length === 0) return null;
    const datasGeracao = vendasPeriodo
      .map(v => v.data_geracao)
      .filter(d => d)
      .sort()
      .reverse();
    return datasGeracao[0] || null;
  }, [vendasPeriodo]);

  const formatCurrency = (value: number, showCents: boolean = false) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calcularVariacao = (atual: number | undefined, anterior: number | undefined) => {
    if (!atual || !anterior || anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const IndicadorCard = ({ 
    titulo, 
    valor, 
    valorAnterior, 
    icone: Icone, 
    invertido = false,
    formato = 'currency' 
  }: { 
    titulo: string; 
    valor: number | undefined; 
    valorAnterior: number | undefined; 
    icone: any; 
    invertido?: boolean;
    formato?: 'currency' | 'percent' | 'number';
  }) => {
    const variacao = calcularVariacao(valor, valorAnterior);
    const melhorou = invertido ? (variacao && variacao < 0) : (variacao && variacao > 0);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
          <Icone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {valor !== undefined ? (
              formato === 'currency' ? formatCurrency(valor, true) :
              formato === 'percent' ? formatPercent(valor) :
              valor.toLocaleString('pt-BR')
            ) : '-'}
          </div>
          {variacao !== null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {melhorou ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">
                    {variacao > 0 ? '+' : ''}{formatPercent(variacao)}
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">
                    {formatPercent(variacao)}
                  </span>
                </>
              )}
              <span>vs M-1</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com data de atualização */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Painel Executivo</h2>
          <p className="text-sm text-muted-foreground">
            {!filtros.marca && !filtros.loja && 'Visão geral do grupo'}
            {filtros.marca && !filtros.loja && `Marca: ${filtros.marca}`}
            {filtros.loja && `Loja: ${filtros.loja}`}
          </p>
        </div>
        {ultimaAtualizacao && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Última atualização: {new Date(ultimaAtualizacao).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Indicadores principais - Linha 1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <IndicadorCard
          titulo="Unidades Vendidas"
          valor={indicadores.atual?.unidades}
          valorAnterior={indicadores.anterior?.unidades}
          icone={Package}
          formato="number"
        />
        <IndicadorCard
          titulo="Faturamento Total"
          valor={indicadores.atual?.faturamentoTotal}
          valorAnterior={indicadores.anterior?.faturamentoTotal}
          icone={DollarSign}
        />
        <IndicadorCard
          titulo="Lucro Líquido Total"
          valor={indicadores.atual?.lucroLiquidoTotal}
          valorAnterior={indicadores.anterior?.lucroLiquidoTotal}
          icone={TrendingUp}
        />
        <IndicadorCard
          titulo="Margem Média"
          valor={indicadores.atual?.margemMedia}
          valorAnterior={indicadores.anterior?.margemMedia}
          icone={Percent}
          formato="percent"
        />
      </div>

      {/* Indicadores principais - Linha 2 */}
      <div className="grid gap-4 md:grid-cols-5">
        <IndicadorCard
          titulo="Ticket Médio"
          valor={indicadores.atual?.ticketMedio}
          valorAnterior={indicadores.anterior?.ticketMedio}
          icone={DollarSign}
        />
        <IndicadorCard
          titulo="Comissão Total"
          valor={indicadores.atual?.comissaoTotal}
          valorAnterior={indicadores.anterior?.comissaoTotal}
          icone={Calculator}
          invertido
        />
        <IndicadorCard
          titulo="% Comissão/Venda"
          valor={indicadores.atual?.percComissaoVenda}
          valorAnterior={indicadores.anterior?.percComissaoVenda}
          icone={Percent}
          formato="percent"
          invertido
        />
        <IndicadorCard
          titulo="Forplan Total"
          valor={indicadores.atual?.forplanTotal}
          valorAnterior={indicadores.anterior?.forplanTotal}
          icone={DollarSign}
          invertido
        />
        <IndicadorCard
          titulo="Lucro Médio/Veículo"
          valor={indicadores.atual?.lucroMedioPorVeiculo}
          valorAnterior={indicadores.anterior?.lucroMedioPorVeiculo}
          icone={Target}
        />
      </div>

      {/* Aviso quando não há dados */}
      {vendasPeriodo.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Sem registros de vendas neste período.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gráficos e Rankings */}
      {vendasPeriodo.length > 0 && (
        <>
          {/* Histórico mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Últimos 6 meses - Faturamento, Lucro e Margem
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={historicoMensal} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="mes" />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => formatPercent(value)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <div className="font-semibold mb-2">{payload[0].payload.mes}</div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Faturamento:</span>
                                <span className="font-medium">{formatCurrency(payload[0].payload.faturamento)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Lucro:</span>
                                <span className="font-medium">{formatCurrency(payload[0].payload.lucro)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Margem:</span>
                                <span className="font-medium">{formatPercent(payload[0].payload.margem)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="faturamento" 
                    stroke="#1E3A8A" 
                    strokeWidth={2}
                    name="Faturamento"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="lucro" 
                    stroke="#16A34A" 
                    strokeWidth={2}
                    name="Lucro"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="margem" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="Margem %"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking de Marcas */}
          {rankingMarcas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Marcas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique nos títulos das colunas para ordenar
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('marca')}
                      >
                        Marca {sortConfig?.key === 'marca' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('unidades')}
                      >
                        Unidades {sortConfig?.key === 'unidades' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('faturamento')}
                      >
                        Faturamento {sortConfig?.key === 'faturamento' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('lucro')}
                      >
                        Lucro {sortConfig?.key === 'lucro' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('margemMedia')}
                      >
                        Margem % {sortConfig?.key === 'margemMedia' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('ticketMedio')}
                      >
                        Ticket Médio {sortConfig?.key === 'ticketMedio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingMarcas.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.marca}</TableCell>
                        <TableCell className="text-right">{item.unidades}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.faturamento)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.lucro)}</TableCell>
                        <TableCell className="text-right">{formatPercent(item.margemMedia)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.ticketMedio, true)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Ranking de Lojas */}
          {rankingLojas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Lojas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Destaque em verde = líder em margem | Clique nos títulos para ordenar
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('loja')}
                      >
                        Loja {sortConfig?.key === 'loja' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('unidades')}
                      >
                        Unidades {sortConfig?.key === 'unidades' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('faturamento')}
                      >
                        Faturamento {sortConfig?.key === 'faturamento' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('lucro')}
                      >
                        Lucro {sortConfig?.key === 'lucro' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('margemMedia')}
                      >
                        Margem % {sortConfig?.key === 'margemMedia' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('ticketMedio')}
                      >
                        Ticket Médio {sortConfig?.key === 'ticketMedio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingLojas.map((item, index) => (
                      <TableRow 
                        key={index}
                        className={item.isLider ? 'bg-green-50 dark:bg-green-950/20' : ''}
                      >
                        <TableCell className="font-medium">{item.loja}</TableCell>
                        <TableCell className="text-right">{item.unidades}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.faturamento)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.lucro)}</TableCell>
                        <TableCell className="text-right">{formatPercent(item.margemMedia)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.ticketMedio, true)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
