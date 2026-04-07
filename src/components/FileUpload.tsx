import { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { parseNBSExcel } from '@/lib/excelParser';
import { calcularVenda } from '@/lib/calculosVendas';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import type { Venda } from '@/types/vendas';

const vendaSchema = z.object({
  chassi_completo: z.string().trim().min(1).max(100),
  empresa_vendedora: z.string().max(200).nullable(),
  marca: z.string().max(100).nullable(),
  veiculo: z.string().max(200).nullable(),
  tipo: z.string().max(50).nullable(),
  nome_vendedor_completo: z.string().max(200).nullable(),
  data_faturamento: z.string().max(20).nullable(),
  data_venda: z.string().max(20).nullable(),
  valor_venda: z.number().max(999999999).nullable(),
  preco_venda: z.number().max(999999999).nullable(),
  custo_total_final: z.number().max(999999999).nullable(),
  comissao_final_vendedor: z.number().max(999999999).nullable(),
  comissao_final_gerente: z.number().max(999999999).nullable(),
  forplan: z.number().nullable(),
  juros: z.number().nullable(),
  margem_fi_percent: z.number().nullable(),
  data_geracao: z.string().max(30).nullable(),
});

export const FileUpload = ({ onUploadComplete }: { onUploadComplete: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security: Check authentication before processing file
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: 'Não autorizado',
        description: 'Faça login para fazer upload de arquivos',
        variant: 'destructive'
      });
      return;
    }

    // Security: Verify admin role before allowing upload
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      toast({
        title: 'Permissão negada',
        description: 'Apenas administradores podem fazer upload de arquivos',
        variant: 'destructive'
      });
      return;
    }

    // Security: Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: 'Tamanho máximo permitido: 10MB',
        variant: 'destructive'
      });
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const vendas = await parseNBSExcel(file);
      
      if (vendas.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'O arquivo não contém vendas válidas',
          variant: 'destructive'
        });
        setUploading(false);
        return;
      }

      // Processa apenas vendas do tipo "Novo" (conforme especificação)
      const vendasNovas = vendas.filter(v => {
        const t = (v.tipo || '').toString().trim().toLowerCase();
        return t === 'novo' || t === 'n' || t === '0km' || t === 'novo 0km';
      });

      if (vendasNovas.length === 0) {
        toast({
          title: 'Nenhuma venda do tipo Novo',
          description: 'O arquivo foi lido, mas não há registros "Novo" para importar.',
        });
        setUploading(false);
        return;
      }

      // Validate each record before inserting
      const validVendas: Venda[] = [];
      let invalidCount = 0;
      for (const venda of vendasNovas) {
        const result = vendaSchema.safeParse(venda);
        if (result.success) {
          validVendas.push(venda);
        } else {
          invalidCount++;
        }
      }

      if (validVendas.length === 0) {
        toast({
          title: 'Dados inválidos',
          description: 'Nenhum registro passou na validação de dados.',
          variant: 'destructive'
        });
        setUploading(false);
        return;
      }

      // Insere ou atualiza vendas (upsert por chassi_completo)
      const { error } = await supabase
        .from('vendas')
        .upsert(validVendas, { 
          onConflict: 'chassi_completo',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: 'Upload concluído!',
        description: `${validVendas.length} vendas processadas com sucesso.${invalidCount > 0 ? ` ${invalidCount} registros inválidos ignorados.` : ''}`,
      });

      onUploadComplete();
    } catch (error) {
      // Security: Don't expose error details to user
      if (import.meta.env.DEV) {
        console.error('Debug - Erro ao processar arquivo:', error);
      }
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Verifique se o arquivo está no formato correto do NBS.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="p-6 border-2 border-dashed border-border hover:border-primary/50 transition-colors">
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="rounded-full bg-primary/10 p-4">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">Upload de Vendas NBS</h3>
          <p className="text-sm text-muted-foreground">
            Arraste e solte ou clique para selecionar o arquivo Excel
          </p>
        </div>

        <label htmlFor="file-upload">
          <Button 
            type="button" 
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Processando...' : 'Selecionar Arquivo'}
            </span>
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Formato: Excel (.xlsx ou .xls) exportado diretamente do NBS
        </p>
      </div>
    </Card>
  );
};
