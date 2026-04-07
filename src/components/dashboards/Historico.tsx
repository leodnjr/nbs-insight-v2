import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, TrendingUp, DollarSign, Package, Percent, Receipt } from 'lucide-react';
import type { VendaCalculada, FiltrosVenda } from '@/types/vendas';

interface HistoricoProps {
  vendas: VendaCalculada[];
  filtros: FiltrosVenda;
}

interface DadosMensais {
  mes: string;
  mesAbrev: string;
  unidades: number;
  faturamento: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  variacaoUnidades?: number;
  variacaoFaturamento?: number;
  variacaoLucro?: number;
  variacaoMargem?: number;
  variacaoTicket?: number;
}

export const Historico = ({ vendas, filtros }: HistoricoProps) => {
  const formatCurrency = (value: number, showCents: boolean = false) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const vendasNovos = useMemo(() => {
    return vendas.filter(v => v.tipo === 'Novo');
  }, [vendas]);

  const dadosMensais = useMemo(() => {
    const campoData = filtros.usarDataVenda ? 'data_venda' : 'data_faturamento';
    
    // Agrupar por mês
    const porMes = new Map<string, VendaCalculada[]>();
    
    vendasNovos.forEach(venda => {
      const data = venda[campoData];
      if (!data) return;
      
      const mes = data.substring(0, 7); // YYYY-MM
      if (!porMes.has(mes)) {
        porMes.set(mes, []);
      }
      porMes.get(mes)!.push(venda);
    });

    // Ordenar meses
    const mesesOrdenados = Array.from(porMes.keys()).sort();
    
    // Calcular dados de cada mês
    const dados: DadosMensais[] = mesesOrdenados.map((mes, index) => {
      const vendasMes = porMes.get(mes)!;
      const unidades = vendasMes.length;
      const faturamento = vendasMes.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
      const lucro = vendasMes.reduce((sum, v) => sum + v.lucro_liquido, 0);
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
      const ticketMedio = unidades > 0 ? faturamento / unidades : 0;

      const [ano, mesNum] = mes.split('-');
      const mesAbrev = new Date(parseInt(ano), parseInt(mesNum) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      let resultado: DadosMensais = {
        mes,
        mesAbrev: mesAbrev.charAt(0).toUpperCase() + mesAbrev.slice(1),
        unidades,
        faturamento,
        lucro,
        margem,
        ticketMedio
      };

      // Calcular variações vs mês anterior
      if (index > 0) {
        const mesAnterior = mesesOrdenados[index - 1];
        const vendasMesAnterior = porMes.get(mesAnterior)!;
        const unidadesAnt = vendasMesAnterior.length;
        const faturamentoAnt = vendasMesAnterior.reduce((sum, v) => sum + (v.valor_venda || 0), 0);
        const lucroAnt = vendasMesAnterior.reduce((sum, v) => sum + v.lucro_liquido, 0);
        const margemAnt = faturamentoAnt > 0 ? (lucroAnt / faturamentoAnt) * 100 : 0;
        const ticketMedioAnt = unidadesAnt > 0 ? faturamentoAnt / unidadesAnt : 0;

        resultado.variacaoUnidades = unidadesAnt > 0 ? ((unidades - unidadesAnt) / unidadesAnt) * 100 : 0;
        resultado.variacaoFaturamento = faturamentoAnt > 0 ? ((faturamento - faturamentoAnt) / faturamentoAnt) * 100 : 0;
        resultado.variacaoLucro = lucroAnt !== 0 ? ((lucro - lucroAnt) / Math.abs(lucroAnt)) * 100 : 0;
        resultado.variacaoMargem = margem - margemAnt;
        resultado.variacaoTicket = ticketMedioAnt > 0 ? ((ticketMedio - ticketMedioAnt) / ticketMedioAnt) * 100 : 0;
      }

      return resultado;
    });

    // Retornar últimos 6 meses
    return dados.slice(-6);
  }, [vendasNovos, filtros.usarDataVenda]);

  const indicadoresAtuais = useMemo(() => {
    if (dadosMensais.length === 0) {
      return {
        unidades: 0,
        faturamento: 0,
        lucro: 0,
        margem: 0,
        ticketMedio: 0,
        variacaoUnidades: 0,
        variacaoFaturamento: 0,
        variacaoLucro: 0,
        variacaoMargem: 0,
        variacaoTicket: 0
      };
    }

    const mesAtual = dadosMensais[dadosMensais.length - 1];
    return {
      unidades: mesAtual.unidades,
      faturamento: mesAtual.faturamento,
      lucro: mesAtual.lucro,
      margem: mesAtual.margem,
      ticketMedio: mesAtual.ticketMedio,
      variacaoUnidades: mesAtual.variacaoUnidades || 0,
      variacaoFaturamento: mesAtual.variacaoFaturamento || 0,
      variacaoLucro: mesAtual.variacaoLucro || 0,
      variacaoMargem: mesAtual.variacaoMargem || 0,
      variacaoTicket: mesAtual.variacaoTicket || 0
    };
  }, [dadosMensais]);

  const ultimaAtualizacao = useMemo(() => {
    if (vendasNovos.length === 0) return null;
    const datasGeracao = vendasNovos
      .map(v => v.data_geracao)
      .filter(d => d)
      .sort()
      .reverse();
    return datasGeracao[0] ? new Date(datasGeracao[0]).toLocaleDateString('pt-BR') : null;
  }, [vendasNovos]);

  if (vendasNovos.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Sem registros de vendas neste período.</p>
        </CardContent>
      </Card>
    );
  }

  const IndicadorCard = ({ 
    titulo, 
    valor, 
    variacao, 
    icon: Icon, 
    formato 
  }: { 
    titulo: string; 
    valor: number; 
    variacao: number; 
    icon: any; 
    formato: 'currency' | 'number' | 'percent' 
  }) => {
    const positivo = variacao >= 0;
    const ArrowIcon = positivo ? ArrowUp : ArrowDown;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formato === 'currency' && formatCurrency(valor, true)}
            {formato === 'number' && valor.toLocaleString('pt-BR')}
            {formato === 'percent' && `${valor.toFixed(1)}%`}
          </div>
          <div className={`flex items-center text-xs ${positivo ? 'text-green-600' : 'text-red-600'}`}>
            <ArrowIcon className="h-3 w-3 mr-1" />
            <span>{formatPercent(variacao)} vs M-1</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Última Atualização */}
      {ultimaAtualizacao && (
        <div className="text-sm text-muted-foreground text-right">
          Última atualização: {ultimaAtualizacao}
        </div>
      )}

      {/* Cards de Indicadores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <IndicadorCard
          titulo="Vendas (unidades)"
          valor={indicadoresAtuais.unidades}
          variacao={indicadoresAtuais.variacaoUnidades}
          icon={Package}
          formato="number"
        />
        <IndicadorCard
          titulo="Faturamento (R$)"
          valor={indicadoresAtuais.faturamento}
          variacao={indicadoresAtuais.variacaoFaturamento}
          icon={DollarSign}
          formato="currency"
        />
        <IndicadorCard
          titulo="Lucro líquido (R$)"
          valor={indicadoresAtuais.lucro}
          variacao={indicadoresAtuais.variacaoLucro}
          icon={TrendingUp}
          formato="currency"
        />
        <IndicadorCard
          titulo="Margem média (%)"
          valor={indicadoresAtuais.margem}
          variacao={indicadoresAtuais.variacaoMargem}
          icon={Percent}
          formato="percent"
        />
        <IndicadorCard
          titulo="Ticket médio (R$)"
          valor={indicadoresAtuais.ticketMedio}
          variacao={indicadoresAtuais.variacaoTicket}
          icon={Receipt}
          formato="currency"
        />
      </div>

      {/* Gráfico: Evolução Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mesAbrev" />
              <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Margem média (%)') {
                    return `${value.toFixed(1)}%`;
                  }
                  return formatCurrency(value, true);
                }}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="faturamento" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="Faturamento total (R$)"
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="lucro" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Lucro líquido (R$)"
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="margem" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                name="Margem média (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico: Evolução do Ticket Médio */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Ticket Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mesAbrev" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value, true)}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="ticketMedio" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                name="Ticket médio"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico: Evolução do Volume de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Volume de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mesAbrev" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => value.toLocaleString('pt-BR')}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Bar 
                dataKey="unidades" 
                fill="hsl(var(--chart-2))"
                name="Unidades vendidas"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela: Evolução Mensal Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Lucro líquido</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
                <TableHead className="text-right">Ticket médio</TableHead>
                <TableHead className="text-right">Var. vs M-1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosMensais.map((dados) => (
                <TableRow key={dados.mes}>
                  <TableCell className="font-medium">{dados.mesAbrev}</TableCell>
                  <TableCell className="text-right">{dados.unidades}</TableCell>
                  <TableCell className="text-right">{formatCurrency(dados.faturamento, true)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(dados.lucro, true)}</TableCell>
                  <TableCell className="text-right">{dados.margem.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(dados.ticketMedio, true)}</TableCell>
                  <TableCell className="text-right">
                    {dados.variacaoFaturamento !== undefined ? (
                      <span className={dados.variacaoFaturamento >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercent(dados.variacaoFaturamento)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
