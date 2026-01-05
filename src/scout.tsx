import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Detail,
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

/* ================ COMPONENT ================ */

export default function Scout(): JSX.Element {
  const [query, setQuery] = useState<string>("");
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [results, setResults] = useState<IndexedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [indexed, setIndexed] = useState<boolean>(false);

  const [selectedFile, setSelectedFile] = useState<IndexedFile | null>(null);
  const [previewText, setPreviewText] = useState<string>("");

  /* ---------- Initial indexing ---------- */

  useEffect(() => {
    async function init(): Promise<void> {
      let files: IndexedFile[] | null = loadFileIndex();

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

	function extractSnippet(
	text: string,
	query: string,
	radius = 80
	): string {
	const q = query.toLowerCase();
	const t = text.toLowerCase();

	const idx = t.indexOf(q);
	if (idx === -1) return "";

	const start = Math.max(0, idx - radius);
	const end = Math.min(text.length, idx + q.length + radius);

	return text
		.slice(start, end)
		.replace(/\s+/g, " ")
		.trim();
	}


	function highlightMatch(snippet: string, query: string): string {
    if (!snippet) return "";

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");

    return snippet.replace(re, (m) => `**${m}**`);
	}


  useEffect(() => {
    async function runSearch(): Promise<void> {
      if (!indexed || query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const matches: IndexedFile[] = await searchFiles(indexedFiles, query);
        setResults(matches);
      } catch (err) {
        console.error("[Scout] search error", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Scout error",
          message: "Search failed",
        });
      } finally {
        setLoading(false);
      }
    }

    runSearch();
  }, [query, indexed, indexedFiles]);

  /* ---------- Preview ---------- */

  function openPreview(file: IndexedFile): void {
    const cache = loadContentCache();
    const entry = cache[file.path];

    setSelectedFile(file);
    setPreviewText(
      entry?.text?.slice(0, 3000) ??
        "_No extractable text found on first page._"
    );
  }

  /* ---------- Detail View ---------- */
	if (selectedFile) {
	const filename =
		selectedFile.path.split("/").pop() ?? selectedFile.path;
	
    const contentCache = loadContentCache();
	const rawText = contentCache[selectedFile.path]?.text ?? "";
	const snippet = extractSnippet(rawText, query);
	const highlighted = highlightMatch(snippet, query);

	const markdown =
	`# ${filename}\n\n\n\n\n\n` + 
	(highlighted ? `…**${highlighted}**…` : "_No preview available_");


	return (
		<Detail
		navigationTitle={filename}
		markdown={markdown} // intentionally blank
		metadata={
			<Detail.Metadata>
			<Detail.Metadata.Label
				title="Name"
				text={filename}
			/>
			<Detail.Metadata.Label
				title="Where"
				text={selectedFile.path}
			/>
			<Detail.Metadata.Label
				title="Type"
				text="PDF document"
			/>
			<Detail.Metadata.Label
				title="Last modified"
				text={new Date(selectedFile.mtime).toLocaleString()}
			/>
			</Detail.Metadata>
		}
		actions={
			<ActionPanel>
			<Action.Open
				title="Open PDF"
				target={selectedFile.path}
			/>
			<Action.ShowInFinder
				title="Open with File Manager"
				path={selectedFile.path}
			/>
			<Action
				title="Back to Results"
				icon={Icon.ArrowLeft}
				onAction={() => setSelectedFile(null)}
			/>
			</ActionPanel>
		}
		/>
	);
	}


  /* ---------- List View ---------- */

  return (
    <List
      isLoading={loading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search inside PDFs (content-based)…"
    >
      <List.Section
        title={
          results.length > 0
            ? `Results (${results.length})`
            : indexed
            ? "No matches"
            : "Indexing…"
        }
      >
        {results.map((file: IndexedFile) => {
          const filename: string =
            file.path.split("/").pop() ?? file.path;

          return (
            <List.Item
              key={file.path}
              title={filename}
              subtitle={file.path}
              icon={Icon.File}
              actions={
                <ActionPanel>
                  <Action
                    title="Preview Content"
                    icon={Icon.Eye}
                    onAction={() => openPreview(file)}
                  />
                  <Action.Open
                    title="Open PDF"
                    target={file.path}
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
