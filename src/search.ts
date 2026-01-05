import { extractFirstPageText } from "./extract";
import { loadContentCache, saveContentCache } from "./contentCache";
import { IndexedFile } from "./crawler";

export async function searchFiles(
  files: IndexedFile[],
  query: string
) {
  const q = query.toLowerCase();
  const cache = loadContentCache();
  const results = [];

  for (const file of files) {
    let entry = cache[file.path];

    if (!entry || entry.mtime !== file.mtime) {
      const text = await extractFirstPageText(file.path);
      entry = { mtime: file.mtime, text };
      cache[file.path] = entry;
    }

    if (entry.text.includes(q)) {
      results.push(file);
    }
  }

  saveContentCache(cache);
  return results;
}
