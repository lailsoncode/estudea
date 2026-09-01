type BatchResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

export const fetchAllBatches = async <TItem, TResult>(
  items: TItem[],
  fetchBatch: (batch: TItem[]) => PromiseLike<BatchResult<TResult>>,
  batchSize = 10,
): Promise<TResult[]> => {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('batchSize must be a positive integer');
  }

  const batches: TItem[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await fetchBatch(batch);
      if (error) throw error;
      return data || [];
    }),
  );

  return results.flat();
};
