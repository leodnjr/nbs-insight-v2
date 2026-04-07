import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface UserPermissionsEditorProps {
  userId: string;
  userRole: 'admin' | 'manager' | 'salesperson';
  onSave: () => void;
  onCancel: () => void;
}

// Lojas reais do sistema
const LOJAS_DISPONIVEIS = [
  'CJDR - Campinas',
  'CJDR - SP Av Europa',
  'CJDR - SP Showroom',
  'LR - Ibirapuera',
  'LR - Villa Lobos',
  'MB - Campinas',
  'MB - Sao Paulo',
  'MB - SJC Showroom',
];

// Módulos reais do sistema
const MODULOS_DISPONIVEIS = [
  { id: 'diretoria', name: 'Diretoria', description: 'Visão estratégica e análise de vendas' },
  { id: 'gerencia', name: 'Gerência', description: 'Gestão operacional e performance' },
  { id: 'pos-venda', name: 'Pós-Venda', description: 'Service, peças e atendimento' },
];

export const UserPermissionsEditor = ({ userId, userRole, onSave, onCancel }: UserPermissionsEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Estados
  const [todasLojas, setTodasLojas] = useState(false);
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([]);
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([]);
  const [canExport, setCanExport] = useState(false);
  const [canViewSellerDetails, setCanViewSellerDetails] = useState(false);
  const [canViewVehicleDetails, setCanViewVehicleDetails] = useState(false);
  const [canViewFullTables, setCanViewFullTables] = useState(false);

  useEffect(() => {
    const fetchCurrentPermissions = async () => {
      setLoading(true);
      try {
        // Buscar lojas
        const { data: stores } = await supabase
          .from('user_stores')
          .select('store')
          .eq('user_id', userId);

        if (stores && stores.length > 0) {
          setLojasSelecionadas(stores.map(s => s.store));
        } else {
          setTodasLojas(true);
        }

        // Buscar módulos
        const { data: modules } = await supabase
          .from('user_modules')
          .select('module')
          .eq('user_id', userId);

        if (modules) {
          setModulosSelecionados(modules.map(m => m.module));
        }

        // Buscar permissões
        const { data: perms } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (perms) {
          setCanExport(perms.can_export);
          setCanViewSellerDetails(perms.can_view_seller_details);
          setCanViewVehicleDetails(perms.can_view_vehicle_details);
          setCanViewFullTables(perms.can_view_full_tables);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        toast({
          title: 'Erro ao carregar permissões',
          description: 'Não foi possível carregar as permissões atuais',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPermissions();
  }, [userId, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Atualizar lojas
      await supabase
        .from('user_stores')
        .delete()
        .eq('user_id', userId);

      if (!todasLojas && lojasSelecionadas.length > 0) {
        await supabase
          .from('user_stores')
          .insert(lojasSelecionadas.map(store => ({ user_id: userId, store })));
      }

      // 2. Atualizar módulos
      await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId);

      if (modulosSelecionados.length > 0) {
        await supabase
          .from('user_modules')
          .insert(modulosSelecionados.map(module => ({ 
            user_id: userId, 
            module: module as 'diretoria' | 'gerencia' | 'pos-venda'
          })));
      }

      // 3. Atualizar permissões
      const { data: existingPerms } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const permissionsData = {
        user_id: userId,
        can_export: canExport,
        can_view_seller_details: canViewSellerDetails,
        can_view_vehicle_details: canViewVehicleDetails,
        can_view_full_tables: canViewFullTables,
      };

      if (existingPerms) {
        await supabase
          .from('user_permissions')
          .update(permissionsData)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_permissions')
          .insert(permissionsData);
      }

      toast({
        title: 'Permissões atualizadas',
        description: 'As permissões do usuário foram atualizadas com sucesso',
      });

      onSave();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as permissões',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleLoja = (loja: string) => {
    setLojasSelecionadas(prev =>
      prev.includes(loja)
        ? prev.filter(l => l !== loja)
        : [...prev, loja]
    );
  };

  const toggleModulo = (modulo: string) => {
    setModulosSelecionados(prev =>
      prev.includes(modulo)
        ? prev.filter(m => m !== modulo)
        : [...prev, modulo]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Vendedor não precisa configuração
  if (userRole === 'salesperson') {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <p>Vendedores têm permissões padrão (acesso apenas aos próprios dados)</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button onClick={onCancel} variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={['lojas', 'modulos']} className="w-full">
        {/* Lojas */}
        <AccordionItem value="lojas">
          <AccordionTrigger className="text-base font-semibold">
            🏢 Lojas ({todasLojas ? 'Todas' : lojasSelecionadas.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="todas-lojas"
                  checked={todasLojas}
                  onCheckedChange={(checked) => {
                    setTodasLojas(!!checked);
                    if (checked) setLojasSelecionadas([]);
                  }}
                />
                <Label htmlFor="todas-lojas" className="font-medium cursor-pointer">
                  Todas as lojas
                </Label>
              </div>
              {LOJAS_DISPONIVEIS.map((loja) => (
                <div key={loja} className="flex items-center space-x-2">
                  <Checkbox
                    id={`loja-${loja}`}
                    checked={lojasSelecionadas.includes(loja)}
                    disabled={todasLojas}
                    onCheckedChange={() => toggleLoja(loja)}
                  />
                  <Label
                    htmlFor={`loja-${loja}`}
                    className={`cursor-pointer ${todasLojas ? 'text-muted-foreground' : ''}`}
                  >
                    {loja}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Módulos */}
        <AccordionItem value="modulos">
          <AccordionTrigger className="text-base font-semibold">
            📊 Módulos ({modulosSelecionados.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {MODULOS_DISPONIVEIS.map((modulo) => (
                <div key={modulo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`modulo-${modulo.id}`}
                    checked={modulosSelecionados.includes(modulo.id)}
                    onCheckedChange={() => toggleModulo(modulo.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`modulo-${modulo.id}`} className="cursor-pointer font-medium">
                      {modulo.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{modulo.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Controles */}
        <AccordionItem value="controles">
          <AccordionTrigger className="text-base font-semibold">
            ⚙️ Controles Avançados
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-export"
                  checked={canExport}
                  onCheckedChange={(checked) => setCanExport(!!checked)}
                />
                <Label htmlFor="can-export" className="cursor-pointer">
                  Pode exportar relatórios
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-seller"
                  checked={canViewSellerDetails}
                  onCheckedChange={(checked) => setCanViewSellerDetails(!!checked)}
                />
                <Label htmlFor="can-seller" className="cursor-pointer">
                  Pode ver detalhes de vendedor
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-vehicle"
                  checked={canViewVehicleDetails}
                  onCheckedChange={(checked) => setCanViewVehicleDetails(!!checked)}
                />
                <Label htmlFor="can-vehicle" className="cursor-pointer">
                  Pode ver detalhes de veículo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-tables"
                  checked={canViewFullTables}
                  onCheckedChange={(checked) => setCanViewFullTables(!!checked)}
                />
                <Label htmlFor="can-tables" className="cursor-pointer">
                  Pode acessar tabelas completas
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Botões */}
      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button onClick={onCancel} variant="outline" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Permissões
        </Button>
      </div>
    </div>
  );
};
