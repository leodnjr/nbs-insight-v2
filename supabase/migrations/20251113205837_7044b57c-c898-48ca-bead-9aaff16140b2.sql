-- Adiciona coluna preco_venda à tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN preco_venda numeric;