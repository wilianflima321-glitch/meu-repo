/**
 * SkeletonLoading - Sistema de Skeleton Loading States
 * 
 * Skeletons animados que mostram exatamente onde o conteúdo vai aparecer.
 * Reduz percepção de lentidão e melhora UX durante carregamentos.
 * 
 * @see DETALHAMENTO_UX_STRATEGY_2026.md - Seção 3.2
 */

'use client';

import React from 'react';

// ============================================================================
// COMPONENTE BASE: SKELETON BOX
// ============================================================================

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

export function SkeletonBox({
  width = '100%',
  height = 20,
  className = '',
  rounded = 'md',
  animate = true,
}: SkeletonBoxProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={`bg-zinc-800 ${roundedClasses[rounded]} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// ============================================================================
// COMPONENTE: SKELETON TEXT
// ============================================================================

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  lineHeight?: number;
  gap?: number;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  lineHeight = 16,
  gap = 8,
  className = '',
}: SkeletonTextProps) {
  return (
    <div className={`space-y-${Math.round(gap / 4)} ${className}`} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTE: SKELETON AVATAR
// ============================================================================

interface SkeletonAvatarProps {
  size?: number;
  className?: string;
}

export function SkeletonAvatar({ size = 40, className = '' }: SkeletonAvatarProps) {
  return <SkeletonBox width={size} height={size} rounded="full" className={className} />;
}

// ============================================================================
// SKELETON: ASSET CARD (ContentBrowser)
// ============================================================================

export function SkeletonAssetCard() {
  return (
    <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
      {/* Thumbnail */}
      <SkeletonBox height={120} rounded="none" />
      
      {/* Info */}
      <div className="p-3 space-y-2">
        <SkeletonBox height={14} width="80%" rounded="sm" />
        <div className="flex items-center justify-between">
          <SkeletonBox height={10} width="40%" rounded="sm" />
          <SkeletonBox height={10} width="20%" rounded="sm" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: CONTENT BROWSER GRID
// ============================================================================

interface SkeletonContentBrowserProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  showSidebar?: boolean;
}

export function SkeletonContentBrowser({
  columns = 4,
  rows = 3,
  showHeader = true,
  showSidebar = true,
}: SkeletonContentBrowserProps) {
  const totalCards = columns * rows;

  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded-xl overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <SkeletonBox width={32} height={32} rounded="lg" />
            <SkeletonBox width={120} height={20} rounded="md" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox width={200} height={36} rounded="lg" />
            <SkeletonBox width={100} height={36} rounded="lg" />
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-48 p-3 border-r border-zinc-800 space-y-2">
            <SkeletonBox height={12} width="60%" rounded="sm" className="mb-4" />
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={i} height={32} rounded="lg" />
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 p-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBox width={60} height={16} rounded="sm" />
            <SkeletonBox width={8} height={8} rounded="full" />
            <SkeletonBox width={80} height={16} rounded="sm" />
            <SkeletonBox width={8} height={8} rounded="full" />
            <SkeletonBox width={100} height={16} rounded="sm" />
          </div>

          {/* Asset Grid */}
          <div 
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalCards }).map((_, i) => (
              <SkeletonAssetCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: PROJECT CARD
// ============================================================================

export function SkeletonProjectCard() {
  return (
    <div className="bg-zinc-800/50 rounded-2xl overflow-hidden">
      {/* Thumbnail */}
      <SkeletonBox height={180} rounded="none" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <SkeletonBox height={20} width="70%" rounded="md" />
        <SkeletonBox height={14} width="90%" rounded="sm" />
        
        <div className="flex items-center gap-2 pt-2">
          <SkeletonBox width={24} height={24} rounded="full" />
          <SkeletonBox height={12} width={80} rounded="sm" />
          <div className="flex-1" />
          <SkeletonBox height={12} width={60} rounded="sm" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: DASHBOARD
// ============================================================================

export function SkeletonDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBox height={32} width={200} rounded="md" />
          <SkeletonBox height={16} width={300} rounded="sm" className="mt-2" />
        </div>
        <SkeletonBox width={150} height={40} rounded="xl" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBox width={40} height={40} rounded="lg" />
              <SkeletonBox width={60} height={20} rounded="md" />
            </div>
            <SkeletonBox height={28} width="50%" rounded="md" />
            <SkeletonBox height={12} width="70%" rounded="sm" />
          </div>
        ))}
      </div>

      {/* Projects Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SkeletonBox height={24} width={150} rounded="md" />
          <SkeletonBox height={32} width={100} rounded="lg" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProjectCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: CHAT MESSAGE
// ============================================================================

export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <SkeletonAvatar size={36} />
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <SkeletonBox height={14} width={80} rounded="sm" className="mb-2" />
        <div className="bg-zinc-800/50 rounded-2xl p-4 space-y-2">
          <SkeletonBox height={14} width="100%" rounded="sm" />
          <SkeletonBox height={14} width="90%" rounded="sm" />
          <SkeletonBox height={14} width="60%" rounded="sm" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: CHAT PANEL
// ============================================================================

export function SkeletonChatPanel() {
  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <SkeletonAvatar size={40} />
        <div className="flex-1">
          <SkeletonBox height={16} width={120} rounded="sm" />
          <SkeletonBox height={12} width={80} rounded="sm" className="mt-1" />
        </div>
        <SkeletonBox width={32} height={32} rounded="lg" />
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        <SkeletonChatMessage isUser={false} />
        <SkeletonChatMessage isUser={true} />
        <SkeletonChatMessage isUser={false} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <SkeletonBox height={48} rounded="xl" />
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: EDITOR PANEL
// ============================================================================

export function SkeletonEditorPanel() {
  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-zinc-800">
        <SkeletonBox width={120} height={32} rounded="lg" />
        <SkeletonBox width={100} height={32} rounded="lg" />
        <SkeletonBox width={90} height={32} rounded="lg" />
      </div>

      {/* Code lines */}
      <div className="flex-1 p-4 space-y-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <SkeletonBox width={30} height={14} rounded="sm" className="opacity-50" />
            <SkeletonBox 
              height={14} 
              width={`${Math.random() * 50 + 30}%`} 
              rounded="sm" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: HIERARCHY TREE
// ============================================================================

export function SkeletonHierarchyTree() {
  return (
    <div className="p-2 space-y-1">
      {/* Tree items with indentation */}
      <div className="flex items-center gap-2 py-1">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="70%" rounded="sm" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-4">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="60%" rounded="sm" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-8">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="50%" rounded="sm" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-8">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="55%" rounded="sm" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-4">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="65%" rounded="sm" />
      </div>
      <div className="flex items-center gap-2 py-1">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="45%" rounded="sm" />
      </div>
      <div className="flex items-center gap-2 py-1 pl-4">
        <SkeletonBox width={16} height={16} rounded="sm" />
        <SkeletonBox height={14} width="40%" rounded="sm" />
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON: PROPERTIES PANEL
// ============================================================================

export function SkeletonPropertiesPanel() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <SkeletonBox width={24} height={24} rounded="lg" />
        <SkeletonBox height={18} width="60%" rounded="sm" />
      </div>

      {/* Sections */}
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          <SkeletonBox height={14} width="40%" rounded="sm" className="opacity-70" />
          
          {/* Property rows */}
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-between">
              <SkeletonBox height={14} width="30%" rounded="sm" />
              <SkeletonBox height={28} width="55%" rounded="md" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SKELETON: FULL IDE LAYOUT
// ============================================================================

export function SkeletonIDELayout() {
  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top Bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <SkeletonBox width={32} height={32} rounded="lg" />
          <div className="flex items-center gap-2">
            <SkeletonBox width={60} height={24} rounded="md" />
            <SkeletonBox width={60} height={24} rounded="md" />
            <SkeletonBox width={60} height={24} rounded="md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBox width={200} height={32} rounded="lg" />
          <SkeletonBox width={80} height={32} rounded="lg" />
          <SkeletonAvatar size={32} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-zinc-800 p-2">
          <SkeletonHierarchyTree />
        </div>

        {/* Center - Viewport + Code */}
        <div className="flex-1 flex flex-col">
          {/* Viewport */}
          <div className="flex-1 p-2">
            <SkeletonBox height="100%" rounded="xl" className="bg-zinc-800/30" />
          </div>
          
          {/* Bottom Panel */}
          <div className="h-48 border-t border-zinc-800">
            <SkeletonEditorPanel />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l border-zinc-800">
          <SkeletonPropertiesPanel />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 flex items-center justify-between px-4 border-t border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-4">
          <SkeletonBox width={80} height={14} rounded="sm" />
          <SkeletonBox width={60} height={14} rounded="sm" />
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBox width={100} height={14} rounded="sm" />
          <SkeletonBox width={80} height={14} rounded="sm" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK: USE SKELETON
// ============================================================================

interface UseSkeletonOptions {
  delay?: number;
  minDuration?: number;
}

export function useSkeleton<T>(
  data: T | undefined,
  options: UseSkeletonOptions = {}
): { isLoading: boolean; showSkeleton: boolean } {
  const { delay = 200, minDuration = 500 } = options;
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [minDurationPassed, setMinDurationPassed] = React.useState(false);
  const loadingStartedRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (data === undefined) {
      // Start loading
      const timer = setTimeout(() => {
        setShowSkeleton(true);
        loadingStartedRef.current = Date.now();
        
        // Track minimum duration
        setTimeout(() => {
          setMinDurationPassed(true);
        }, minDuration);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      // Data loaded
      if (loadingStartedRef.current) {
        const elapsed = Date.now() - loadingStartedRef.current;
        if (elapsed < minDuration) {
          // Wait for minimum duration
          setTimeout(() => {
            setShowSkeleton(false);
            loadingStartedRef.current = null;
          }, minDuration - elapsed);
        } else {
          setShowSkeleton(false);
          loadingStartedRef.current = null;
        }
      } else {
        setShowSkeleton(false);
      }
    }
  }, [data, delay, minDuration]);

  return {
    isLoading: data === undefined,
    showSkeleton,
  };
}

// ============================================================================
// COMPONENTE WRAPPER: WITH SKELETON
// ============================================================================

interface WithSkeletonProps<T> {
  data: T | undefined;
  skeleton: React.ReactNode;
  children: (data: T) => React.ReactNode;
  delay?: number;
  minDuration?: number;
}

export function WithSkeleton<T>({
  data,
  skeleton,
  children,
  delay = 200,
  minDuration = 500,
}: WithSkeletonProps<T>) {
  const { showSkeleton } = useSkeleton(data, { delay, minDuration });

  if (showSkeleton || data === undefined) {
    return <>{skeleton}</>;
  }

  return <>{children(data)}</>;
}

export default {
  SkeletonBox,
  SkeletonText,
  SkeletonAvatar,
  SkeletonAssetCard,
  SkeletonContentBrowser,
  SkeletonProjectCard,
  SkeletonDashboard,
  SkeletonChatMessage,
  SkeletonChatPanel,
  SkeletonEditorPanel,
  SkeletonHierarchyTree,
  SkeletonPropertiesPanel,
  SkeletonIDELayout,
  useSkeleton,
  WithSkeleton,
};
