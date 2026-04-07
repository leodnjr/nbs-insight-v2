import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Percent, Calculator, Receipt, Banknote } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { calcularPeriodos } from '@/lib/periodoUtils';
import { normalizarMarca, getCorMarca } from '@/lib/marcaUtils';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

export const LojaGerencia = ({ vendas, filtros }: Props) => {
  const [showAllSales, setShowAllSales] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<VendaCalculada | null>(null);

  // Filtra vendas do período atual
  const vendasPeriodo = useMemo(() => {
    return vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !filtros.dataInicio || !filtros.dataFim) return false;
      return data >= filtros.dataInicio && data <= filtros.dataFim;
    });
  }, [vendas, filtros]);

  // Calcula período anterior
  const { vendasAnterior } = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return { vendasAnterior: [] };
    }

    const { periodoAnterior } = calcularPeriodos(filtros.dataInicio, filtros.dataFim, filtros.tipoPeriodo);

    const vendasAnt = vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return false;
      return data >= periodoAnterior.inicio && data <= periodoAnterior.fim;
    });

    return { vendasAnterior: vendasAnt };
  }, [vendas, filtros]);

  // Indicadores principais
  const indicadores = useMemo(() => {
    const calcular = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;

      const unidades = vendas.length;
      const faturamento = vendas.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
      const lucro = vendas.reduce((sum, v) => sum + v.lucro_liquido, 0);
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
      const ticketMedio = faturamento / unidades;
      const comissaoTotal = vendas.reduce((sum, v) => sum + v.comissao_total, 0);
      const comissaoMedia = comissaoTotal / unidades;

      return { unidades, faturamento, lucro, margem, ticketMedio, comissaoMedia };
    };

    const atual = calcular(vendasPeriodo);
    const anterior = calcular(vendasAnterior);

    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // Últimas 5 vendas
  const vendasRecentes = useMemo(() => {
    return [...vendasPeriodo]
      .sort((a, b) => {
        const dataA = filtros.usarDataVenda ? a.data_venda : a.data_faturamento;
        const dataB = filtros.usarDataVenda ? b.data_venda : b.data_faturamento;
        if (!dataA || !dataB) return 0;
        return dataB.localeCompare(dataA);
      })
      .slice(0, 5);
  }, [vendasPeriodo, filtros.usarDataVenda]);

  // Vendas ordenadas (para modal "Ver todas")
  const todasVendasOrdenadas = useMemo(() => {
    return [...vendasPeriodo].sort((a, b) => {
      const dataA = filtros.usarDataVenda ? a.data_venda : a.data_faturamento;
      const dataB = filtros.usarDataVenda ? b.data_venda : b.data_faturamento;
      if (!dataA || !dataB) return 0;
      return dataB.localeCompare(dataA);
    });
  }, [vendasPeriodo, filtros.usarDataVenda]);

  // Evolução diária
  const evolucaoDiaria = useMemo(() => {
    const porDia = vendasPeriodo.reduce((acc, v) => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return acc;
      
      if (!acc[data]) {
        acc[data] = { data, unidades: 0, faturamento: 0, lucro: 0 };
      }
      acc[data].unidades += 1;
      acc[data].faturamento += v.valor_venda || 0;
      acc[data].lucro += v.lucro_liquido;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(porDia).sort((a: any, b: any) => a.data.localeCompare(b.data));
  }, [vendasPeriodo, filtros.usarDataVenda]);

  // Vendas por família (Top 5)
  const vendasPorFamilia = useMemo(() => {
    const porFamilia = vendasPeriodo.reduce((acc, v) => {
      const familia = v.familia || 'Outros';
      if (!acc[familia]) {
        acc[familia] = { familia, unidades: 0, faturamento: 0, lucro: 0, margem: 0 };
      }
      acc[familia].unidades += 1;
      acc[familia].faturamento += v.valor_venda || 0;
      acc[familia].lucro += v.lucro_liquido;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(porFamilia)
      .map((f: any) => ({
        ...f,
        margem: f.faturamento > 0 ? (f.lucro / f.faturamento) * 100 : 0
      }))
      .sort((a: any, b: any) => b.unidades - a.unidades)
      .slice(0, 5);
  }, [vendasPeriodo]);

  // Lucro por família (Top 5)
  const lucroPorFamilia = useMemo(() => {
    const porFamilia = vendasPeriodo.reduce((acc, v) => {
      const familia = v.familia || 'Outros';
      if (!acc[familia]) {
        acc[familia] = { familia, lucro: 0 };
      }
      acc[familia].lucro += v.lucro_liquido;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(porFamilia)
      .sort((a: any, b: any) => b.lucro - a.lucro)
      .slice(0, 5);
  }, [vendasPeriodo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calcVariacao = (atual?: number | null, anterior?: number | null) => {
    if (!atual || !anterior || anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
  };

  const renderCard = (
    title: string,
    value: number | null | undefined,
    anterior: number | null | undefined,
    icon: React.ReactNode,
    formatter: (v: number) => string
  ) => {
    const variacao = value && anterior ? calcVariacao(value, anterior) : null;
    const isPositive = variacao !== null && variacao >= 0;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {value != null ? formatter(value) : '-'}
          </div>
          {variacao !== null && (
            <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(Math.abs(variacao))} vs período anterior
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cards Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {renderCard(
          'Unidades Vendidas',
          indicadores.atual?.unidades,
          indicadores.anterior?.unidades,
          <Package className="h-4 w-4 text-muted-foreground" />,
          (v) => v.toString()
        )}
        {renderCard(
          'Faturamento Total',
          indicadores.atual?.faturamento,
          indicadores.anterior?.faturamento,
          <DollarSign className="h-4 w-4 text-muted-foreground" />,
          formatCurrency
        )}
        {renderCard(
          'Lucro Total',
          indicadores.atual?.lucro,
          indicadores.anterior?.lucro,
          <TrendingUp className="h-4 w-4 text-muted-foreground" />,
          formatCurrency
        )}
        {renderCard(
          'Margem Média',
          indicadores.atual?.margem,
          indicadores.anterior?.margem,
          <Percent className="h-4 w-4 text-muted-foreground" />,
          formatPercent
        )}
        {renderCard(
          'Ticket Médio',
          indicadores.atual?.ticketMedio,
          indicadores.anterior?.ticketMedio,
          <Calculator className="h-4 w-4 text-muted-foreground" />,
          formatCurrency
        )}
        {renderCard(
          'Comissão Média',
          indicadores.atual?.comissaoMedia,
          indicadores.anterior?.comissaoMedia,
          <Banknote className="h-4 w-4 text-muted-foreground" />,
          formatCurrency
        )}
      </div>

      {/* Vendas Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendas Recentes</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAllSales(true)}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Família</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Venda</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasRecentes.map((venda, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {venda.data_venda || venda.data_faturamento || '-'}
                  </TableCell>
                  <TableCell>{venda.familia}</TableCell>
                  <TableCell>
                    <button
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => setSelectedVenda(venda)}
                    >
                      {venda.veiculo || '-'}
                    </button>
                  </TableCell>
                  <TableCell>{venda.nome_vendedor_completo || '-'}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(venda.valor_venda || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(venda.lucro_liquido)}
                  </TableCell>
                  <TableCell className="text-right">
                    {venda.margem_percent != null ? formatPercent(venda.margem_percent) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evolução Diária */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucaoDiaria}>
              <XAxis dataKey="data" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Unidades') return [value, 'Unidades'];
                  if (name === 'Faturamento') return [formatCurrency(value), 'Faturamento'];
                  return [formatCurrency(value), 'Lucro'];
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="unidades" stroke="hsl(var(--primary))" name="Unidades" />
              <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="hsl(var(--chart-2))" name="Faturamento" />
              <Line yAxisId="right" type="monotone" dataKey="lucro" stroke="hsl(var(--chart-3))" name="Lucro" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráficos de Barras */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Família (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendasPorFamilia}>
                <XAxis dataKey="familia" />
                <YAxis />
                <Tooltip formatter={(value: any) => [value, 'Unidades']} />
                <Bar dataKey="unidades" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lucro por Família (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lucroPorFamilia}>
                <XAxis dataKey="familia" />
                <YAxis />
                <Tooltip formatter={(value: any) => [formatCurrency(value), 'Lucro']} />
                <Bar dataKey="lucro" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Família */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Família</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Família</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasPorFamilia.map((f: any, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{f.familia}</TableCell>
                  <TableCell className="text-right">{f.unidades}</TableCell>
                  <TableCell className="text-right">{formatCurrency(f.faturamento)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(f.lucro)}</TableCell>
                  <TableCell className="text-right">{formatPercent(f.margem)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Ver Todas as Vendas */}
      <Dialog open={showAllSales} onOpenChange={setShowAllSales}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Todas as Vendas</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Família</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Venda</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todasVendasOrdenadas.map((venda, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {venda.data_venda || venda.data_faturamento || '-'}
                  </TableCell>
                  <TableCell>{venda.familia}</TableCell>
                  <TableCell>
                    <button
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => {
                        setShowAllSales(false);
                        setSelectedVenda(venda);
                      }}
                    >
                      {venda.veiculo || '-'}
                    </button>
                  </TableCell>
                  <TableCell>{venda.nome_vendedor_completo || '-'}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(venda.valor_venda || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(venda.lucro_liquido)}
                  </TableCell>
                  <TableCell className="text-right">
                    {venda.margem_percent != null ? formatPercent(venda.margem_percent) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes da Venda */}
      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Veículo</p>
                  <p className="font-medium">{selectedVenda.veiculo || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chassi</p>
                  <p className="font-medium">{selectedVenda.chassi_completo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedVenda.nome_vendedor_completo || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{selectedVenda.marca || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Venda</p>
                  <p className="font-medium">{selectedVenda.data_venda || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Faturamento</p>
                  <p className="font-medium">{selectedVenda.data_faturamento || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor Venda</span>
                  <span className="font-medium">{formatCurrency(selectedVenda.valor_venda || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Custo Total Final</span>
                  <span className="font-medium">{formatCurrency(selectedVenda.custo_total_final || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lucro Líquido</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedVenda.lucro_liquido)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Margem %</span>
                  <span className="font-medium">
                    {selectedVenda.margem_percent != null ? formatPercent(selectedVenda.margem_percent) : '-'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Comissão Vendedor</span>
                  <span className="font-medium">{formatCurrency(selectedVenda.comissao_final_vendedor || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Comissão Gerente</span>
                  <span className="font-medium">{formatCurrency(selectedVenda.comissao_final_gerente || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Forplan</span>
                  <span className="font-medium">{formatCurrency(selectedVenda.forplan || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Juros</span>
                  <span className="font-medium">{formatCurrency(selectedVenda.juros || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
