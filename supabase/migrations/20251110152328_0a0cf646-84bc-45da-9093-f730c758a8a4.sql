-- Remover campo nome_proprietario da tabela vendas
ALTER TABLE public.vendas 
DROP COLUMN IF EXISTS nome_proprietario;