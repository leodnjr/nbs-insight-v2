import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Percent, AlertTriangle, CheckCircle, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  ScatterChart, Scatter, ZAxis, Legend, LineChart, Line, CartesianGrid 
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';
import { calcularPeriodos } from '@/lib/periodoUtils';
import { normalizarMarca, getCorMarca } from '@/lib/marcaUtils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

export const Qualidade = ({ vendas, filtros }: Props) => {
  const [expandidoVendedores, setExpandidoVendedores] = useState(false);
  const [expandidoPontos, setExpandidoPontos] = useState(false);
  // Filtra vendas do período atual
  const vendasPeriodo = useMemo(() => {
    return vendas.filter(v => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data || !filtros.dataInicio || !filtros.dataFim) return false;
      return data >= filtros.dataInicio && data <= filtros.dataFim;
    });
  }, [vendas, filtros]);

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

  // Helpers
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const renderTrend = (current: number, previous: number | null) => {
    if (previous === null || previous === 0) return null;
    const diff = current - previous;
    const isPositive = diff > 0;
    return (
      <span className={`text-sm flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {formatPercent(Math.abs((diff / previous) * 100))}
      </span>
    );
  };

  // 1. CARDS DE INDICADORES

  // Desconto Médio Aplicado (%)
  const descontoMedio = useMemo(() => {
    const calcularDesconto = (vendas: VendaCalculada[]) => {
      const vendasComPreco = vendas.filter(v => v.preco_venda && v.preco_venda > 0 && v.valor_venda);
      if (vendasComPreco.length === 0) return null;
      
      const descontoTotal = vendasComPreco.reduce((sum, v) => {
        const desconto = ((v.preco_venda! - v.valor_venda!) / v.preco_venda!) * 100;
        return sum + desconto;
      }, 0);
      
      return descontoTotal / vendasComPreco.length;
    };

    const atual = calcularDesconto(vendasPeriodo);
    const anterior = calcularDesconto(vendasAnterior);
    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // Margem Potencial vs Margem Real
  const margemPotencialVsReal = useMemo(() => {
    const calcularDiferenca = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;
      const margemRealMedia = vendas.reduce((sum, v) => sum + (v.margem_percent || 0), 0) / vendas.length;
      const margemPotencial = 15;
      return margemPotencial - margemRealMedia;
    };

    const atual = calcularDiferenca(vendasPeriodo);
    const anterior = calcularDiferenca(vendasAnterior);
    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // % de Vendas com Margem Ruim (<2%)
  const vendasMargemRuim = useMemo(() => {
    const calcularPercRuim = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;
      const ruim = vendas.filter(v => (v.margem_percent || 0) < 2).length;
      return (ruim / vendas.length) * 100;
    };

    const atual = calcularPercRuim(vendasPeriodo);
    const anterior = calcularPercRuim(vendasAnterior);
    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // % de Vendas com Margem Excelente (>9%)
  const vendasMargemExcelente = useMemo(() => {
    const calcularPercExcelente = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;
      const excelente = vendas.filter(v => (v.margem_percent || 0) > 9).length;
      return (excelente / vendas.length) * 100;
    };

    const atual = calcularPercExcelente(vendasPeriodo);
    const anterior = calcularPercExcelente(vendasAnterior);
    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // Índice de Mix Saudável
  const mixSaudavel = useMemo(() => {
    const calcularMixSaudavel = (vendas: VendaCalculada[]) => {
      if (vendas.length === 0) return null;
      const core = vendas.filter(v => v.familia !== 'Semi-Novos' && v.familia !== 'Outros').length;
      return (core / vendas.length) * 100;
    };

    const atual = calcularMixSaudavel(vendasPeriodo);
    const anterior = calcularMixSaudavel(vendasAnterior);
    return { atual, anterior };
  }, [vendasPeriodo, vendasAnterior]);

  // 2. GRÁFICOS

  // Dispersão: Desconto % × Volume por vendedor
  const dispersaoDescontoVolume = useMemo(() => {
    const porVendedor = vendasPeriodo.reduce((acc, v) => {
      const vendedor = v.nome_vendedor_completo || 'Sem Vendedor';
      if (!acc[vendedor]) {
        acc[vendedor] = { descontoTotal: 0, unidades: 0, unidadesComPreco: 0 };
      }
      if (v.preco_venda && v.preco_venda > 0 && v.valor_venda) {
        const desconto = ((v.preco_venda - v.valor_venda) / v.preco_venda) * 100;
        acc[vendedor].descontoTotal += desconto;
        acc[vendedor].unidadesComPreco += 1;
      }
      acc[vendedor].unidades += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porVendedor).map(([vendedor, data]) => {
      const descontoMedio = data.unidadesComPreco > 0 ? data.descontoTotal / data.unidadesComPreco : 0;
      return {
        vendedor: vendedor.split(' ')[0],
        desconto: Number(descontoMedio.toFixed(2)),
        volume: data.unidades,
        size: data.unidades * 50
      };
    });
  }, [vendasPeriodo]);

  // Heatmap de Margem por Família
  const heatmapMargemFamilia = useMemo(() => {
    const porFamilia = vendasPeriodo.reduce((acc, v) => {
      const familia = v.familia || 'Outros';
      if (!acc[familia]) {
        acc[familia] = { margem: 0, unidades: 0 };
      }
      acc[familia].margem += v.margem_percent || 0;
      acc[familia].unidades += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porFamilia).map(([familia, data]) => {
      const margemMedia = data.margem / data.unidades;
      let cor = '#DC2626';
      if (margemMedia >= 5 && margemMedia < 9) {
        cor = '#F59E0B';
      } else if (margemMedia >= 9) {
        cor = '#16A34A';
      }
      return {
        familia,
        margemMedia: Number(margemMedia.toFixed(2)),
        unidades: data.unidades,
        cor
      };
    }).sort((a, b) => b.margemMedia - a.margemMedia);
  }, [vendasPeriodo]);

  // Barras: Desconto Médio por Marca
  const descontoPorMarca = useMemo(() => {
    const porMarca = vendasPeriodo.reduce((acc, v) => {
      const marca = normalizarMarca(v.marca) || 'Outras';
      if (!acc[marca]) {
        acc[marca] = { descontoTotal: 0, unidades: 0, unidadesComPreco: 0 };
      }
      if (v.preco_venda && v.preco_venda > 0 && v.valor_venda) {
        const desconto = ((v.preco_venda - v.valor_venda) / v.preco_venda) * 100;
        acc[marca].descontoTotal += desconto;
        acc[marca].unidadesComPreco += 1;
      }
      acc[marca].unidades += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porMarca).map(([marca, data]) => {
      const descontoMedio = data.unidadesComPreco > 0 ? data.descontoTotal / data.unidadesComPreco : 0;
      return {
        marca,
        desconto: Number(descontoMedio.toFixed(2)),
        cor: getCorMarca(marca)
      };
    }).sort((a, b) => b.desconto - a.desconto);
  }, [vendasPeriodo]);

  // Linha: Evolução da Margem Diária
  const evolucaoMargem = useMemo(() => {
    const porData = vendasPeriodo.reduce((acc, v) => {
      const data = filtros.usarDataVenda ? v.data_venda : v.data_faturamento;
      if (!data) return acc;
      const dataStr = data;
      if (!acc[dataStr]) {
        acc[dataStr] = { margem: 0, unidades: 0 };
      }
      acc[dataStr].margem += v.margem_percent || 0;
      acc[dataStr].unidades += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porData)
      .map(([data, values]) => ({
        data: format(parseISO(data), 'dd/MM', { locale: ptBR }),
        margemMedia: Number((values.margem / values.unidades).toFixed(2))
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [vendasPeriodo, filtros.usarDataVenda]);

  // 3. TABELAS

  // Ranking de Vendedores por Qualidade
  const rankingVendedoresQualidade = useMemo(() => {
    const porVendedor = vendasPeriodo.reduce((acc, v) => {
      const vendedor = v.nome_vendedor_completo || 'Sem Vendedor';
      if (!acc[vendedor]) {
        acc[vendedor] = { margem: 0, unidades: 0, ruim: 0, excelente: 0, descontoTotal: 0, unidadesComPreco: 0 };
      }
      acc[vendedor].margem += v.margem_percent || 0;
      acc[vendedor].unidades += 1;
      if ((v.margem_percent || 0) < 2) acc[vendedor].ruim += 1;
      if ((v.margem_percent || 0) > 9) acc[vendedor].excelente += 1;
      
      if (v.preco_venda && v.preco_venda > 0 && v.valor_venda) {
        const desconto = ((v.preco_venda - v.valor_venda) / v.preco_venda) * 100;
        acc[vendedor].descontoTotal += desconto;
        acc[vendedor].unidadesComPreco += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(porVendedor).map(([vendedor, data]) => {
      const margemMedia = data.margem / data.unidades;
      const descontoMedio = data.unidadesComPreco > 0 ? data.descontoTotal / data.unidadesComPreco : 0;
      const percRuim = (data.ruim / data.unidades) * 100;
      const percExcelente = (data.excelente / data.unidades) * 100;
      const notaQualidade = Math.max(0, Math.min(100, 100 - descontoMedio - percRuim + percExcelente));
      return {
        vendedor,
        descontoMedio: Number(descontoMedio.toFixed(2)),
        margemMedia: Number(margemMedia.toFixed(2)),
        percRuim: Number(percRuim.toFixed(2)),
        percExcelente: Number(percExcelente.toFixed(2)),
        notaQualidade: Number(notaQualidade.toFixed(2))
      };
    }).sort((a, b) => b.notaQualidade - a.notaQualidade);
  }, [vendasPeriodo]);

  // Tabela de Pontos de Atenção
  const pontosAtencao = useMemo(() => {
    const alertas: { tipo: string; descricao: string; severidade: 'alta' | 'media' | 'baixa' }[] = [];

    rankingVendedoresQualidade.forEach(v => {
      if (v.margemMedia < 3) {
        alertas.push({
          tipo: 'Margem Baixa',
          descricao: `${v.vendedor}: Margem média de apenas ${v.margemMedia.toFixed(2)}%`,
          severidade: 'alta'
        });
      }
      if (v.descontoMedio > 60) {
        alertas.push({
          tipo: 'Desconto Alto',
          descricao: `${v.vendedor}: Desconto médio de ${v.descontoMedio.toFixed(2)}%`,
          severidade: 'alta'
        });
      }
    });

    heatmapMargemFamilia.forEach(f => {
      if (f.margemMedia < 3 && f.unidades >= 3) {
        alertas.push({
          tipo: 'Família Problemática',
          descricao: `${f.familia}: Margem média de ${f.margemMedia.toFixed(2)}% em ${f.unidades} vendas`,
          severidade: 'media'
        });
      }
    });

    descontoPorMarca.forEach(m => {
      if (m.desconto > 70) {
        alertas.push({
          tipo: 'Desconto Excessivo',
          descricao: `Marca ${m.marca}: Desconto médio de ${m.desconto.toFixed(2)}%`,
          severidade: 'alta'
        });
      }
    });

    return alertas.sort((a, b) => {
      const ordem = { alta: 0, media: 1, baixa: 2 };
      return ordem[a.severidade] - ordem[b.severidade];
    });
  }, [rankingVendedoresQualidade, heatmapMargemFamilia, descontoPorMarca]);

  return (
    <div className="space-y-6">
      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Desconto Médio Aplicado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {descontoMedio.atual !== null ? formatPercent(descontoMedio.atual) : '-'}
            </div>
            {renderTrend(descontoMedio.atual || 0, descontoMedio.anterior)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Margem Potencial vs Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {margemPotencialVsReal.atual !== null ? formatPercent(margemPotencialVsReal.atual) : '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Diferença média</div>
            {renderTrend(margemPotencialVsReal.atual || 0, margemPotencialVsReal.anterior)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Margem Ruim (&lt;2%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {vendasMargemRuim.atual !== null ? formatPercent(vendasMargemRuim.atual) : '-'}
            </div>
            {renderTrend(vendasMargemRuim.atual || 0, vendasMargemRuim.anterior)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Margem Excelente (&gt;9%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {vendasMargemExcelente.atual !== null ? formatPercent(vendasMargemExcelente.atual) : '-'}
            </div>
            {renderTrend(vendasMargemExcelente.atual || 0, vendasMargemExcelente.anterior)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Índice de Mix Saudável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mixSaudavel.atual !== null ? formatPercent(mixSaudavel.atual) : '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Famílias core</div>
            {renderTrend(mixSaudavel.atual || 0, mixSaudavel.anterior)}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Desconto % × Volume por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="desconto" 
                  name="Desconto" 
                  unit="%" 
                  label={{ value: 'Desconto (%)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="volume" 
                  name="Volume" 
                  label={{ value: 'Volume', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis type="number" dataKey="size" range={[100, 1000]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold">{data.vendedor}</p>
                        <p className="text-sm">Desconto: {data.desconto}%</p>
                        <p className="text-sm">Volume: {data.volume}</p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Scatter name="Vendedores" data={dispersaoDescontoVolume} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heatmap de Margem por Família</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={heatmapMargemFamilia} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="familia" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Margem (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold">{data.familia}</p>
                        <p className="text-sm">Margem: {data.margemMedia}%</p>
                        <p className="text-sm">Unidades: {data.unidades}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="margemMedia" radius={[8, 8, 0, 0]}>
                  {heatmapMargemFamilia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Desconto Médio por Marca</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={descontoPorMarca} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="marca" />
                <YAxis label={{ value: 'Desconto (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Bar dataKey="desconto" radius={[8, 8, 0, 0]}>
                  {descontoPorMarca.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução da Margem Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucaoMargem} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis label={{ value: 'Margem (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Line 
                  type="monotone" 
                  dataKey="margemMedia" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Vendedores por Qualidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Desconto Médio</TableHead>
                    <TableHead className="text-right">Margem Média</TableHead>
                    <TableHead className="text-right">% Margem &lt;2%</TableHead>
                    <TableHead className="text-right">% Margem &gt;9%</TableHead>
                    <TableHead className="text-right">Nota de Qualidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingVendedoresQualidade.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum dado disponível
                      </TableCell>
                    </TableRow>
                  ) : (
                    (expandidoVendedores ? rankingVendedoresQualidade : rankingVendedoresQualidade.slice(0, 5)).map((v, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{v.vendedor}</TableCell>
                        <TableCell className="text-right">{formatPercent(v.descontoMedio)}</TableCell>
                        <TableCell className="text-right">{formatPercent(v.margemMedia)}</TableCell>
                        <TableCell className="text-right">
                          <span className={v.percRuim > 20 ? 'text-red-600 font-semibold' : ''}>
                            {formatPercent(v.percRuim)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={v.percExcelente > 30 ? 'text-green-600 font-semibold' : ''}>
                            {formatPercent(v.percExcelente)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${
                            v.notaQualidade >= 70 ? 'text-green-600' :
                            v.notaQualidade >= 40 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {v.notaQualidade.toFixed(0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {rankingVendedoresQualidade.length > 5 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandidoVendedores(!expandidoVendedores)}
                  className="gap-2"
                >
                  {expandidoVendedores ? (
                    <>
                      Ver menos
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Ver todos ({rankingVendedoresQualidade.length})
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Severidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontosAtencao.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2 py-4">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Nenhum ponto de atenção identificado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (expandidoPontos ? pontosAtencao : pontosAtencao.slice(0, 5)).map((alerta, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{alerta.tipo}</TableCell>
                        <TableCell>{alerta.descricao}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            alerta.severidade === 'alta' ? 'bg-red-100 text-red-800' :
                            alerta.severidade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alerta.severidade.toUpperCase()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {pontosAtencao.length > 5 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandidoPontos(!expandidoPontos)}
                  className="gap-2"
                >
                  {expandidoPontos ? (
                    <>
                      Ver menos
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Ver todos ({pontosAtencao.length})
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
