'use client';

import React, { useState } from 'react';
import { ASSET_CONFIG, type AssetFilter, type AssetType } from './content-browser-core';

// Breadcrumb Navigation
export function BreadcrumbNav({ 
  path, 
  onNavigate 
}: { 
  path: string; 
  onNavigate: (path: string) => void;
}) {
  const parts = path.split('/').filter(Boolean);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      background: '#1a1a2e',
      borderBottom: '1px solid #333',
      fontSize: '13px',
    }}>
      <button
        onClick={() => onNavigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: '3px',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#333'}
        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
      >
        📁 Content
      </button>
      
      {parts.map((part, i) => {
        const fullPath = '/' + parts.slice(0, i + 1).join('/');
        return (
          <React.Fragment key={fullPath}>
            <span style={{ color: '#555' }}>/</span>
            <button
              onClick={() => onNavigate(fullPath)}
              style={{
                background: 'none',
                border: 'none',
                color: i === parts.length - 1 ? '#fff' : '#888',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '3px',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#333'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Filter Bar
export function FilterBar({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  filter: AssetFilter;
  onFilterChange: (filter: AssetFilter) => void;
  viewMode: 'grid' | 'list' | 'columns';
  onViewModeChange: (mode: 'grid' | 'list' | 'columns') => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (by: string, order: 'asc' | 'desc') => void;
}) {
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      background: '#16213e',
      borderBottom: '1px solid #333',
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: '300px' }}>
        <input
          type="text"
          placeholder="🔍 Search assets..."
          value={filter.search || ''}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 12px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px',
          }}
        />
      </div>
      
      {/* Type Filter */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          style={{
            padding: '6px 12px',
            background: filter.type?.length ? '#3f51b5' : '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          📋 Type {filter.type?.length ? `(${filter.type.length})` : ''}
        </button>
        
        {showTypeFilter && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '8px',
            zIndex: 100,
            minWidth: '180px',
          }}>
            {Object.entries(ASSET_CONFIG).filter(([type]) => type !== 'folder' && type !== 'unknown').map(([type, config]) => (
              <label key={type} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '3px',
              }}>
                <input
                  type="checkbox"
                  checked={filter.type?.includes(type as AssetType) || false}
                  onChange={(e) => {
                    const types = new Set(filter.type || []);
                    if (e.target.checked) {
                      types.add(type as AssetType);
                    } else {
                      types.delete(type as AssetType);
                    }
                    onFilterChange({ ...filter, type: Array.from(types) });
                  }}
                />
                <span style={{ color: config.color }}>{config.icon}</span>
                <span style={{ color: '#ccc', fontSize: '12px' }}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Starred Filter */}
      <button
        onClick={() => onFilterChange({ ...filter, starred: !filter.starred })}
        style={{
          padding: '6px 12px',
          background: filter.starred ? '#ffc107' : '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: filter.starred ? '#000' : '#fff',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ⭐ Starred
      </button>
      
      <div style={{ flex: 1 }} />
      
      {/* Sort */}
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [by, order] = e.target.value.split('-');
          onSortChange(by, order as 'asc' | 'desc');
        }}
        style={{
          padding: '6px 12px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '13px',
        }}
      >
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="type-asc">Type A-Z</option>
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="size-desc">Largest First</option>
        <option value="size-asc">Smallest First</option>
      </select>
      
      {/* View Mode */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {(['grid', 'list', 'columns'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            style={{
              padding: '6px 10px',
              background: viewMode === mode ? '#3f51b5' : '#0f0f23',
              border: '1px solid #333',
              borderRadius: mode === 'grid' ? '4px 0 0 4px' : mode === 'columns' ? '0 4px 4px 0' : '0',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {mode === 'grid' ? '▦' : mode === 'list' ? '☰' : '▥'}
          </button>
        ))}
      </div>
    </div>
  );
}
