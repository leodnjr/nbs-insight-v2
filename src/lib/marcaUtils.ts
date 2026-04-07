/**
 * Normaliza nomes de marcas para agrupamento consistente
 * @param marca - Nome da marca original
 * @returns Nome da marca normalizado
 */
export const normalizarMarca = (marca: string | null): string => {
  if (!marca) return 'Sem Marca';
  
  const marcaUpper = marca.toUpperCase().trim();
  
  // Consolida Jeep Nacional e Jeep Importados em apenas Jeep
  if (marcaUpper.includes('JEEP')) {
    return 'Jeep';
  }
  
  // Normaliza Mercedes-Benz, Mercedes Benz para Mercedes
  if (marcaUpper.includes('MERCEDES')) {
    return 'Mercedes';
  }
  
  // Normaliza Land Rover
  if (marcaUpper.includes('LAND') && marcaUpper.includes('ROVER')) {
    return 'Land Rover';
  }
  
  // Normaliza Ram
  if (marcaUpper === 'RAM') {
    return 'Ram';
  }
  
  return marca;
};

/**
 * Cores personalizadas para marcas principais
 * Paleta profissional alinhada com branding real
 */
const CORES_MARCAS: Record<string, string> = {
  'Mercedes': '#0F2A43', // azul-noite premium
  'Land Rover': '#1C5B3C', // verde inglês clássico
  'Jeep': '#D39B32', // ocre off-road
  'Ram': '#B0161A', // vermelho forte e robusto
};

/**
 * Cores padrão para marcas sem cor personalizada
 */
const CORES_PADRAO = [
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#f97316', // laranja
  '#6366f1', // índigo
  '#84cc16', // lima
];

/**
 * Retorna a cor para uma marca específica
 * @param marca - Nome da marca
 * @param index - Índice para cores padrão (opcional)
 * @returns Cor em formato hexadecimal
 */
export const getCorMarca = (marca: string, index: number = 0): string => {
  const marcaNormalizada = normalizarMarca(marca);
  
  // Retorna cor personalizada se existir
  if (CORES_MARCAS[marcaNormalizada]) {
    return CORES_MARCAS[marcaNormalizada];
  }
  
  // Retorna cor padrão baseada no índice
  return CORES_PADRAO[index % CORES_PADRAO.length];
};
