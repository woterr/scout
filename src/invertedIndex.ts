const index: Record<string, Set<string>> = {};

export function addToIndex(filePath: string, text: string) {
  const words = text.split(/\W+/);

  for (const word of words) {
    if (!word) continue;

    const w = word.toLowerCase();

    if (!index[w]) index[w] = new Set();
    index[w].add(filePath);
  }
}

export function searchIndex(query: string): Set<string> {
  return index[query.toLowerCase()] || new Set();
}
