"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ASSET_CONFIG,
  formatFileSize,
  type Asset,
  type ImportOptions,
} from "./content-browser-core";
import {
  FolderOpen,
  FileEdit,
  Copy,
  Download,
  RefreshCw,
  Trash2,
  FolderPlus,
  Upload,
  Palette,
  Cpu,
  Sparkles,
  Folder,
  X,
  Box,
} from "lucide-react";

// ============================================================================
// COMPONENTS
// ============================================================================

// Asset Card (Grid View)
export function AssetCard({
  asset,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: {
  asset: Asset;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const config = ASSET_CONFIG[asset.type];

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        width: "120px",
        padding: "8px",
        background: isSelected
          ? "var(--aethel-surface-quaternary)"
          : "transparent",
        border: `1px solid ${isSelected ? "var(--aethel-primary)" : "transparent"}`,
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.15s",
      }}
      onMouseOver={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "var(--aethel-surface-quaternary)";
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "96px",
          height: "96px",
          background: "var(--aethel-surface-primary)",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {asset.thumbnail ? (
          <Image
            src={asset.thumbnail}
            alt={asset.name}
            fill
            sizes="96px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <Box className="w-10 h-10" style={{ color: config.color }} />
        )}

        {/* Starred indicator */}
        {asset.starred && (
          <div
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              fontSize: "14px",
            }}
          >
            STAR
          </div>
        )}
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--aethel-text-secondary)",
          textAlign: "center",
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {asset.name}
      </div>
    </div>
  );
}

// Asset Row (List View)
export function AssetRow({
  asset,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: {
  asset: Asset;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const config = ASSET_CONFIG[asset.type];

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 100px 100px 150px",
        gap: "12px",
        alignItems: "center",
        padding: "8px 12px",
        background: isSelected
          ? "var(--aethel-surface-quaternary)"
          : "transparent",
        borderBottom: "1px solid var(--aethel-border-primary)",
        cursor: "pointer",
        fontSize: "13px",
      }}
      onMouseOver={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "var(--aethel-surface-quaternary)";
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ fontSize: "20px" }}>{config.icon}</span>
      <span
        style={{
          color: "var(--aethel-text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {asset.starred && "STAR "}
        {asset.name}
      </span>
      <span style={{ color: config.color }}>{asset.type}</span>
      <span style={{ color: "var(--aethel-text-quaternary)" }}>
        {formatFileSize(asset.size)}
      </span>
      <span style={{ color: "var(--aethel-text-muted)" }}>
        {asset.modifiedAt.toLocaleDateString()}
      </span>
    </div>
  );
}

// Context Menu
export function ContextMenu({
  x,
  y,
  asset,
  onClose,
  onAction,
}: {
  x: number;
  y: number;
  asset: Asset | null;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onClose]);

  const items = asset
    ? [
        { id: "open", label: "Open", divider: false },
        { id: "rename", label: "Rename", divider: false },
        { id: "duplicate", label: "Duplicate", divider: false },
        { id: "star", label: asset.starred ? "Unstar" : "Star", divider: true },
        { id: "export", label: "Export", divider: false },
        { id: "reimport", label: "Reimport", divider: true },
        { id: "delete", label: "Delete", divider: false },
      ]
    : [
        { id: "new_folder", label: "New Folder", divider: false },
        { id: "import", label: "Import Asset", divider: true },
        { id: "new_material", label: "New Material", divider: false },
        { id: "new_blueprint", label: "New Blueprint", divider: false },
        { id: "new_particle", label: "New Particle System", divider: false },
      ];

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        background: "var(--aethel-surface-tertiary)",
        border: "1px solid var(--aethel-border-primary)",
        borderRadius: "6px",
        padding: "4px 0",
        minWidth: "180px",
        zIndex: 1000,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <button
            type="button"
            aria-label={`Run action ${item.label}`}
            onClick={() => {
              onAction(item.id);
              onClose();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 16px",
              background: "none",
              border: "none",
              color:
                item.id === "delete"
                  ? "var(--aethel-error)"
                  : "var(--aethel-text-secondary)",
              fontSize: "13px",
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background =
                "var(--aethel-surface-quaternary)")
            }
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            {item.label}
          </button>
          {item.divider && (
            <div
              style={{
                borderBottom: "1px solid var(--aethel-border-primary)",
                margin: "4px 0",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Folder Tree (Left Panel)
export function FolderTree({
  assets,
  currentPath,
  onNavigate,
}: {
  assets: Asset[];
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  function FolderNode({ folder, level }: { folder: Asset; level: number }) {
    const isSelected = currentPath === folder.path;
    const children = (folder.children || []).filter((c) => c.type === "folder");
    const hasChildren = children.length > 0;
    const [expanded, setExpanded] = useState(level < 2);

    return (
      <div key={folder.id}>
        <div
          onClick={() => onNavigate(folder.path)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            paddingLeft: `${8 + level * 16}px`,
            background: isSelected
              ? "var(--aethel-surface-quaternary)"
              : "transparent",
            cursor: "pointer",
            fontSize: "13px",
            color: isSelected
              ? "var(--aethel-text-primary)"
              : "var(--aethel-text-tertiary)",
          }}
          onMouseOver={(e) => {
            if (!isSelected)
              e.currentTarget.style.background =
                "var(--aethel-surface-quaternary)";
          }}
          onMouseOut={(e) => {
            if (!isSelected) e.currentTarget.style.background = "transparent";
          }}
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ cursor: "pointer", fontSize: "10px", width: "12px" }}
            >
              {expanded ? "▼" : "▶"}
            </span>
          )}
          {!hasChildren && <span style={{ width: "12px" }} />}
          <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0 inline-block mr-1" />
          <span>{folder.name}</span>
        </div>

        {expanded &&
          children.map((child) => (
            <FolderNode key={child.id} folder={child} level={level + 1} />
          ))}
      </div>
    );
  }

  const rootFolder: Asset = {
    id: "root",
    name: "Content",
    type: "folder",
    path: "/",
    size: 0,
    createdAt: new Date(),
    modifiedAt: new Date(),
    children: assets.filter((a) => a.type === "folder"),
  };

  return (
    <div
      style={{
        width: "220px",
        background: "var(--aethel-surface-primary)",
        borderRight: "1px solid var(--aethel-border-primary)",
        overflow: "auto",
      }}
    >
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--aethel-border-primary)",
          fontWeight: "bold",
          fontSize: "12px",
          color: "var(--aethel-text-quaternary)",
          textTransform: "uppercase",
        }}
      >
        Folders
      </div>
      <FolderNode folder={rootFolder} level={0} />
    </div>
  );
}

