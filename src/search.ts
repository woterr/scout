import { extractText } from "./extract";
import { loadContentCache, scheduleSaveContentCache } from "./contentCache";
import { IndexedFile } from "./crawler";
import { addToIndex, searchIndex } from "./invertedIndex";

function extractSnippet(text: string, words: string[]): string {
  const CONTEXT = 40;

  for (const word of words) {
    const idx = text.indexOf(word);
    if (idx !== -1) {
      const start = Math.max(0, idx - CONTEXT);
      const end = Math.min(text.length, idx + CONTEXT);

      let snippet = text.slice(start, end).replace(/\n/g, " ");

      for (const w of words) {
        const regex = new RegExp(`(${w})`, "gi");
        snippet = snippet.replace(regex, "**$1**");
      }

      return `... ${snippet.trim()} ...`;;
    }
  }

  return "";
}
export async function searchFiles(
  files: IndexedFile[],
  query: string,
): Promise<(IndexedFile & { snippet?: string })[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(Boolean);

  const cache = loadContentCache();

  const indexedMatches = searchIndex(q);

  const candidates =
    indexedMatches.size > 0
      ? files.filter((f) => indexedMatches.has(f.path))
      : files;

  const LIMIT = 4;
  const results: { file: IndexedFile; score: number; snippet?: string }[] = [];

  for (let i = 0; i < candidates.length; i += LIMIT) {
    const chunk = candidates.slice(i, i + LIMIT);

    const chunkResults = await Promise.all(
      chunk.map(async (file) => {
        let score = 0;

        const filename = file.path.split("/").pop()?.toLowerCase() || "";

        let filenameMatches = 0;
        for (const word of words) {
          if (filename.includes(word)) {
            filenameMatches++;
            score += 10;
            if (filename.startsWith(word)) score += 5;
          }
        }

        if (filenameMatches > 0 && score >= 15) {
          return { file, score };
        }

        let entry = cache[file.path];

        if (!entry || entry.mtime !== file.mtime) {
          const text = await extractText(file.path);

          entry = { mtime: file.mtime, text };
          cache[file.path] = entry;

          addToIndex(file.path, text);
        }

        let matchCount = 0;
        for (const word of words) {
          if (entry.text.indexOf(word) !== -1) {
            matchCount++;
          }
        }

        if (matchCount > 0) {
          score += matchCount * 3;
        }

        if (indexedMatches.has(file.path)) {
          score += 5;
        }

        if (score === 0) return null;

        const snippet = extractSnippet(entry.text, words);

        return { file, score, snippet };
      }),
    );

    results.push(...(chunkResults.filter(Boolean) as any));
  }

  scheduleSaveContentCache(cache);

  return results
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      ...r.file,
      snippet: r.snippet,
    }));
}
