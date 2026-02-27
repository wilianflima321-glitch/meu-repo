"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import IDELayout from "@/components/ide/IDELayout";
import FileExplorerPro from "@/components/ide/FileExplorerPro";
import AIChatPanelContainer from "@/components/ide/AIChatPanelContainer";
import TabBar, { TabProvider } from "@/components/editor/TabBar";
import MonacoEditorPro from "@/components/editor/MonacoEditorPro";
import CommandPaletteProvider from "@/components/ide/CommandPalette";

const LAST_PROJECT_ID_STORAGE_KEY = "aethel.workbench.lastProjectId";

type ActiveFileState = {
  path: string;
  content: string;
  language: string;
};

function resolveLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  if (ext === "css" || ext === "scss") return "css";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "py") return "python";
  return "plaintext";
}

function normalizePath(input: string): string {
  if (!input) return "/";
  return input.startsWith("/") ? input : `/${input}`;
}

function IDEContent() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const projectIdParam = searchParams.get("projectId");
  const entryParam = searchParams.get("entry");

  const projectId = useMemo(() => {
    if (projectIdParam && projectIdParam.trim()) {
      return projectIdParam.trim();
    }
    if (typeof window === "undefined") return "default";
    const fromStorage = localStorage.getItem(LAST_PROJECT_ID_STORAGE_KEY);
    return fromStorage?.trim() || "default";
  }, [projectIdParam]);

  const [activeFile, setActiveFile] = useState<ActiveFileState | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (projectId && projectId !== "default") {
      localStorage.setItem(LAST_PROJECT_ID_STORAGE_KEY, projectId);
    }
  }, [projectId]);

  const readFile = useCallback(
    async (path: string) => {
      const normalizedPath = normalizePath(path);
      setIsReadingFile(true);
      setFileError(null);

      try {
        const response = await fetch("/api/files/fs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-project-id": projectId,
          },
          body: JSON.stringify({
            action: "read",
            path: normalizedPath,
            projectId,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(bodyText || `Read failed with HTTP ${response.status}`);
        }

        const payload = await response.json();
        const content = typeof payload?.content === "string" ? payload.content : "";

        setActiveFile({
          path: normalizedPath,
          content,
          language: resolveLanguage(normalizedPath),
        });
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Unable to read file.");
      } finally {
        setIsReadingFile(false);
      }
    },
    [projectId]
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      const normalizedPath = normalizePath(path);
      setIsSavingFile(true);
      setFileError(null);
      try {
        const response = await fetch("/api/files/fs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-project-id": projectId,
          },
          body: JSON.stringify({
            action: "write",
            path: normalizedPath,
            content,
            projectId,
          }),
        });
        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(bodyText || `Write failed with HTTP ${response.status}`);
        }
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Unable to save file.");
      } finally {
        setIsSavingFile(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!fileParam) return;
    const normalized = normalizePath(fileParam);
    if (activeFile?.path === normalized) return;
    void readFile(normalized);
  }, [fileParam, activeFile?.path, readFile]);

  useEffect(() => {
    if (!entryParam) return;
    const entry = entryParam.toLowerCase();

    if (entry === "ai" || entry === "chat") {
      window.dispatchEvent(new Event("aethel.layout.openAI"));
      return;
    }
    if (entry === "explorer") {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openSidebarTab", {
          detail: { tab: "explorer" },
        })
      );
      return;
    }
    if (entry === "debugger" || entry === "debug") {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openBottomTab", {
          detail: { tab: "debug" },
        })
      );
      return;
    }
    if (entry === "terminal") {
      window.dispatchEvent(
        new CustomEvent("aethel.layout.openBottomTab", {
          detail: { tab: "terminal" },
        })
      );
    }
  }, [entryParam]);

  const handleFileSelect = useCallback(
    (file: { path: string; type: "file" | "folder" }) => {
      if (file.type !== "file") return;
      void readFile(file.path);
    },
    [readFile]
  );

  return (
    <TabProvider>
      <IDELayout
        fileExplorer={<FileExplorerPro onFileSelect={handleFileSelect} />}
        aiChatPanel={<AIChatPanelContainer />}
      >
        <div className="h-full flex flex-col">
          <TabBar />
          <div className="flex-1 overflow-hidden">
            {isReadingFile && (
              <div className="h-full flex items-center justify-center text-zinc-400">
                Loading file...
              </div>
            )}

            {!isReadingFile && fileError && (
              <div className="h-full flex items-center justify-center px-6">
                <div className="max-w-xl rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {fileError}
                </div>
              </div>
            )}

            {!isReadingFile && !fileError && activeFile && (
              <MonacoEditorPro
                path={activeFile.path}
                value={activeFile.content}
                language={activeFile.language}
                onChange={(value) => {
                  setActiveFile((prev) =>
                    prev
                      ? {
                          ...prev,
                          content: value ?? "",
                        }
                      : prev
                  );
                }}
                onSave={(value) => {
                  void writeFile(activeFile.path, value);
                }}
              />
            )}

            {!isReadingFile && !fileError && !activeFile && (
              <div className="h-full flex items-center justify-center text-zinc-500">
                Select a file to start editing.
              </div>
            )}
          </div>
          {isSavingFile && (
            <div className="h-7 border-t border-zinc-800 bg-zinc-950 px-3 flex items-center text-xs text-zinc-400">
              Saving...
            </div>
          )}
        </div>
      </IDELayout>
    </TabProvider>
  );
}

export default function FullscreenIDE() {
  return (
    <Suspense fallback={<div>Loading workspace context...</div>}>
      <CommandPaletteProvider>
        <IDEContent />
      </CommandPaletteProvider>
    </Suspense>
  );
}
