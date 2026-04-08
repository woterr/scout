import fs from "fs";
import path from "path";
import os from "os";

const CACHE_DIR = path.join(os.homedir(), ".cache/vicinae-scout");
const CONTENT_PATH = path.join(CACHE_DIR, "content.json");

type Cache = Record<string, { mtime: number; text: string }>;

let memoryCache: Cache | null = null;
let lastLoadTime = 0;
const RELOAD_INTERVAL = 2000; // 2s

export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function loadContentCache(): Cache {
  ensureCacheDir();

  const now = Date.now();

  if (!memoryCache || now - lastLoadTime > RELOAD_INTERVAL) {
    try {
      if (fs.existsSync(CONTENT_PATH)) {
        memoryCache = JSON.parse(fs.readFileSync(CONTENT_PATH, "utf-8"));
      } else {
        memoryCache = {};
      }
    } catch {
      memoryCache = {};
    }

    lastLoadTime = now;
  }

  return memoryCache;
}

export function scheduleSaveContentCache(cache: Cache) {
  ensureCacheDir();
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(cache, null, 2));
}
