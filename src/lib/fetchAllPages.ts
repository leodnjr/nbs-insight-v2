export type PageFetcher<T> = (from: number, to: number) => PromiseLike<{
  data: T[] | null;
  error: unknown;
}>;

/**
 * Busca todos os registros em páginas (necessário porque o backend limita respostas a 1000 linhas por request).
 */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  // Loop paginado
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;

    const chunk = data ?? [];
    all.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return all;
}
