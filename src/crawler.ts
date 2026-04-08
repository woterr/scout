import fs from "fs";
import path from "path";

export type IndexedFile = {
  path: string;
  mtime: number;
};

export function crawl(root: string, results: IndexedFile[] = []) {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    try {
      if (entry.isDirectory()) {
        crawl(fullPath, results);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        const stat = fs.statSync(fullPath);
        results.push({ path: fullPath, mtime: stat.mtimeMs });
      }
    } catch {}
  }

  return results;
}
