import fs from "fs";
import path from "path";
import { crawl, IndexedFile } from "./crawler";

const CACHE_DIR = `${process.env.HOME}/.cache/vicinae-scout`;
const FILES_PATH = `${CACHE_DIR}/files.json`;

export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function buildFileIndex(roots: string[]): IndexedFile[] {
  ensureCacheDir();

  let files: IndexedFile[] = [];
  for (const root of roots) {
    files = files.concat(crawl(root));
  }

  fs.writeFileSync(FILES_PATH, JSON.stringify(files, null, 2));
  return files;
}

export function loadFileIndex(): IndexedFile[] | null {
  if (!fs.existsSync(FILES_PATH)) return null;
  return JSON.parse(fs.readFileSync(FILES_PATH, "utf-8"));
}
