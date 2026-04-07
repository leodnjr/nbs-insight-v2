import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, TrendingUp, DollarSign, Target, BarChart3, PieChart, X, ArrowUpDown, Store, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, LineChart, Line, Legend } from 'recharts';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { normalizarMarca } from '@/lib/marcaUtils';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

interface VendedorStats {
  vendedor: string;
  unidades: number;
  faturamento: number;
  lucroLiquido: number;
  margemMedia: number;
  ticketMedio: number;
  comissaoTotal: number;
  vendas: VendaCalculada[];
}

type SortField = 'vendedor' | 'unidades' | 'faturamento' | 'lucroLiquido' | 'margemMedia' | 'ticketMedio' | 'comissaoTotal';

export const PerformanceVendedores = ({ vendas, filtros }: Props) => {
  const [selectedVendedor, setSelectedVendedor] = useState<VendedorStats | null>(null);
  const [sortField, setSortField] = useState<SortField>('lucroLiquido');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [agruparPorLoja, setAgruparPorLoja] = useState(false);
  const [lojasExpandidas, setLojasExpandidas] = useState<Record<string, boolean>>({});
  
  // Filtros locais do modal (herdados dos filtros globais)
  const [filtrosModal, setFiltrosModal] = useState<FiltrosVenda>(filtros);
  
  // Persistir estado do toggle no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vendedores-agrupar-por-loja');
    if (saved !== null) {
      setAgruparPorLoja(saved === 'true');
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('vendedores-agrupar-por-loja', String(agruparPorLoja));
  }, [agruparPorLoja]);
  
  // Quando abre o modal, herda os filtros globais
  useEffect(() => {
    if (selectedVendedor) {
      setFiltrosModal(filtros);
    }
  }, [selectedVendedor, filtros]);

  // Aplica filtros globais de período na base local
  const vendasBase = useMemo(() => {
    if (filtros.dataInicio && filtros.dataFim) {
      const campoData = filtros.usarDataVenda ? 'data_venda' : 'data_faturamento';
      return vendas.filter(v => {
        const data = v[campoData as 'data_venda' | 'data_faturamento'];
        return data && data >= filtros.dataInicio! && data <= filtros.dataFim!;
      });
    }
    return vendas;
  }, [vendas, filtros.dataInicio, filtros.dataFim, filtros.usarDataVenda]);

  // Filtra apenas veículos novos
  const vendasNovos = useMemo(() => {
    return vendasBase.filter(v => (v.tipo?.toString().trim().toLowerCase().startsWith('novo')));
  }, [vendasBase]);
  
  // Vendas filtradas do modal (com filtros locais)
  const vendasModal = useMemo(() => {
    if (!selectedVendedor) return [];
    
    let filtered = selectedVendedor.vendas;
    
    if (filtrosModal.marca) {
      filtered = filtered.filter(v => normalizarMarca(v.marca) === normalizarMarca(filtrosModal.marca));
    }
    if (filtrosModal.loja) {
      filtered = filtered.filter(v => v.empresa_vendedora === filtrosModal.loja);
    }
    if (filtrosModal.familia) {
      filtered = filtered.filter(v => v.familia === filtrosModal.familia);
    }
    if (filtrosModal.dataInicio && filtrosModal.dataFim) {
      const campoData = filtrosModal.usarDataVenda ? 'data_venda' : 'data_faturamento';
      filtered = filtered.filter(v => {
        const data = v[campoData];
        if (!data) return false;
        return data >= filtrosModal.dataInicio! && data <= filtrosModal.dataFim!;
      });
    }
    
    return filtered;
  }, [selectedVendedor, filtrosModal]);

  // Agrupa por vendedor
  const vendedoresStats = useMemo(() => {
    const porVendedor = vendasNovos.reduce((acc, v) => {
      const vendedor = v.nome_vendedor_completo || 'Sem Vendedor';
      if (!acc[vendedor]) {
        acc[vendedor] = {
          vendedor,
          unidades: 0,
          faturamento: 0,
          lucroLiquido: 0,
          comissaoTotal: 0,
          vendas: []
        };
      }
      acc[vendedor].unidades += 1;
      acc[vendedor].faturamento += v.valor_venda || 0;
      acc[vendedor].lucroLiquido += v.lucro_liquido;
      acc[vendedor].comissaoTotal += v.comissao_total;
      acc[vendedor].vendas.push(v);
      return acc;
    }, {} as Record<string, Omit<VendedorStats, 'margemMedia' | 'ticketMedio'>>);

    const statsArray = Object.values(porVendedor).map(v => ({
      ...v,
      margemMedia: v.faturamento > 0 ? (v.lucroLiquido / v.faturamento) * 100 : 0,
      ticketMedio: v.unidades > 0 ? v.faturamento / v.unidades : 0
    }));

    // Ordenação
    statsArray.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier;
      }
      return ((aVal as number) - (bVal as number)) * multiplier;
    });

    return statsArray;
  }, [vendasNovos, sortField, sortDirection]);

  // Total para linha de resumo
  const totais = useMemo(() => {
    return vendedoresStats.reduce((acc, v) => ({
      unidades: acc.unidades + v.unidades,
      faturamento: acc.faturamento + v.faturamento,
      lucroLiquido: acc.lucroLiquido + v.lucroLiquido,
      comissaoTotal: acc.comissaoTotal + v.comissaoTotal
    }), { unidades: 0, faturamento: 0, lucroLiquido: 0, comissaoTotal: 0 });
  }, [vendedoresStats]);

  const totaisCalculados = {
    ...totais,
    margemMedia: totais.faturamento > 0 ? (totais.lucroLiquido / totais.faturamento) * 100 : 0,
    ticketMedio: totais.unidades > 0 ? totais.faturamento / totais.unidades : 0
  };
  
  // Agrupamento por loja
  const vendasPorLoja = useMemo(() => {
    if (!agruparPorLoja) return null;
    
    const lojas = vendasNovos.reduce((acc, v) => {
      const loja = v.empresa_vendedora || 'Sem Loja';
      if (!acc[loja]) {
        acc[loja] = [];
      }
      acc[loja].push(v);
      return acc;
    }, {} as Record<string, VendaCalculada[]>);
    
    return Object.entries(lojas)
      .map(([loja, vendas]) => {
        // Agrupa vendedores dentro dessa loja
        const porVendedor = vendas.reduce((acc, v) => {
          const vendedor = v.nome_vendedor_completo || 'Sem Vendedor';
          if (!acc[vendedor]) {
            acc[vendedor] = {
              vendedor,
              unidades: 0,
              faturamento: 0,
              lucroLiquido: 0,
              comissaoTotal: 0,
              vendas: []
            };
          }
          acc[vendedor].unidades += 1;
          acc[vendedor].faturamento += v.valor_venda || 0;
          acc[vendedor].lucroLiquido += v.lucro_liquido;
          acc[vendedor].comissaoTotal += v.comissao_total;
          acc[vendedor].vendas.push(v);
          return acc;
        }, {} as Record<string, Omit<VendedorStats, 'margemMedia' | 'ticketMedio'>>);
        
        const vendedores = Object.values(porVendedor).map(v => ({
          ...v,
          margemMedia: v.faturamento > 0 ? (v.lucroLiquido / v.faturamento) * 100 : 0,
          ticketMedio: v.unidades > 0 ? v.faturamento / v.unidades : 0
        }));
        
        // Ordenação dentro da loja
        vendedores.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          const multiplier = sortDirection === 'asc' ? 1 : -1;
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal) * multiplier;
          }
          return ((aVal as number) - (bVal as number)) * multiplier;
        });
        
        // Calcula subtotal da loja
        const subtotal = vendedores.reduce((acc, v) => ({
          unidades: acc.unidades + v.unidades,
          faturamento: acc.faturamento + v.faturamento,
          lucroLiquido: acc.lucroLiquido + v.lucroLiquido,
          comissaoTotal: acc.comissaoTotal + v.comissaoTotal
        }), { unidades: 0, faturamento: 0, lucroLiquido: 0, comissaoTotal: 0 });
        
        return {
          loja,
          vendedores,
          subtotal: {
            ...subtotal,
            margemMedia: subtotal.faturamento > 0 ? (subtotal.lucroLiquido / subtotal.faturamento) * 100 : 0,
            ticketMedio: subtotal.unidades > 0 ? subtotal.faturamento / subtotal.unidades : 0
          }
        };
      })
      .sort((a, b) => a.loja.localeCompare(b.loja));
  }, [vendasNovos, agruparPorLoja, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Dados do modal (usa vendasModal filtradas)
  const modalData = useMemo(() => {
    if (!selectedVendedor) return null;

    const vendas = vendasModal.sort((a, b) => {
      const dataA = a.data_faturamento || '';
      const dataB = b.data_faturamento || '';
      return dataB.localeCompare(dataA);
    });
    
    // Recalcula stats com vendas filtradas
    const stats = {
      unidades: vendas.length,
      faturamento: vendas.reduce((acc, v) => acc + (v.valor_venda || 0), 0),
      lucroLiquido: vendas.reduce((acc, v) => acc + v.lucro_liquido, 0),
      comissaoTotal: vendas.reduce((acc, v) => acc + v.comissao_total, 0)
    };
    
    const statsCalculados = {
      ...stats,
      margemMedia: stats.faturamento > 0 ? (stats.lucroLiquido / stats.faturamento) * 100 : 0,
      ticketMedio: stats.unidades > 0 ? stats.faturamento / stats.unidades : 0
    };

    // Gráfico de barras: Top 10 lucro por carro
    const lucroPorCarro = vendas
      .map(v => ({
        modelo: (v.veiculo || 'Sem Modelo').substring(0, 20),
        lucro: v.lucro_liquido
      }))
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 10);

    // Gráfico de pizza: Mix de famílias
    const familias = vendas.reduce((acc, v) => {
      const familia = v.familia || 'Outros';
      acc[familia] = (acc[familia] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mixFamilias = Object.entries(familias).map(([name, value]) => ({ name, value }));

    // Gráfico de linha: Evolução temporal
    const vendasPorData = vendas
      .reduce((acc, v) => {
        const data = v.data_faturamento || '';
        if (!data) return acc;
        
        const existing = acc.find(item => item.data === data);
        if (existing) {
          existing.valor += v.valor_venda || 0;
        } else {
          acc.push({ data, valor: v.valor_venda || 0 });
        }
        return acc;
      }, [] as Array<{ data: string; valor: number }>)
      .sort((a, b) => a.data.localeCompare(b.data));

    return { lucroPorCarro, mixFamilias, vendasPorData, vendas, stats: statsCalculados };
  }, [selectedVendedor, vendasModal]);

  const COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  const toggleLoja = (loja: string) => {
    setLojasExpandidas(prev => ({ ...prev, [loja]: !prev[loja] }));
  };
  
  // Opções de filtros para o modal
  const [marcasModal, lojasModal, familiasModal] = useMemo(() => {
    if (!selectedVendedor) return [[], [], []];
    
    const marcas = Array.from(new Set(selectedVendedor.vendas.map(v => normalizarMarca(v.marca)))) as string[];
    const lojas = Array.from(new Set(selectedVendedor.vendas.map(v => v.empresa_vendedora).filter(Boolean))) as string[];
    const familias = Array.from(new Set(selectedVendedor.vendas.map(v => v.familia).filter(Boolean))) as string[];
    
    return [marcas.sort(), lojas.sort(), familias.sort()];
  }, [selectedVendedor]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Performance de Vendedores
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Apenas veículos novos • Clique em um vendedor para ver detalhes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="agrupar-loja" 
                checked={agruparPorLoja}
                onCheckedChange={setAgruparPorLoja}
              />
              <Label htmlFor="agrupar-loja" className="cursor-pointer">Agrupar por Loja</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!agruparPorLoja ? (
            <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('vendedor')}>
                    <div className="flex items-center gap-1">
                      Vendedor
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <SortableHeader field="unidades">Unidades vendidas</SortableHeader>
                  <SortableHeader field="faturamento">Faturamento total</SortableHeader>
                  <SortableHeader field="lucroLiquido">Lucro líquido</SortableHeader>
                  <SortableHeader field="margemMedia">Margem média</SortableHeader>
                  <SortableHeader field="ticketMedio">Ticket médio</SortableHeader>
                  <SortableHeader field="comissaoTotal">Comissão total</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresStats.map((v, index) => (
                  <TableRow 
                    key={index} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedVendedor(v)}
                  >
                    <TableCell className="font-medium">{v.vendedor}</TableCell>
                    <TableCell className="text-right">{v.unidades}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.faturamento)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.lucroLiquido)}</TableCell>
                    <TableCell className="text-right">{formatPercent(v.margemMedia)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.ticketMedio)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.comissaoTotal)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>TOTAL GERAL</TableCell>
                  <TableCell className="text-right">{totaisCalculados.unidades}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totaisCalculados.faturamento)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totaisCalculados.lucroLiquido)}</TableCell>
                  <TableCell className="text-right">{formatPercent(totaisCalculados.margemMedia)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totaisCalculados.ticketMedio)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totaisCalculados.comissaoTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          ) : (
            <div className="space-y-4">
              {vendasPorLoja && vendasPorLoja.length > 0 ? (
                vendasPorLoja.map(({ loja, vendedores, subtotal }) => (
                  <Collapsible 
                    key={loja}
                    open={lojasExpandidas[loja] !== false}
                    onOpenChange={() => toggleLoja(loja)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              {loja}
                              <span className="text-sm text-muted-foreground font-normal">
                                ({vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''})
                              </span>
                            </div>
                            <ChevronDown className={`h-5 w-5 transition-transform ${lojasExpandidas[loja] === false ? '-rotate-90' : ''}`} />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {vendedores.length > 0 ? (
                            <div className="rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead className="text-right">Unidades vendidas</TableHead>
                                    <TableHead className="text-right">Faturamento total</TableHead>
                                    <TableHead className="text-right">Lucro líquido</TableHead>
                                    <TableHead className="text-right">Margem média</TableHead>
                                    <TableHead className="text-right">Ticket médio</TableHead>
                                    <TableHead className="text-right">Comissão total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vendedores.map((v, index) => (
                                    <TableRow 
                                      key={index} 
                                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                                      onClick={() => setSelectedVendedor(v)}
                                    >
                                      <TableCell className="font-medium">{v.vendedor}</TableCell>
                                      <TableCell className="text-right">{v.unidades}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(v.faturamento)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(v.lucroLiquido)}</TableCell>
                                      <TableCell className="text-right">{formatPercent(v.margemMedia)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(v.ticketMedio)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(v.comissaoTotal)}</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow className="font-bold bg-muted/50">
                                    <TableCell>SUBTOTAL {loja}</TableCell>
                                    <TableCell className="text-right">{subtotal.unidades}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(subtotal.faturamento)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(subtotal.lucroLiquido)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(subtotal.margemMedia)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(subtotal.ticketMedio)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(subtotal.comissaoTotal)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              Sem registros no período
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    Sem registros no período
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhamento */}
      <Dialog open={!!selectedVendedor} onOpenChange={(open) => !open && setSelectedVendedor(null)}>
        <DialogContent className="max-w-[70%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Detalhamento — {selectedVendedor?.vendedor}</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedVendedor(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {modalData && selectedVendedor && (
            <div className="space-y-6">
              {/* Filtros locais herdados */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="marca-modal">Marca</Label>
                    <Select
                      value={filtrosModal.marca || 'all'}
                      onValueChange={(v) => setFiltrosModal({ ...filtrosModal, marca: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger id="marca-modal">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {marcasModal.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="loja-modal">Loja</Label>
                    <Select
                      value={filtrosModal.loja || 'all'}
                      onValueChange={(v) => setFiltrosModal({ ...filtrosModal, loja: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger id="loja-modal">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {lojasModal.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="familia-modal">Família</Label>
                    <Select
                      value={filtrosModal.familia || 'all'}
                      onValueChange={(v) => setFiltrosModal({ ...filtrosModal, familia: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger id="familia-modal">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {familiasModal.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFiltrosModal(filtros)}
                      className="w-full"
                    >
                      Resetar Filtros
                    </Button>
                  </div>
                </div>
              </Card>
              
              {/* Mini-indicadores (atualizados com filtros locais) */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Lucro Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(modalData.stats.lucroLiquido)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Margem Média
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(modalData.stats.margemMedia)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      Ticket Médio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(modalData.stats.ticketMedio)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Unidades Vendidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{modalData.stats.unidades}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      Lucro por Carro (Top 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={modalData.lucroPorCarro}>
                        <XAxis 
                          dataKey="modelo" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="lucro" fill="#1E3A8A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PieChart className="h-4 w-4" />
                      Mix de Famílias Vendidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RePieChart>
                        <Pie
                          data={modalData.mixFamilias}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {modalData.mixFamilias.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Evolução Temporal das Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={modalData.vendasPorData}>
                      <XAxis 
                        dataKey="data" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => formatDate(value)}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => formatDate(label)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="valor" 
                        stroke="#1E3A8A" 
                        strokeWidth={2}
                        name="Valor Venda" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabela Detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalhamento por Carro (Chassi)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data Faturamento</TableHead>
                          <TableHead>Modelo/Família</TableHead>
                          <TableHead>Chassi</TableHead>
                          <TableHead className="text-right">Valor Venda</TableHead>
                          <TableHead className="text-right">Custo Total Final</TableHead>
                          <TableHead className="text-right">Lucro Líquido</TableHead>
                          <TableHead className="text-right">Margem %</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modalData.vendas.map((v, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(v.data_faturamento)}</TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{v.veiculo || '-'}</div>
                              <div className="text-xs text-muted-foreground">{v.familia}</div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{v.chassi_completo}</TableCell>
                            <TableCell className="text-right">{formatCurrency(v.valor_venda || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(v.custo_total_final || 0)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(v.lucro_liquido)}</TableCell>
                            <TableCell className="text-right">{formatPercent(v.margem_percent || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(v.comissao_total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Botão de Exportação (placeholder) */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled>
                  Exportar Excel
                </Button>
                <Button variant="outline" disabled>
                  Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