// Import Modal
export function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (files: File[], options: ImportOptions) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<ImportOptions>({
    generateMipmaps: true,
    compressTextures: true,
    importNormals: true,
    importAnimations: true,
    scale: 1,
    flipY: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--aethel-surface-tertiary)",
          borderRadius: "12px",
          width: "600px",
          maxHeight: "80vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--aethel-border-primary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              color: "var(--aethel-text-primary)",
            }}
          >
            Import Assets
          </h2>
          <button
            type="button"
            aria-label="Close asset import modal"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--aethel-text-quaternary)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            margin: "20px",
            padding: "40px",
            border: "2px dashed var(--aethel-border-primary)",
            borderRadius: "8px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.borderColor = "var(--aethel-primary)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.borderColor = "var(--aethel-border-primary)")
          }
        >
          <Upload className="w-10 h-10 text-[var(--aethel-primary)] mx-auto mb-3 opacity-80" />
          <div
            style={{
              color: "var(--aethel-text-quaternary)",
              marginBottom: "8px",
            }}
          >
            Drop files here or click to browse
          </div>
          <div style={{ color: "var(--aethel-text-muted)", fontSize: "12px" }}>
            Supports: FBX, GLTF, OBJ, PNG, JPG, WAV, MP3, etc.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              setFiles((prev) => [...prev, ...selected]);
            }}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div
            style={{ margin: "0 20px", maxHeight: "150px", overflow: "auto" }}
          >
            {files.map((file, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--aethel-surface-primary)",
                  borderRadius: "4px",
                  marginBottom: "4px",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "var(--aethel-text-primary)" }}>
                  {file.name}
                </span>
                <span style={{ color: "var(--aethel-text-muted)" }}>
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove file ${file.name} from import queue`}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--aethel-error)",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Options */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid var(--aethel-border-primary)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {[
              { key: "generateMipmaps", label: "Generate Mipmaps" },
              { key: "compressTextures", label: "Compress Textures" },
              { key: "importNormals", label: "Import Normals" },
              { key: "importAnimations", label: "Import Animations" },
              { key: "flipY", label: "Flip Y Axis" },
            ].map((opt) => (
              <label
                key={opt.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--aethel-text-secondary)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={options[opt.key as keyof ImportOptions] as boolean}
                  onChange={(e) =>
                    setOptions({ ...options, [opt.key]: e.target.checked })
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label
              style={{
                color: "var(--aethel-text-secondary)",
                fontSize: "13px",
              }}
            >
              Scale:
            </label>
            <input
              type="number"
              value={options.scale}
              onChange={(e) =>
                setOptions({
                  ...options,
                  scale: parseFloat(e.target.value) || 1,
                })
              }
              step="0.1"
              min="0.01"
              style={{
                width: "80px",
                padding: "6px 8px",
                background: "var(--aethel-surface-primary)",
                border: "1px solid var(--aethel-border-primary)",
                borderRadius: "4px",
                color: "var(--aethel-text-primary)",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--aethel-border-primary)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            aria-label="Cancel asset import"
            onClick={onClose}
            style={{
              padding: "8px 24px",
              background: "var(--aethel-surface-quaternary)",
              border: "none",
              borderRadius: "6px",
              color: "var(--aethel-text-primary)",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Confirm asset import"
            onClick={() => {
              onImport(files, options);
              onClose();
            }}
            disabled={files.length === 0}
            style={{
              padding: "8px 24px",
              background:
                files.length > 0
                  ? "var(--aethel-primary)"
                  : "var(--aethel-surface-quaternary)",
              border: "none",
              borderRadius: "6px",
              color: "var(--aethel-text-primary)",
              cursor: files.length > 0 ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Import {files.length > 0 && `(${files.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
