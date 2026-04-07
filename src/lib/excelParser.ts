import * as XLSX from 'xlsx';
import type { Venda } from '@/types/vendas';

interface NBSRow {
  [key: string]: any;
}

const isDev = import.meta.env.DEV;

export const parseNBSExcel = (file: File): Promise<Venda[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (isDev) console.log('📊 Nome da planilha:', sheetName);
        
        // Converte para JSON em matriz (linhas x colunas)
        const jsonData = XLSX.utils.sheet_to_json<NBSRow>(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        });
        
        if (isDev) {
          console.log('📝 Total de linhas no arquivo:', jsonData.length);
          console.log('🔍 Primeiras 5 linhas:', jsonData.slice(0, 5));
        }
        
        // Detecta dinamicamente a linha de cabeçalho (procura por "Chassi Completo")
        let headerIndex = jsonData.findIndex(row => Array.isArray(row) && row.some(c => typeof c === 'string' && c.toLowerCase().includes('chassi completo')));
        if (headerIndex === -1) {
          // fallback para a linha 3 (índice 2)
          headerIndex = 2;
        }
        
        // Cabeçalho
        const headers = (jsonData[headerIndex] as string[]).map(h => typeof h === 'string' ? h.trim() : h);
        if (isDev) console.log('📋 Headers encontrados (linha', headerIndex + 1, '):', headers);
        
        // Dados começam após o cabeçalho
        const rows = jsonData.slice(headerIndex + 1);
        if (isDev) console.log('📊 Total de linhas de dados:', rows.length);
        
        // Data de geração: procura nas linhas acima do cabeçalho
        const dgSourceRow = jsonData.slice(0, headerIndex + 1).find(r => Array.isArray(r) && r.some(c => typeof c === 'string' && /data de geração/i.test(c)));
        const dataGeracaoStr = dgSourceRow ? (dgSourceRow.find(c => typeof c === 'string' && /data de geração/i.test(c)) as string) : (jsonData[1]?.[0] as string);
        const dataGeracao = extractDataGeracao(dataGeracaoStr);
        
        // Mapeia as colunas para o nosso formato
        const vendas: Venda[] = rows
          .filter(row => Array.isArray(row) && row.length > 0)
          .map((row: any[], index) => {
            if (isDev && index === 0) {
              console.log('🔍 Exemplo de primeira linha de dados:', row);
            }
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            // Normaliza tipo (Novo/Usado)
            const novoFlag = (rowData['Novo'] ?? '').toString().trim().toUpperCase();
            const tipoFromNovo = novoFlag === 'N' ? 'Novo' : (novoFlag === 'U' ? 'Usado' : null);
            const tipoNormalized = tipoFromNovo || (typeof rowData['Tipo'] === 'string' ? rowData['Tipo'].trim() : null);
            
            return {
              chassi_completo: rowData['Chassi Completo'] || '',
              empresa_vendedora: rowData['Empresa Vendedora'] || null,
              marca: rowData['Descrição Marca'] || rowData['Marca'] || null,
              veiculo: rowData['Veículo'] || null,
              tipo: tipoNormalized,
              nome_vendedor_completo: rowData['Nome Vendedor Completo'] || null,
            data_faturamento: parseExcelDate(rowData['Data Faturamento']),
            data_venda: parseExcelDate(rowData['Data venda'] || rowData['Data Venda'] || rowData['Dt.Venda']),
            valor_venda: parseNumber(
              rowData['Valor Venda'] ?? rowData['Valor de Venda'] ?? rowData['Val Venda'] ?? rowData['ValorVenda']
            ),
            preco_venda: parseNumber(
              rowData['Preço Venda'] ?? rowData['Preco Venda'] ?? rowData['Preço de Venda'] ?? rowData['Preco de Venda'] ??
              rowData['Preço Tabela'] ?? rowData['Preco Tabela'] ?? rowData['Preço tabela'] ?? rowData['Preco tabela'] ??
              rowData['Preço Lista'] ?? rowData['Preco Lista'] ?? rowData['Preço de Tabela'] ?? rowData['PVenda'] ??
              rowData['P. Venda'] ?? rowData['P.Venda']
            ),
            custo_total_final: parseNumber(rowData['Custo Total Final']),
              comissao_final_vendedor: parseNumber(rowData['Comissão Final Vendedor']),
              comissao_final_gerente: parseNumber(rowData['Comissão Final Gerente']),
              forplan: 0, // Sempre zero
              juros: 0, // Sempre zero
              margem_fi_percent: parseNumber(rowData['MARGEM_FI_PERCENT']),
              data_geracao: dataGeracao,
            };
          })
          .filter(venda => venda.chassi_completo && venda.chassi_completo.trim() !== '');
        
        if (isDev) {
          console.log('✅ Total de vendas válidas processadas:', vendas.length);
          console.log('🚗 Exemplo de venda processada:', vendas[0]);
        }
        
        resolve(vendas);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

const parseExcelDate = (value: any): string | null => {
  if (!value) return null;
  
  // Se já é uma string de data
  if (typeof value === 'string') {
    const dateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Se é número do Excel (dias desde 1900)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  return null;
};

const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
    : Number(value);
  
  return isNaN(num) ? null : num;
};

const extractDataGeracao = (str: string): string | null => {
  if (!str) return null;
  
  // Formato: "Data de Geração: DD/MM/YYYY HH:MM:SS"
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}`;
  }
  
  return null;
};
