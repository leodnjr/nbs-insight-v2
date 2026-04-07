import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calcularVenda } from '@/lib/calculosVendas';
import { normalizarMarca } from '@/lib/marcaUtils';
import { calcularPeriodos } from '@/lib/periodoUtils';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { format } from 'date-fns';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

interface VendedorStats {
  vendedor: string;
  unidades: number;
  faturamento: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  comissaoMedia: number;
  variacaoUnidades?: number;
  variacaoFaturamento?: number;
  variacaoLucro?: number;
  variacaoMargem?: number;
  variacaoTicket?: number;
  variacaoComissao?: number;
}

type MetricaType = 'unidades' | 'faturamento' | 'lucro' | 'margem' | 'ticketMedio' | 'comissaoMedia';

export const EquipeGerencia = ({ vendas, filtros }: Props) => {
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | null>(null);

  // Filtrar vendas do período atual
  const vendasPeriodo = useMemo(() => {
    return vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !filtros.dataInicio || !filtros.dataFim) return false;
      return data >= filtros.dataInicio && data <= filtros.dataFim;
    });
  }, [vendas, filtros]);

  // Calcular período anterior para comparação
  const { vendasPeriodoAnterior } = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return { vendasPeriodoAnterior: [] };
    }

    const { periodoAnterior } = calcularPeriodos(filtros.dataInicio, filtros.dataFim, filtros.tipoPeriodo);

    const vendasAnt = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      return data >= periodoAnterior.inicio && data <= periodoAnterior.fim;
    });

    return {
      vendasPeriodoAnterior: vendasAnt,
    };
  }, [vendas, filtros]);

  // Agregar dados por vendedor
  const vendedoresStats = useMemo(() => {
    const statsMap = new Map<string, VendedorStats>();

    vendasPeriodo.forEach((venda) => {
      const vendedor = venda.nome_vendedor_completo || 'Sem Vendedor';
      const stats = statsMap.get(vendedor) || {
        vendedor,
        unidades: 0,
        faturamento: 0,
        lucro: 0,
        margem: 0,
        ticketMedio: 0,
        comissaoMedia: 0,
      };

      stats.unidades += 1;
      stats.faturamento += venda.valor_venda || 0;
      stats.lucro += venda.lucro_liquido;
      stats.comissaoMedia += venda.comissao_total;

      statsMap.set(vendedor, stats);
    });

    // Calcular médias e período anterior
    statsMap.forEach((stats, vendedor) => {
      stats.margem = stats.faturamento > 0 ? (stats.lucro / stats.faturamento) * 100 : 0;
      stats.ticketMedio = stats.unidades > 0 ? stats.faturamento / stats.unidades : 0;
      stats.comissaoMedia = stats.unidades > 0 ? stats.comissaoMedia / stats.unidades : 0;

      // Calcular variações vs período anterior
      const vendasAnteriores = vendasPeriodoAnterior.filter(
        (v) => (v.nome_vendedor_completo || 'Sem Vendedor') === vendedor
      );

      if (vendasAnteriores.length > 0) {
        const unidadesAnt = vendasAnteriores.length;
        const faturamentoAnt = vendasAnteriores.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
        const lucroAnt = vendasAnteriores.reduce((sum, v) => sum + v.lucro_liquido, 0);
        const margemAnt = faturamentoAnt > 0 ? (lucroAnt / faturamentoAnt) * 100 : 0;
        const ticketAnt = unidadesAnt > 0 ? faturamentoAnt / unidadesAnt : 0;
        const comissaoTotalAnt = vendasAnteriores.reduce((sum, v) => sum + v.comissao_total, 0);
        const comissaoMediaAnt = unidadesAnt > 0 ? comissaoTotalAnt / unidadesAnt : 0;

        stats.variacaoUnidades = unidadesAnt > 0 ? ((stats.unidades - unidadesAnt) / unidadesAnt) * 100 : 0;
        stats.variacaoFaturamento = faturamentoAnt > 0 ? ((stats.faturamento - faturamentoAnt) / faturamentoAnt) * 100 : 0;
        stats.variacaoLucro = lucroAnt > 0 ? ((stats.lucro - lucroAnt) / lucroAnt) * 100 : 0;
        stats.variacaoMargem = margemAnt > 0 ? stats.margem - margemAnt : 0;
        stats.variacaoTicket = ticketAnt > 0 ? ((stats.ticketMedio - ticketAnt) / ticketAnt) * 100 : 0;
        stats.variacaoComissao = comissaoMediaAnt > 0 ? ((stats.comissaoMedia - comissaoMediaAnt) / comissaoMediaAnt) * 100 : 0;
      }
    });

    return Array.from(statsMap.values());
  }, [vendasPeriodo, vendasPeriodoAnterior]);

  // Função para obter rankings
  const getRanking = (metrica: MetricaType) => {
    const sorted = [...vendedoresStats].sort((a, b) => {
      return b[metrica] - a[metrica];
    });

    const totalVendedores = sorted.length;

    if (totalVendedores >= 7) {
      return {
        top: sorted.slice(0, 5),
        bottom: sorted.slice(-2).reverse(),
      };
    } else if (totalVendedores === 6) {
      return {
        top: sorted.slice(0, 5),
        bottom: sorted.slice(-1),
      };
    } else {
      return {
        top: sorted,
        bottom: [],
      };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatVariacao = (value: number | undefined) => {
    if (value === undefined) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Sem dados do período anterior">
          <Minus className="h-3 w-3" />
          <span>N/A</span>
        </span>
      );
    }
    const isPositive = value >= 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const encurtarNome = (nome: string) => {
    const partes = nome.trim().split(' ');
    if (partes.length <= 2) return nome;
    return `${partes[0]} ${partes[partes.length - 1]}`;
  };

  const metricas: Array<{
    key: MetricaType;
    title: string;
    formatter: (value: number) => string;
    variacaoKey: keyof VendedorStats;
  }> = [
    { key: 'unidades', title: 'Unidades Vendidas', formatter: (v) => v.toString(), variacaoKey: 'variacaoUnidades' },
    { key: 'faturamento', title: 'Faturamento Total', formatter: formatCurrency, variacaoKey: 'variacaoFaturamento' },
    { key: 'lucro', title: 'Lucro Líquido', formatter: formatCurrency, variacaoKey: 'variacaoLucro' },
    { key: 'margem', title: 'Margem %', formatter: formatPercent, variacaoKey: 'variacaoMargem' },
    { key: 'ticketMedio', title: 'Ticket Médio', formatter: formatCurrency, variacaoKey: 'variacaoTicket' },
    { key: 'comissaoMedia', title: 'Comissão Média', formatter: formatCurrency, variacaoKey: 'variacaoComissao' },
  ];

  // Dados do modal
  const vendedorDetalhado = useMemo(() => {
    if (!vendedorSelecionado) return null;

    const vendasVendedor = vendasPeriodo.filter(
      (v) => (v.nome_vendedor_completo || 'Sem Vendedor') === vendedorSelecionado
    );

    const stats = vendedoresStats.find((v) => v.vendedor === vendedorSelecionado);

    // Vendas por marca
    const vendasPorMarca = vendasVendedor.reduce((acc, venda) => {
      const marca = normalizarMarca(venda.marca);
      acc[marca] = (acc[marca] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dadosMarca = Object.entries(vendasPorMarca).map(([marca, unidades]) => ({
      marca,
      unidades,
    }));

    return {
      vendedor: vendedorSelecionado,
      stats,
      vendas: vendasVendedor,
      dadosMarca,
    };
  }, [vendedorSelecionado, vendasPeriodo, vendedoresStats]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rankings da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricas.map(({ key, title, formatter, variacaoKey }) => {
              const { top, bottom } = getRanking(key);

              return (
                <Card key={key} className="border shadow-sm">
                  <CardHeader className="pb-3 bg-muted/20">
                    <CardTitle className="text-sm font-bold">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {/* TOP */}
                    <div className="space-y-1.5">
                      {top.map((vendedor, index) => (
                        <div
                          key={vendedor.vendedor}
                          className="px-2 py-1.5 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => setVendedorSelecionado(vendedor.vendedor)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {encurtarNome(vendedor.vendedor)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-sm font-bold text-right tabular-nums w-24">
                                {formatter(vendedor[key])}
                              </span>
                              <div className="w-16 flex justify-end">
                                {formatVariacao(vendedor[variacaoKey] as number | undefined)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Separador e BOTTOM */}
                    {bottom.length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <div className="space-y-1.5">
                          {bottom.map((vendedor, index) => (
                            <div
                              key={vendedor.vendedor}
                              className="px-2 py-1.5 rounded bg-red-50/50 hover:bg-red-100/50 cursor-pointer transition-colors"
                              onClick={() => setVendedorSelecionado(vendedor.vendedor)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-xs flex-shrink-0">
                                    {vendedoresStats.length - bottom.length + index + 1}
                                  </span>
                                  <span className="text-sm font-medium truncate text-red-700">
                                    {encurtarNome(vendedor.vendedor)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className="text-sm font-bold text-red-700 text-right tabular-nums w-24">
                                    {formatter(vendedor[key])}
                                  </span>
                                  <div className="w-16 flex justify-end">
                                    {vendedor[variacaoKey] !== undefined && formatVariacao(vendedor[variacaoKey] as number | undefined)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <Dialog open={!!vendedorSelecionado} onOpenChange={(open) => !open && setVendedorSelecionado(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detalhes - {vendedorDetalhado?.vendedor}
            </DialogTitle>
          </DialogHeader>

          {vendedorDetalhado && (
            <div className="space-y-6">
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">Unidades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{vendedorDetalhado.stats?.unidades || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">Faturamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(vendedorDetalhado.stats?.faturamento || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">Lucro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(vendedorDetalhado.stats?.lucro || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">Margem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatPercent(vendedorDetalhado.stats?.margem || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">Ticket Médio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(vendedorDetalhado.stats?.ticketMedio || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de vendas por marca */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vendas por Marca</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={vendedorDetalhado.dadosMarca}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="marca" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="unidades" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabela de vendas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Todas as Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">Margem %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendedorDetalhado.vendas.map((venda) => (
                          <TableRow key={venda.id}>
                            <TableCell>
                              {format(
                                new Date(filtros.usarDataVenda ? venda.data_venda! : venda.data_faturamento!),
                                'dd/MM/yyyy'
                              )}
                            </TableCell>
                            <TableCell>{normalizarMarca(venda.marca)}</TableCell>
                            <TableCell>{venda.veiculo}</TableCell>
                            <TableCell className="text-right">{formatCurrency(venda.valor_venda || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(venda.lucro_liquido)}</TableCell>
                            <TableCell className="text-right">{formatPercent(venda.margem_percent || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
