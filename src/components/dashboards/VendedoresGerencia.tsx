import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { calcularPeriodos } from '@/lib/periodoUtils';
import { normalizarMarca, getCorMarca } from '@/lib/marcaUtils';
import { Package, DollarSign, TrendingUp, Percent, CreditCard } from 'lucide-react';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

type Metrica = 'unidades' | 'faturamento' | 'lucro' | 'margem' | 'ticket';

export const VendedoresGerencia = ({ vendas, filtros }: Props) => {
  const [metricaSelecionada, setMetricaSelecionada] = useState<Metrica>('unidades');
  const [mostrarBottom, setMostrarBottom] = useState(false);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | null>(null);

  // Filtra vendas por período
  const vendasPeriodo = useMemo(() => {
    if (filtros.dataInicio && filtros.dataFim) {
      const campoData = filtros.usarDataVenda ? 'data_venda' : 'data_faturamento';
      return vendas.filter(v => {
        const data = v[campoData as 'data_venda' | 'data_faturamento'];
        return data && data >= filtros.dataInicio! && data <= filtros.dataFim!;
      });
    }
    return vendas;
  }, [vendas, filtros.dataInicio, filtros.dataFim, filtros.usarDataVenda]);

  // Calcula métricas por vendedor
  const dadosVendedores = useMemo(() => {
    const vendedoresMap = new Map<string, {
      vendedor: string;
      unidades: number;
      faturamento: number;
      lucro: number;
      margem: number;
      ticket: number;
      vendas: VendaCalculada[];
      vendasPorMarca: Map<string, number>;
    }>();

    vendasPeriodo.forEach(v => {
      const vendedor = v.nome_vendedor_completo || 'Sem Vendedor';
      if (!vendedoresMap.has(vendedor)) {
        vendedoresMap.set(vendedor, {
          vendedor,
          unidades: 0,
          faturamento: 0,
          lucro: 0,
          margem: 0,
          ticket: 0,
          vendas: [],
          vendasPorMarca: new Map()
        });
      }
      
      const dados = vendedoresMap.get(vendedor)!;
      dados.unidades += 1;
      dados.faturamento += v.valor_venda || 0;
      dados.lucro += v.lucro_liquido || 0;
      dados.vendas.push(v);
      
      const marca = normalizarMarca(v.marca || '');
      dados.vendasPorMarca.set(marca, (dados.vendasPorMarca.get(marca) || 0) + 1);
    });

    return Array.from(vendedoresMap.values()).map(v => ({
      ...v,
      margem: v.faturamento > 0 ? (v.lucro / v.faturamento) * 100 : 0,
      ticket: v.unidades > 0 ? v.faturamento / v.unidades : 0
    }));
  }, [vendasPeriodo]);

  // Prepara dados do gráfico
  const dadosGrafico = useMemo(() => {
    let ordenados = [...dadosVendedores];
    
    // Ordena pela métrica selecionada
    ordenados.sort((a, b) => {
      const valorA = a[metricaSelecionada];
      const valorB = b[metricaSelecionada];
      return mostrarBottom ? valorA - valorB : valorB - valorA;
    });

    // Pega top ou bottom 5
    const selecionados = ordenados.slice(0, 5);

    // Retorna do menor para maior para exibir corretamente nas barras horizontais
    return selecionados.reverse().map(v => ({
      vendedor: v.vendedor,
      valor: v[metricaSelecionada],
      vendasPorMarca: v.vendasPorMarca,
      dados: v
    }));
  }, [dadosVendedores, metricaSelecionada, mostrarBottom]);

  // Encontra a marca predominante do vendedor
  const getMarcaPredominante = (vendasPorMarca: Map<string, number>): string => {
    let marcaPredominante = '';
    let maxVendas = 0;
    vendasPorMarca.forEach((qtd, marca) => {
      if (qtd > maxVendas) {
        maxVendas = qtd;
        marcaPredominante = marca;
      }
    });
    return marcaPredominante;
  };

  const formatValor = (valor: number, metrica: Metrica): string => {
    switch (metrica) {
      case 'unidades':
        return valor.toFixed(0);
      case 'faturamento':
      case 'lucro':
      case 'ticket':
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'margem':
        return `${valor.toFixed(1)}%`;
      default:
        return valor.toString();
    }
  };

  const vendedorDetalhado = useMemo(() => {
    if (!vendedorSelecionado) return null;
    return dadosVendedores.find(v => v.vendedor === vendedorSelecionado);
  }, [vendedorSelecionado, dadosVendedores]);

  const metricas = [
    { id: 'unidades' as Metrica, label: 'Unidades vendidas', icon: Package },
    { id: 'faturamento' as Metrica, label: 'Faturamento total', icon: DollarSign },
    { id: 'lucro' as Metrica, label: 'Lucro líquido', icon: TrendingUp },
    { id: 'margem' as Metrica, label: 'Margem média', icon: Percent },
    { id: 'ticket' as Metrica, label: 'Ticket médio', icon: CreditCard }
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Visão Rápida - Performance de Vendedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controles */}
          <div className="flex flex-col gap-4">
            {/* Abas de métricas */}
            <Tabs value={metricaSelecionada} onValueChange={(v) => setMetricaSelecionada(v as Metrica)}>
              <TabsList className="grid w-full grid-cols-5">
                {metricas.map(m => {
                  const Icon = m.icon;
                  return (
                    <TabsTrigger key={m.id} value={m.id} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{m.label}</span>
                      <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {/* Toggle Top/Bottom */}
            <div className="flex items-center gap-2 justify-end">
              <Label htmlFor="bottom-toggle">Mostrar Bottom 5</Label>
              <Switch
                id="bottom-toggle"
                checked={mostrarBottom}
                onCheckedChange={setMostrarBottom}
              />
            </div>
          </div>

          {/* Gráfico */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} layout="vertical" margin={{ left: 100, right: 30 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="vendedor" width={90} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.vendedor}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatValor(data.valor, metricaSelecionada)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="valor"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => setVendedorSelecionado(data.vendedor)}
                >
                  {dadosGrafico.map((entry, index) => {
                    const marcaPredominante = getMarcaPredominante(entry.vendasPorMarca);
                    const cor = getCorMarca(marcaPredominante);
                    return <Cell key={`cell-${index}`} fill={cor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!vendedorSelecionado} onOpenChange={(open) => !open && setVendedorSelecionado(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes - {vendedorSelecionado}</DialogTitle>
          </DialogHeader>
          {vendedorDetalhado && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{vendedorDetalhado.unidades}</div>
                    <p className="text-sm text-muted-foreground">Unidades</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatValor(vendedorDetalhado.faturamento, 'faturamento')}
                    </div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatValor(vendedorDetalhado.lucro, 'lucro')}
                    </div>
                    <p className="text-sm text-muted-foreground">Lucro</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatValor(vendedorDetalhado.margem, 'margem')}
                    </div>
                    <p className="text-sm text-muted-foreground">Margem</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatValor(vendedorDetalhado.ticket, 'ticket')}
                    </div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  </CardContent>
                </Card>
              </div>

              {/* Vendas por Marca */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Marca</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from(vendedorDetalhado.vendasPorMarca.entries()).map(([marca, qtd]) => (
                      <div key={marca} className="flex justify-between items-center">
                        <span className="font-medium">{marca}</span>
                        <span className="text-muted-foreground">{qtd} unidades</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Vendas */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas Individuais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendedorDetalhado.vendas.map((v, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{v.data_venda ? new Date(v.data_venda).toLocaleDateString('pt-BR') : '-'}</TableCell>
                            <TableCell>{v.veiculo}</TableCell>
                            <TableCell>{v.marca}</TableCell>
                            <TableCell className="text-right">
                              {formatValor(v.valor_venda || 0, 'faturamento')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatValor(v.lucro_liquido || 0, 'lucro')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatValor(v.margem_percent || 0, 'margem')}
                            </TableCell>
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
    </>
  );
};
