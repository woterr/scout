import React, { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@vicinae/api";
import { exec } from "child_process";

import { buildFileIndex, loadFileIndex } from "./fileIndex";
import { searchFiles } from "./search";
import type { IndexedFile } from "./crawler";

const SEARCH_ROOTS: string[] = [
  "/home/user/Downloads",
  "/home/user/Pictures",
  "/mnt/work",
];

let globalSearchId = 0;

export default function Scout(): JSX.Element {
  const [query, setQuery] = useState("");
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [results, setResults] = useState<IndexedFile[]>([]);
  const [indexed, setIndexed] = useState(false);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const id = ++globalSearchId;

      if (!indexed || query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const matches = await searchFiles(indexedFiles, query);

        if (id !== globalSearchId) return;

        setResults(matches);
      } catch (e) {
        console.error("[Scout]", e);
      } finally {
        if (id === globalSearchId) setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, indexed, indexedFiles]);

  async function handleReindex() {
    setLoading(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Scout",
      message: "Reindexing folders…",
    });

    try {
      const files = buildFileIndex(SEARCH_ROOTS);
      setIndexedFiles(files);

      await showToast({
        style: Toast.Style.Success,
        title: "Scout",
        message: `Reindexed ${files.length} PDFs`,
      });
    } catch (e) {
      console.error(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Scout",
        message: "Reindex failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search inside PDFs…"
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
        {results.map((file: any) => {
          const filename = file.path.split("/").pop() ?? file.path;

          return (
            <List.Item
              key={file.path}
              title={filename}
              subtitle={file.path}
              icon={Icon.File}
              detail={
                <List.Item.Detail
                  markdown={`# ${filename}
                    ${file.snippet ? `\n${file.snippet}\n` : "\n_No preview available_\n"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Path"
                        text={file.path}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Modified"
                        text={new Date(file.mtime).toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Directory"
                        text={file.path.substring(
                          0,
                          file.path.lastIndexOf("/"),
                        )}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Size"
                        text={(() => {
                          try {
                            const stats = require("fs").statSync(file.path);
                            return `${(stats.size / 1024).toFixed(1)} KB`;
                          } catch {
                            return "Unknown";
                          }
                        })()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Open title="Open PDF" target={file.path} />
                  <Action
                    title="Show in File Manager"
                    icon={Icon.Folder}
                    onAction={() =>
                      exec(`thunar "${file.path.replace(/"/g, '\\"')}"`)
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={file.path}
                  />
                  <Action
                    title="Reindex folders"
                    icon={Icon.Repeat}
                    onAction={handleReindex}
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
              <Action title="Rebuild index" onAction={handleReindex} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
