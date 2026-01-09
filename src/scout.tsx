import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@vicinae/api";

import { buildFileIndex, loadFileIndex } from "./fileIndex";
import { searchFiles } from "./search";
import { loadContentCache } from "./contentCache";
import type { IndexedFile } from "./crawler";

/* ================= CONFIG ================= */

const SEARCH_ROOTS: string[] = [
  "/home/user/Downloads",
  "/mnt/shared/linux",
];

/* ================ HELPERS ================= */

function extractSnippet(text: string, query: string, radius = 80): string {
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  const idx = t.indexOf(q);
  if (idx === -1) return "";

  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);

  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function highlight(snippet: string, query: string): string {
  if (!snippet) return "";

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");

  return snippet.replace(re, (m) => `**${m}**`);
}

/* ================ COMPONENT ================= */

export default function Scout(): JSX.Element {
  const [query, setQuery] = useState("");
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [results, setResults] = useState<IndexedFile[]>([]);
  const [indexed, setIndexed] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------- Indexing ---------- */

  useEffect(() => {
    async function init() {
      let files = loadFileIndex();

      if (!files) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Scout",
          message: "Indexing folders…",
        });

        files = buildFileIndex(SEARCH_ROOTS);

        await showToast({
          style: Toast.Style.Success,
          title: "Scout",
          message: `Indexed ${files.length} PDFs`,
        });
      }

      setIndexedFiles(files);
      setIndexed(true);
    }

    init();
  }, []);

  /* ---------- Search ---------- */

  useEffect(() => {
    async function run() {
      if (!indexed || query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const matches = await searchFiles(indexedFiles, query);
        setResults(matches);
      } catch (e) {
        console.error("[Scout]", e);
        showToast({
          style: Toast.Style.Failure,
          title: "Scout",
          message: "Search failed",
        });
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [query, indexed, indexedFiles]);

  /* ---------- UI ---------- */

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search inside PDFs (content-based)…"
    >
      <List.Section
        title={
          indexed
            ? results.length
              ? `Results (${results.length})`
              : "No matches"
            : "Indexing…"
        }
      >
        {results.map((file) => {
          const filename = file.path.split("/").pop() ?? file.path;
          const cache = loadContentCache();
          const text = cache[file.path]?.text ?? "";
          const snippet = extractSnippet(text, query);
          const preview = snippet
            ? `…${highlight(snippet, query)}…`
            : "_No preview available_";

          return (
            <List.Item
              key={file.path}
              title={filename}
              subtitle={file.path}
              icon={Icon.File}
              detail={
                <List.Item.Detail
                  markdown={`# ${filename}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={filename} />
                      <List.Item.Detail.Metadata.Label title="Where" text={file.path} />
                      <List.Item.Detail.Metadata.Label title="Type" text="PDF document" />
                      <List.Item.Detail.Metadata.Label
                        title="Last modified"
                        text={new Date(file.mtime).toLocaleString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Open title="Open PDF" target={file.path} />
                  <Action.ShowInFinder
                    title="Open with File Manager"
                    path={file.path}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={file.path}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Reindex folders"
          icon={Icon.Repeat}
          actions={
            <ActionPanel>
              <Action
                title="Rebuild index"
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Scout",
                    message: "Reindexing folders…",
                  });

                  const files = buildFileIndex(SEARCH_ROOTS);
                  setIndexedFiles(files);

                  await showToast({
                    style: Toast.Style.Success,
                    title: "Scout",
                    message: `Reindexed ${files.length} PDFs`,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
