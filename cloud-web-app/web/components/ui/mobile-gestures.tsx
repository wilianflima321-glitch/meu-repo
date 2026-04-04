/**
 * Mobile Navigation & Gestures
 * Addresses UX analysis finding: Mobile UI not adapted, needs gestures
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useToastActions } from '@/components/ui/toast-system';

// ============================================================================
// TYPES
// ============================================================================

interface SwipeablePanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right' | 'bottom' | 'top';
  width?: string;
  height?: string;
}

interface MobileGestureProviderProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
}

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  pullDistance?: number;
}

interface BottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: string[];
}

// ============================================================================
// MOBILE GESTURE PROVIDER
// ============================================================================

export function MobileGestureProvider({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 50,
}: MobileGestureProviderProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Horizontal swipe
      if (absX > absY && absX > swipeThreshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }

      // Vertical swipe
      if (absY > absX && absY > swipeThreshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold]
  );

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// SWIPEABLE PANEL (Drawer)
// ============================================================================

export function SwipeablePanel({
  children,
  isOpen,
  onClose,
  direction = 'left',
  width = '280px',
  height = '50vh',
}: SwipeablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [translate, setTranslate] = useState(0);
  const touchStart = useRef<number>(0);
  const currentTranslate = useRef<number>(0);

  const isHorizontal = direction === 'left' || direction === 'right';

  const getTransform = () => {
    if (isDragging) {
      return isHorizontal
        ? `translateX(${translate}px)`
        : `translateY(${translate}px)`;
    }
    return isOpen
      ? 'translateX(0)'
      : direction === 'left'
      ? `translateX(-${width})`
      : direction === 'right'
      ? `translateX(${width})`
      : direction === 'bottom'
      ? `translateY(${height})`
      : `translateY(-${height})`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    touchStart.current = isHorizontal
      ? e.touches[0].clientX
      : e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const current = isHorizontal
      ? e.touches[0].clientX
      : e.touches[0].clientY;
    const diff = current - touchStart.current;

    // Constrain based on direction
    if (direction === 'left') {
      setTranslate(Math.min(0, diff));
    } else if (direction === 'right') {
      setTranslate(Math.max(0, diff));
    } else if (direction === 'bottom') {
      setTranslate(Math.max(0, diff));
    } else {
      setTranslate(Math.min(0, diff));
    }

    currentTranslate.current = diff;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Close if swiped far enough
    if (Math.abs(currentTranslate.current) > 100) {
      onClose();
    }

    setTranslate(0);
    currentTranslate.current = 0;
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    ...(direction === 'left' && { left: 0, top: 0, bottom: 0, width }),
    ...(direction === 'right' && { right: 0, top: 0, bottom: 0, width }),
    ...(direction === 'bottom' && { bottom: 0, left: 0, right: 0, height }),
    ...(direction === 'top' && { top: 0, left: 0, right: 0, height }),
    background: tokens.colors.bg.surface,
    zIndex: tokens.zIndex.drawer,
    transform: getTransform(),
    transition: isDragging ? 'none' : `transform ${tokens.animation.duration.normal} ${tokens.animation.easing.smooth}`,
    boxShadow: isOpen ? tokens.effects.shadow.xl : 'none',
    overflow: 'auto',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: `opacity ${tokens.animation.duration.normal}, visibility ${tokens.animation.duration.normal}`,
    zIndex: tokens.zIndex.overlay,
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    ...(direction === 'left' && { right: 0, top: '50%', transform: 'translateY(-50%)' }),
    ...(direction === 'right' && { left: 0, top: '50%', transform: 'translateY(-50%)' }),
    ...(direction === 'bottom' && { top: 0, left: '50%', transform: 'translateX(-50%)' }),
    ...(direction === 'top' && { bottom: 0, left: '50%', transform: 'translateX(-50%)' }),
    width: isHorizontal ? '4px' : '40px',
    height: isHorizontal ? '40px' : '4px',
    background: tokens.colors.border.light,
    borderRadius: tokens.radius.full,
    cursor: isHorizontal ? 'col-resize' : 'row-resize',
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div
        style={panelStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={handleStyle} />
        {children}
      </div>
    </>
  );
}

// ============================================================================
// PULL TO REFRESH
// ============================================================================

export function PullToRefresh({
  children,
  onRefresh,
  pullDistance = 80,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToastActions();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      const progress = Math.min(diff / pullDistance, 1);
      setPullProgress(progress);
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullProgress >= 1) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        success('Content refreshed', undefined, 2000);
      } catch (err) {
        error('Failed to refresh', undefined, 3000);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullProgress(0);
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
  };

  const indicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: `${pullProgress * pullDistance}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(180deg, ${tokens.colors.accent.cyan}20, transparent)`,
    transition: isPulling ? 'none' : `height ${tokens.animation.duration.fast}`,
    overflow: 'hidden',
  };

  const spinnerStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    border: `2px solid ${tokens.colors.border.light}`,
    borderTopColor: tokens.colors.accent.cyan,
    borderRadius: '50%',
    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
    transform: `rotate(${pullProgress * 360}deg)`,
    opacity: pullProgress,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div style={indicatorStyle}>
        <div style={spinnerStyle} />
      </div>
      <div style={{ transform: `translateY(${pullProgress * pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// BOTTOM SHEET
// ============================================================================

export function BottomSheet({
  children,
  isOpen,
  onClose,
  title,
  snapPoints = ['25%', '50%', '75%'],
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const touchStartY = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const getHeight = () => snapPoints[currentSnap];
  const getTranslate = () => {
    if (isDragging) return translateY;
    return isOpen ? 0 : '100%';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    setTranslateY(Math.max(0, diff));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to nearest point
    if (translateY > 100) {
      // Close if dragged down far
      onClose();
    } else if (translateY < -50) {
      // Expand to next snap point
      setCurrentSnap(Math.min(currentSnap + 1, snapPoints.length - 1));
    }

    setTranslateY(0);
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: `opacity ${tokens.animation.duration.normal}`,
    zIndex: tokens.zIndex.overlay,
  };

  const sheetStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: getHeight(),
    background: tokens.colors.bg.surface,
    borderRadius: `${tokens.radius['2xl']} ${tokens.radius['2xl']} 0 0`,
    transform: `translateY(${getTranslate()})`,
    transition: isDragging ? 'none' : `transform ${tokens.animation.duration.normal}`,
    zIndex: tokens.zIndex.modal,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: tokens.effects.shadow.xl,
  };

  const headerStyle: React.CSSProperties = {
    padding: tokens.spacing['4'],
    borderBottom: `1px solid ${tokens.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const handleStyle: React.CSSProperties = {
    width: '40px',
    height: '4px',
    background: tokens.colors.border.light,
    borderRadius: tokens.radius.full,
    margin: `0 auto ${tokens.spacing['4']}`,
    cursor: 'grab',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacing['4'],
  };

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div ref={sheetRef} style={sheetStyle}>
        <div
          style={handleStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {title && (
          <div style={headerStyle}>
            <span
              style={{
                fontSize: tokens.typography.fontSize.lg,
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              {title}
            </span>
            <button type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: tokens.colors.text.muted,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={contentStyle}>{children}</div>
      </div>
    </>
  );
}

// ============================================================================
// MOBILE NAV BAR (IDE)
// ============================================================================

interface MobileNavBarProps {
  items: Array<{
    id: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    badge?: number;
  }>;
}

export function MobileNavBar({ items }: MobileNavBarProps) {
  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    background: `linear-gradient(180deg, ${tokens.colors.bg.surface}, ${tokens.colors.bg.primary})`,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: `0 ${tokens.spacing['4']}`,
    zIndex: tokens.zIndex.sticky,
    paddingBottom: 'env(safe-area-inset-bottom)',
  };

  return (
    <nav style={barStyle}>
      {items.map((item) => (
        <button type="button"
          key={item.id}
          onClick={item.onClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: tokens.spacing['1'],
            padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
            background: 'transparent',
            border: 'none',
            color: item.active ? tokens.colors.accent.cyan : tokens.colors.text.muted,
            fontSize: tokens.typography.fontSize.xs,
            cursor: 'pointer',
            position: 'relative',
            transition: `color ${tokens.animation.duration.fast}`,
          }}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                minWidth: '18px',
                height: '18px',
                padding: `0 ${tokens.spacing['1']}`,
                background: tokens.colors.status.error,
                borderRadius: tokens.radius.full,
                fontSize: '10px',
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.inverse,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ============================================================================
// MOBILE FAB (Floating Action Button)
// ============================================================================

interface MobileFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color?: 'primary' | 'secondary' | 'accent';
}

export function MobileFAB({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  color = 'primary',
}: MobileFABProps) {
  const colorMap = {
    primary: `linear-gradient(135deg, ${tokens.colors.accent.cyan}, ${tokens.colors.accent.indigo})`,
    secondary: tokens.colors.bg.elevated,
    accent: `linear-gradient(135deg, ${tokens.colors.accent.emerald}, ${tokens.colors.accent.cyan})`,
  };

  const positionMap = {
    'bottom-right': { bottom: '80px', right: '16px' },
    'bottom-left': { bottom: '80px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' },
  };

  const buttonStyle: React.CSSProperties = {
    position: 'fixed',
    ...positionMap[position],
    width: '56px',
    height: '56px',
    borderRadius: tokens.radius.full,
    background: colorMap[color],
    border: 'none',
    boxShadow: tokens.effects.shadow.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colors.text.primary,
    cursor: 'pointer',
    zIndex: tokens.zIndex.floating,
    transition: `transform ${tokens.animation.duration.fast}`,
  };

  return (
    <button type="button"
      onClick={onClick}
      style={buttonStyle}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

const mobileGestures = {
  MobileGestureProvider,
  SwipeablePanel,
  PullToRefresh,
  BottomSheet,
  MobileNavBar,
  MobileFAB,
};

export default mobileGestures;
