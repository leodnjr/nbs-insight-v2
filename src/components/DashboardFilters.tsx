import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { normalizarMarca } from '@/lib/marcaUtils';
import type { FiltrosVenda } from '@/types/vendas';
import type { ModuleType } from '@/types/modules';

interface DashboardFiltersProps {
  filtros: FiltrosVenda;
  onChange: (filtros: FiltrosVenda) => void;
  currentModule?: ModuleType;
}

export const DashboardFilters = ({ filtros, onChange, currentModule }: DashboardFiltersProps) => {
  const { permissions, hasAccess } = useUserPermissions();
  const [marcas, setMarcas] = useState<string[]>([]);
  const [lojas, setLojas] = useState<string[]>([]);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [lojaMarcaMap, setLojaMarcaMap] = useState<Record<string, string>>({});

  // Date range (local state) + popover control
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>(() => {
    if (filtros.dataInicio && filtros.dataFim) {
      return { from: new Date(filtros.dataInicio), to: new Date(filtros.dataFim) };
    }
    return undefined;
  });
  const [open, setOpen] = useState(false);

  const handlePopoverOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      // Sync temp range with current filtros when opening
      setDateRange(
        filtros.dataInicio && filtros.dataFim
          ? { from: new Date(filtros.dataInicio), to: new Date(filtros.dataFim) }
          : undefined
      );
    }
  };

  const handleTipoPeriodoChange = (tipo: string) => {
    const now = new Date();
    const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    if (tipo === 'mes-corrente') {
      const inicio = new Date(saoPauloTime.getFullYear(), saoPauloTime.getMonth(), 1);
      const fim = saoPauloTime;
      setDateRange({ from: inicio, to: fim });
      onChange({
        ...filtros,
        dataInicio: inicio.toISOString().split('T')[0],
        dataFim: fim.toISOString().split('T')[0],
        tipoPeriodo: 'mes-corrente'
      });
    } else if (tipo === 'ultimos-30-dias') {
      const fim = saoPauloTime;
      const inicio = new Date(saoPauloTime);
      inicio.setDate(inicio.getDate() - 29);
      setDateRange({ from: inicio, to: fim });
      onChange({
        ...filtros,
        dataInicio: inicio.toISOString().split('T')[0],
        dataFim: fim.toISOString().split('T')[0],
        tipoPeriodo: 'ultimos-30-dias'
      });
    } else if (tipo === 'ultimo-mes-fechado') {
      const primeiroDiaMesAnterior = new Date(saoPauloTime.getFullYear(), saoPauloTime.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(saoPauloTime.getFullYear(), saoPauloTime.getMonth(), 0);
      setDateRange({ from: primeiroDiaMesAnterior, to: ultimoDiaMesAnterior });
      onChange({
        ...filtros,
        dataInicio: primeiroDiaMesAnterior.toISOString().split('T')[0],
        dataFim: ultimoDiaMesAnterior.toISOString().split('T')[0],
        tipoPeriodo: 'ultimo-mes-fechado'
      });
    } else {
      // manual - não muda nada, usuário define manualmente
      onChange({
        ...filtros,
        tipoPeriodo: 'manual'
      });
    }
  };

  useEffect(() => {
    loadFiltersData();
    // Inicializa com mês corrente se não houver datas ou tipoPeriodo
    if (!filtros.dataInicio || !filtros.dataFim || !filtros.tipoPeriodo) {
      resetToCurrentMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]); // Recarregar quando permissões mudarem

  const loadFiltersData = async () => {
    const { fetchAllPages } = await import('@/lib/fetchAllPages');

    const all = await fetchAllPages<any>((from, to) =>
      supabase
        .from('vendas')
        .select('marca, empresa_vendedora, nome_vendedor_completo')
        .not('marca', 'is', null)
        .range(from, to)
    );

    const data = all;

    // Normaliza as marcas para agrupar variações (ex: " LAND ROVER" e "LAND ROVER")
    const uniqueMarcas = Array.from(
      new Set(data.map((d: any) => normalizarMarca(d.marca)).filter((m: string) => m !== 'Sem Marca'))
    ) as string[];

    let uniqueLojas = Array.from(new Set(data.map((d: any) => d.empresa_vendedora).filter(Boolean))) as string[];
    const uniqueVendedores = Array.from(new Set(data.map((d: any) => d.nome_vendedor_completo).filter(Boolean))) as string[];

    // Criar mapeamento loja -> marca normalizada (pega a primeira marca encontrada para cada loja)
    const lojaParaMarca: Record<string, string> = {};
    data.forEach((d: any) => {
      if (d.empresa_vendedora && d.marca && !lojaParaMarca[d.empresa_vendedora]) {
        lojaParaMarca[d.empresa_vendedora] = normalizarMarca(d.marca);
      }
    });
    setLojaMarcaMap(lojaParaMarca);

    // Filtrar lojas baseado nas permissões do usuário
    if (permissions && !hasAccess.isAdmin()) {
      // Mostrar apenas lojas configuradas para o usuário
      if (permissions.stores.length > 0) {
        uniqueLojas = uniqueLojas.filter((loja) => permissions.stores.includes(loja));
      } else {
        // Se não tem lojas configuradas = não mostra nenhuma
        uniqueLojas = [];
      }
    }

    setMarcas(uniqueMarcas.sort());
    setLojas(uniqueLojas.sort());
    setVendedores(uniqueVendedores.sort());
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    setDateRange(range);
  };

  const applyDateRange = () => {
    if (dateRange?.from && dateRange?.to) {
      onChange({
        ...filtros,
        dataInicio: dateRange.from.toISOString().split('T')[0],
        dataFim: dateRange.to.toISOString().split('T')[0],
        tipoPeriodo: 'manual' // Quando aplica manualmente, marca como manual
      });
      setOpen(false);
    }
  };

  const cancelDateRange = () => {
    setDateRange(
      filtros.dataInicio && filtros.dataFim
        ? { from: new Date(filtros.dataInicio), to: new Date(filtros.dataFim) }
        : undefined
    );
    setOpen(false);
  };

  const resetToCurrentMonth = () => {
    // Usa timezone de São Paulo para "hoje"
    const now = new Date();
    const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const inicio = new Date(saoPauloTime.getFullYear(), saoPauloTime.getMonth(), 1);
    const fim = saoPauloTime; // Mês corrente vai até hoje
    setDateRange({ from: inicio, to: fim });
    onChange({
      ...filtros,
      dataInicio: inicio.toISOString().split('T')[0],
      dataFim: fim.toISOString().split('T')[0],
      tipoPeriodo: 'mes-corrente'
    });
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <Label htmlFor="tipo-periodo">Tipo de Período</Label>
          <Select
            value={filtros.tipoPeriodo || 'mes-corrente'}
            onValueChange={handleTipoPeriodoChange}
          >
            <SelectTrigger id="tipo-periodo">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes-corrente">Mês Corrente</SelectItem>
              <SelectItem value="ultimo-mes-fechado">Último mês fechado</SelectItem>
              <SelectItem value="ultimos-30-dias">Últimos 30 dias</SelectItem>
              <SelectItem value="manual">Período Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Label>Período</Label>
          <Popover open={open} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal min-w-[260px] truncate',
                  !dateRange?.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                  </>
                ) : (
                  <span>Selecione</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50 border shadow-lg max-w-[95vw]" align="start">
              <Calendar
                mode="range"
                selected={dateRange?.from ? (dateRange as any) : undefined}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
                initialFocus
                className="p-3 pointer-events-auto"
              />
              <div className="p-3 border-t bg-background flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={cancelDateRange} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={applyDateRange}
                  disabled={!dateRange?.from || !dateRange?.to}
                  className="flex-1"
                >
                  Aplicar
                </Button>
                <Button variant="outline" size="sm" onClick={resetToCurrentMonth} className="flex-1">
                  Mês Corrente
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="marca">Marca</Label>
          <Select
            value={
              currentModule === 'gerencia' 
                ? (filtros.loja ? lojaMarcaMap[filtros.loja] || 'none' : 'none')
                : (filtros.marca || 'all')
            }
            onValueChange={(v) => {
              if (currentModule !== 'gerencia') {
                onChange({ ...filtros, marca: v === 'all' ? undefined : v });
              }
            }}
            disabled={currentModule === 'gerencia'}
          >
            <SelectTrigger 
              id="marca"
              className={currentModule === 'gerencia' ? 'bg-[#e0e0e0] text-gray-700 cursor-not-allowed' : ''}
            >
              <SelectValue 
                placeholder={
                  currentModule === 'gerencia' 
                    ? (filtros.loja ? (lojaMarcaMap[filtros.loja] || 'Selecione uma loja') : 'Selecione uma loja')
                    : 'Todas'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {currentModule === 'gerencia' ? (
                <SelectItem value="none" disabled>
                  {filtros.loja ? (lojaMarcaMap[filtros.loja] || 'Selecione uma loja') : 'Selecione uma loja'}
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="all">Todas</SelectItem>
                  {marcas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="loja">Loja</Label>
          <Select
            value={filtros.loja || 'all'}
            onValueChange={(v) => onChange({ ...filtros, loja: v === 'all' ? undefined : v })}
          >
            <SelectTrigger id="loja">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {lojas.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        {filtros.loja && (
          <div>
            <Label htmlFor="vendedor">Vendedor</Label>
            <Select
              value={filtros.vendedor || 'all'}
              onValueChange={(v) => onChange({ ...filtros, vendedor: v === 'all' ? undefined : v })}
            >
              <SelectTrigger id="vendedor">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-6 col-span-full">
          <div className="flex items-center gap-2">
            <Switch
              id="tipo-veiculo"
              checked={filtros.tipoVeiculo === 'novos'}
              onCheckedChange={(checked) => 
                onChange({ ...filtros, tipoVeiculo: checked ? 'novos' : 'novos_seminovos' })
              }
            />
            <Label htmlFor="tipo-veiculo" className="text-sm font-normal cursor-pointer whitespace-nowrap">
              Veículos Novos
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="use-data-venda"
              checked={filtros.usarDataVenda}
              onCheckedChange={(checked) => onChange({ ...filtros, usarDataVenda: checked })}
            />
            <Label htmlFor="use-data-venda" className="text-sm font-normal cursor-pointer whitespace-nowrap">
              Usar Data de Venda
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
};
