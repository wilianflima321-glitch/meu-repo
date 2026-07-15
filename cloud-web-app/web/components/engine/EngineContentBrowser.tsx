"use client";

/**
 * Content Browser - Professional Asset Manager
 *
 * Unreal-style system for browsing, importing, organizing,
 * and managing project assets.
 *
 * Production-oriented content browser surface.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorScaleReadinessBadge } from "@/components/editor/EditorScaleReadinessBadge";
import { buildEditorScaleReadiness } from "@/lib/editor/editor-scale-readiness";
import {
  openConfirmDialog,
  openPromptDialog,
} from "@/lib/ui/non-blocking-dialogs";
import {
  ASSET_CONFIG,
  formatFileSize,
  getAssetType,
  type Asset,
  type AssetFilter,
  type AssetType,
  type ImportOptions,
} from "./content-browser-core";
import { BreadcrumbNav, FilterBar } from "./content-browser-controls";
import { createInitialContentBrowserAssets } from "./content-browser-fixtures";
import {
  AssetCard,
  AssetRow,
  ContextMenu,
  FolderTree,
  ImportModal,
} from "./EngineContentBrowser.parts";

export type { Asset, AssetFilter, AssetType, ImportOptions };

export class AssetLoader {
  private delegate: Promise<import("@/lib/assets/content-browser-loader").AssetLoader> | null = null;

  private async getDelegate() {
    if (!this.delegate) {
      this.delegate = import("@/lib/assets/content-browser-loader").then((module) => new module.AssetLoader());
    }
    return this.delegate;
  }

  async loadAsset(asset: Asset): Promise<unknown> {
    return (await this.getDelegate()).loadAsset(asset);
  }

  async generateThumbnail(asset: Asset): Promise<string | undefined> {
    return (await this.getDelegate()).generateThumbnail(asset);
  }

  async clearCache(): Promise<void> {
    (await this.getDelegate()).clearCache();
  }

  async dispose(): Promise<void> {
    (await this.getDelegate()).dispose();
  }
}

interface AssetStore {
  assets: Asset[];
  currentPath: string;
  selectedAssets: Set<string>;
  filter: AssetFilter;
  viewMode: "grid" | "list" | "columns";
  sortBy: "name" | "type" | "size" | "date";
  sortOrder: "asc" | "desc";
}

export interface ContentBrowserProps {
  projectId?: string;
  onAssetSelect?: (asset: Asset) => void;
  onAssetOpen?: (asset: Asset) => void;
}

const ASSET_GRID_CARD_WIDTH = 128;
const ASSET_GRID_ROW_HEIGHT = 140;
const ASSET_GRID_GAP = 8;
const ASSET_LIST_ROW_HEIGHT = 38;
const ASSET_VIRTUAL_OVERSCAN = 4;

export default function EngineContentBrowser({
  projectId,
  onAssetSelect,
  onAssetOpen,
}: ContentBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>(() => createInitialContentBrowserAssets());
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<AssetFilter>({});
  const [viewMode, setViewMode] = useState<"grid" | "list" | "columns">("grid");
  const [sortBy, setSortBy] = useState<"name" | "type" | "size" | "date">(
    "name",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    asset: Asset | null;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const assetViewportRef = useRef<HTMLDivElement>(null);
  const [assetScrollTop, setAssetScrollTop] = useState(0);
  const [assetViewport, setAssetViewport] = useState({ width: 960, height: 520 });

  // Filter and sort assets
  const displayedAssets = useMemo(() => {
    let filtered = assets.filter((a) => {
      // Path filter
      if (currentPath !== "/") {
        if (!a.path.startsWith(currentPath + "/") && a.path !== currentPath)
          return false;
        // Only show immediate children
        const relativePath = a.path.substring(currentPath.length + 1);
        if (relativePath.includes("/")) return false;
      } else {
        // Root level - show only items without nested path
        const pathParts = a.path.split("/").filter(Boolean);
        if (pathParts.length > 1) return false;
      }

      // Type filter
      if (filter.type?.length && !filter.type.includes(a.type)) return false;

      // Search filter
      if (
        filter.search &&
        !a.name.toLowerCase().includes(filter.search.toLowerCase())
      )
        return false;

      // Starred filter
      if (filter.starred && !a.starred) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      // Folders first
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;

      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "date":
          cmp = a.modifiedAt.getTime() - b.modifiedAt.getTime();
          break;
      }

      return sortOrder === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [assets, currentPath, filter, sortBy, sortOrder]);

  useEffect(() => {
    const element = assetViewportRef.current;
    if (!element) return;

    const updateViewport = () => {
      setAssetViewport({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewport);
      return () => window.removeEventListener("resize", updateViewport);
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleAssetScroll = useCallback<React.UIEventHandler<HTMLDivElement>>(
    (event) => {
      setAssetScrollTop(event.currentTarget.scrollTop);
    },
    [],
  );

  const gridColumns = useMemo(() => {
    const availableWidth = Math.max(ASSET_GRID_CARD_WIDTH, assetViewport.width - 32);
    return Math.max(
      1,
      Math.floor((availableWidth + ASSET_GRID_GAP) / (ASSET_GRID_CARD_WIDTH + ASSET_GRID_GAP)),
    );
  }, [assetViewport.width]);

  const assetVirtualRows = useMemo(() => {
    const rowHeight = viewMode === "grid" ? ASSET_GRID_ROW_HEIGHT : ASSET_LIST_ROW_HEIGHT;
    const rowCount =
      viewMode === "grid"
        ? Math.ceil(displayedAssets.length / gridColumns)
        : displayedAssets.length;
    const firstVisible = Math.floor(assetScrollTop / rowHeight);
    const visibleRows = Math.ceil(assetViewport.height / rowHeight);
    const start = Math.max(0, firstVisible - ASSET_VIRTUAL_OVERSCAN);
    const end = Math.min(rowCount, firstVisible + visibleRows + ASSET_VIRTUAL_OVERSCAN);
    const rows: number[] = [];

    for (let row = start; row < end; row += 1) {
      rows.push(row);
    }

    return {
      rows,
      rowHeight,
      totalHeight: rowCount * rowHeight,
    };
  }, [
    assetScrollTop,
    assetViewport.height,
    displayedAssets.length,
    gridColumns,
    viewMode,
  ]);

  const contentBrowserScaleReadiness = useMemo(
    () => buildEditorScaleReadiness({
      lane: "content-browser",
      totalCount: assets.length,
      visibleCount: Math.min(
        displayedAssets.length,
        viewMode === "grid"
          ? assetVirtualRows.rows.length * gridColumns
          : assetVirtualRows.rows.length,
      ),
      virtualization: true,
    }),
    [
      assetVirtualRows.rows.length,
      assets.length,
      displayedAssets.length,
      gridColumns,
      viewMode,
    ],
  );

  const handleSelect = useCallback(
    (asset: Asset, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        setSelectedAssets((prev) => {
          const next = new Set(prev);
          if (next.has(asset.id)) {
            next.delete(asset.id);
          } else {
            next.add(asset.id);
          }
          return next;
        });
      } else if (e.shiftKey && selectedAssets.size > 0) {
        // Range selection
        const lastSelected = Array.from(selectedAssets).pop()!;
        const lastIndex = displayedAssets.findIndex(
          (a) => a.id === lastSelected,
        );
        const currentIndex = displayedAssets.findIndex(
          (a) => a.id === asset.id,
        );
        const [start, end] = [
          Math.min(lastIndex, currentIndex),
          Math.max(lastIndex, currentIndex),
        ];

        setSelectedAssets(
          new Set(displayedAssets.slice(start, end + 1).map((a) => a.id)),
        );
      } else {
        setSelectedAssets(new Set([asset.id]));
      }

      onAssetSelect?.(asset);
    },
    [displayedAssets, selectedAssets, onAssetSelect],
  );

  const handleDoubleClick = useCallback(
    (asset: Asset) => {
      if (asset.type === "folder") {
        setCurrentPath(asset.path);
      } else {
        onAssetOpen?.(asset);
      }
    },
    [onAssetOpen],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, asset: Asset | null) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, asset });
    },
    [],
  );

  const handleContextAction = useCallback(
    async (action: string) => {
      const asset = contextMenu?.asset;

      switch (action) {
        case "new_folder":
          const folderName = await openPromptDialog({
            title: "New folder",
            message: "Folder name:",
            confirmText: "Create",
            cancelText: "Cancel",
          });
          if (folderName) {
            const newFolder: Asset = {
              id: Date.now().toString(),
              name: folderName,
              type: "folder",
              path: `${currentPath === "/" ? "" : currentPath}/${folderName}`,
              size: 0,
              createdAt: new Date(),
              modifiedAt: new Date(),
              children: [],
            };
            setAssets((prev) => [...prev, newFolder]);
          }
          break;

        case "import":
          setShowImportModal(true);
          break;

        case "rename":
          if (asset) {
            const newName = await openPromptDialog({
              title: "Rename asset",
              message: "New name:",
              defaultValue: asset.name,
              confirmText: "Rename",
              cancelText: "Cancel",
            });
            if (newName && newName !== asset.name) {
              setAssets((prev) =>
                prev.map((a) =>
                  a.id === asset.id
                    ? { ...a, name: newName, modifiedAt: new Date() }
                    : a,
                ),
              );
            }
          }
          break;

        case "duplicate":
          if (asset) {
            const duplicate: Asset = {
              ...asset,
              id: Date.now().toString(),
              name: `${asset.name}_copy`,
              createdAt: new Date(),
              modifiedAt: new Date(),
            };
            setAssets((prev) => [...prev, duplicate]);
          }
          break;

        case "star":
          if (asset) {
            setAssets((prev) =>
              prev.map((a) =>
                a.id === asset.id ? { ...a, starred: !a.starred } : a,
              ),
            );
          }
          break;

        case "delete":
          if (
            asset &&
            (await openConfirmDialog({
              title: "Delete asset",
              message: `Delete "${asset.name}"?`,
              confirmText: "Delete",
              cancelText: "Cancel",
            }))
          ) {
            setAssets((prev) => prev.filter((a) => a.id !== asset.id));
            setSelectedAssets((prev) => {
              const next = new Set(prev);
              next.delete(asset.id);
              return next;
            });
          }
          break;
      }
    },
    [contextMenu, currentPath],
  );

  const handleImport = useCallback(
    (files: File[], options: ImportOptions) => {
      // Process imported files
      for (const file of files) {
        const type = getAssetType(file.name);
        const newAsset: Asset = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type,
          path: `${currentPath === "/" ? "" : currentPath}/${file.name}`,
          size: file.size,
          createdAt: new Date(),
          modifiedAt: new Date(),
        };
        setAssets((prev) => [...prev, newAsset]);
      }
    },
    [currentPath],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--aethel-surface-primary)",
        color: "var(--aethel-text-primary)",
      }}
    >
      {/* Header */}
      <BreadcrumbNav path={currentPath} onNavigate={setCurrentPath} />
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(by, order) => {
          setSortBy(by as typeof sortBy);
          setSortOrder(order);
        }}
      />
      <EditorScaleReadinessBadge readiness={contentBrowserScaleReadiness} />

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Folder Tree */}
        <FolderTree
          assets={assets}
          currentPath={currentPath}
          onNavigate={setCurrentPath}
        />

        {/* Asset Grid/List */}
        <div
          ref={assetViewportRef}
          onScroll={handleAssetScroll}
          style={{
            flex: 1,
            overflow: "auto",
            padding: "16px",
          }}
          onContextMenu={(e) => handleContextMenu(e, null)}
        >
          {viewMode === "grid" ? (
            <div
              style={{
                height: assetVirtualRows.totalHeight,
                position: "relative",
                minWidth: "100%",
              }}
            >
              {assetVirtualRows.rows.map((rowIndex) => {
                const rowAssets = displayedAssets.slice(
                  rowIndex * gridColumns,
                  rowIndex * gridColumns + gridColumns,
                );

                return (
                  <div
                    key={rowIndex}
                    style={{
                      position: "absolute",
                      top: rowIndex * ASSET_GRID_ROW_HEIGHT,
                      left: 0,
                      right: 0,
                      display: "flex",
                      gap: `${ASSET_GRID_GAP}px`,
                    }}
                  >
                    {rowAssets.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedAssets.has(asset.id)}
                        onSelect={(e) => handleSelect(asset, e)}
                        onDoubleClick={() => handleDoubleClick(asset)}
                        onContextMenu={(e) => handleContextMenu(e, asset)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {/* List Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 100px 100px 150px",
                  gap: "12px",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--aethel-border-primary)",
                  fontSize: "11px",
                  color: "var(--aethel-text-muted)",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                <span></span>
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Modified</span>
              </div>

              <div style={{ height: assetVirtualRows.totalHeight, position: "relative" }}>
                {assetVirtualRows.rows.map((assetIndex) => {
                  const asset = displayedAssets[assetIndex];
                  if (!asset) return null;

                  return (
                    <div
                      key={asset.id}
                      style={{
                        position: "absolute",
                        top: assetIndex * ASSET_LIST_ROW_HEIGHT,
                        left: 0,
                        right: 0,
                        height: ASSET_LIST_ROW_HEIGHT,
                      }}
                    >
                      <AssetRow
                        asset={asset}
                        isSelected={selectedAssets.has(asset.id)}
                        onSelect={(e) => handleSelect(asset, e)}
                        onDoubleClick={() => handleDoubleClick(asset)}
                        onContextMenu={(e) => handleContextMenu(e, asset)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {displayedAssets.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--aethel-text-muted)",
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>📭</div>
              <div>No assets found</div>
              <button
                type="button"
                aria-label="Open import assets modal"
                onClick={() => setShowImportModal(true)}
                style={{
                  marginTop: "16px",
                  padding: "8px 24px",
                  background: "var(--aethel-primary)",
                  border: "none",
                  borderRadius: "6px",
                  color: "var(--aethel-text-primary)",
                  cursor: "pointer",
                }}
              >
                📥 Import Assets
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: "6px 12px",
          background: "var(--aethel-surface-tertiary)",
          borderTop: "1px solid var(--aethel-border-primary)",
          fontSize: "12px",
          color: "var(--aethel-text-muted)",
          display: "flex",
          gap: "24px",
        }}
      >
        <span>{displayedAssets.length} items</span>
        <span>{selectedAssets.size} selected</span>
        <span>
          {formatFileSize(displayedAssets.reduce((sum, a) => sum + a.size, 0))}{" "}
          total
        </span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          asset={contextMenu.asset}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
