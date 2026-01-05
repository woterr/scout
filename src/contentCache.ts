import fs from "fs";

const CONTENT_PATH = `${process.env.HOME}/.cache/vicinae-scout/content.json`;

type Cache = Record<string, { mtime: number; text: string }>;

export function loadContentCache(): Cache {
  if (!fs.existsSync(CONTENT_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONTENT_PATH, "utf-8"));
}

export function saveContentCache(cache: Cache) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(cache, null, 2));
}
