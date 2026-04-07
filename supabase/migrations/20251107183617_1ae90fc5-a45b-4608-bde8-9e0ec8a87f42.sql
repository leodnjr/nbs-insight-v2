-- Tabela de vendas (dados do Excel NBS)
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chassi_completo TEXT NOT NULL UNIQUE,
  empresa_vendedora TEXT,
  marca TEXT,
  veiculo TEXT,
  tipo TEXT,
  nome_vendedor_completo TEXT,
  data_faturamento DATE,
  data_venda DATE,
  valor_venda NUMERIC(12, 2),
  custo_total_final NUMERIC(12, 2),
  comissao_final_vendedor NUMERIC(12, 2),
  comissao_final_gerente NUMERIC(12, 2),
  forplan NUMERIC(12, 2),
  juros NUMERIC(12, 2),
  margem_fi_percent NUMERIC(8, 4),
  data_geracao TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_vendas_chassi ON public.vendas(chassi_completo);
CREATE INDEX idx_vendas_data_faturamento ON public.vendas(data_faturamento);
CREATE INDEX idx_vendas_data_venda ON public.vendas(data_venda);
CREATE INDEX idx_vendas_marca ON public.vendas(marca);
CREATE INDEX idx_vendas_empresa ON public.vendas(empresa_vendedora);
CREATE INDEX idx_vendas_tipo ON public.vendas(tipo);

-- Tabela de metas
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marca TEXT NOT NULL,
  loja TEXT NOT NULL,
  mes DATE NOT NULL,
  meta_unidades INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(marca, loja, mes)
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_vendas_updated_at
BEFORE UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
BEFORE UPDATE ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies (tabelas públicas para este caso de uso)
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de vendas para todos"
ON public.vendas FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de vendas para todos"
ON public.vendas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de vendas para todos"
ON public.vendas FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão de vendas para todos"
ON public.vendas FOR DELETE
USING (true);

CREATE POLICY "Permitir leitura de metas para todos"
ON public.metas FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de metas para todos"
ON public.metas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de metas para todos"
ON public.metas FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão de metas para todos"
ON public.metas FOR DELETE
USING (true);