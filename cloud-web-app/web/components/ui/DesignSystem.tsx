/**
 * Aethel IDE - Design System UI Components
 *
 * Componentes profissionais do design system baseados no VS Code.
 * Todos com acessibilidade, temas e comportamentos consistentes.
 */

'use client';

import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useId
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';

// ============================================================================
// DIALOG/MODAL
// ============================================================================

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onEscapeKeyDown?: () => void;
  onPointerDownOutside?: () => void;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className = '', onEscapeKeyDown, onPointerDownOutside }, ref) => {
    const context = useContext(DialogContext);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!context?.open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onEscapeKeyDown?.();
          context.onOpenChange(false);
        }
      };

      const handleClick = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          onPointerDownOutside?.();
          context.onOpenChange(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClick);

      // Focus trap
      const focusableElements = contentRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements?.[0] as HTMLElement;
      firstFocusable?.focus();

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClick);
        document.body.style.overflow = '';
      };
    }, [context, onEscapeKeyDown, onPointerDownOutside]);

    if (!context?.open) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm" aria-hidden />

        {/* Content */}
        <div
          ref={(node) => {
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
            (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={`
            relative z-10 w-full max-w-lg max-h-[85vh] overflow-auto
            bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-[var(--aethel-shadow-lg)]
            animate-in fade-in-0 zoom-in-95 duration-200
            ${className}
          `}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = 'DialogContent';

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-[var(--aethel-border-primary)] ${className}`}>
    {children}
  </div>
);

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold text-[var(--aethel-text-primary)] ${className}`}>{children}</h2>
);

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className = '' }) => (
  <p className={`text-sm text-[var(--aethel-text-tertiary)] mt-1 ${className}`}>{children}</p>
);

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogBody: React.FC<DialogBodyProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-[var(--aethel-border-primary)] flex justify-end gap-2 ${className}`}>
    {children}
  </div>
);

interface DialogCloseProps {
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export const DialogClose: React.FC<DialogCloseProps> = ({ children, className = '' }) => {
  const context = useContext(DialogContext);

  return (
    <button type="button"
      className={`absolute top-4 right-4 p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] ${className}`}
      onClick={() => context?.onOpenChange(false)}
      aria-label="Close"
    >
      {children || <X size={18} />}
    </button>
  );
};

// ============================================================================
// TABS
// ============================================================================

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className = '' }) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
);

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => (
  <div
    className={`flex gap-0 border-b border-[var(--aethel-border-primary)] ${className}`}
    role="tablist"
  >
    {children}
  </div>
);

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = '',
  disabled = false
}) => {
  const context = useContext(TabsContext);
  const isSelected = context?.value === value;

  return (
    <button type="button"
      className={`
        px-4 py-2 text-sm font-medium transition-colors relative
        ${isSelected
          ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-primary)] -mb-px'
          : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={() => !disabled && context?.onValueChange(value)}
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = '' }) => {
  const context = useContext(TabsContext);

  if (context?.value !== value) return null;

  return (
    <div className={className} role="tabpanel">
      {children}
    </div>
  );
};

// ============================================================================
// TREE VIEW
// ============================================================================

interface TreeItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeItem[];
  disabled?: boolean;
}

interface TreeViewContextValue {
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const TreeViewContext = createContext<TreeViewContextValue | null>(null);

interface TreeViewProps {
  items: TreeItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  defaultExpanded?: string[];
  className?: string;
}

export const TreeView: React.FC<TreeViewProps> = ({
  items,
  selectedId = null,
  onSelect,
  defaultExpanded = [],
  className = '',
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(selectedId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpanded));

  const handleSelect = useCallback((id: string) => {
    setInternalSelectedId(id);
    onSelect?.(id);
  }, [onSelect]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <TreeViewContext.Provider
      value={{
        selectedId: internalSelectedId,
        expandedIds,
        onSelect: handleSelect,
        onToggle: handleToggle
      }}
    >
      <div className={`text-sm ${className}`} role="tree">
        {items.map(item => (
          <TreeNode key={item.id} item={item} depth={0} />
        ))}
      </div>
    </TreeViewContext.Provider>
  );
};

interface TreeNodeProps {
  item: TreeItem;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, depth }) => {
  const context = useContext(TreeViewContext);
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = context?.expandedIds.has(item.id);
  const isSelected = context?.selectedId === item.id;

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1 cursor-pointer select-none
          ${isSelected ? 'bg-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'}
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (item.disabled) return;
          context?.onSelect(item.id);
          if (hasChildren) {
            context?.onToggle(item.id);
          }
        }}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {hasChildren ? (
          <button type="button"
            className="p-0.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
            onClick={(e) => {
              e.stopPropagation();
              context?.onToggle(item.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-[var(--aethel-text-tertiary)]" />
            ) : (
              <ChevronRight size={14} className="text-[var(--aethel-text-tertiary)]" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span className="truncate">{item.label}</span>
      </div>

      {hasChildren && isExpanded && (
        <div role="group">
          {item.children!.map(child => (
            <TreeNode key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CONTEXT MENU
// ============================================================================

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, onSelect, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    onSelect(id);
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)]
                     rounded-md shadow-xl py-1 animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            left: Math.min(position.x, window.innerWidth - 200),
            top: Math.min(position.y, window.innerHeight - 300)
          }}
          role="menu"
        >
          {items.map((item, index) => (
            item.separator ? (
              <div key={index} className="border-t border-[var(--aethel-border-primary)] my-1" role="separator" />
            ) : (
              <button type="button"
                key={item.id}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
                  ${item.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : item.danger
                      ? 'hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
                      : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
                  }
                `}
                onClick={() => !item.disabled && handleSelect(item.id)}
                disabled={item.disabled}
                role="menuitem"
              >
                {item.icon && <span className="w-4 flex-shrink-0">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-[var(--aethel-text-quaternary)] ml-auto">{item.shortcut}</span>
                )}
                {item.submenu && <ChevronRight size={14} className="text-[var(--aethel-text-quaternary)]" />}
              </button>
            )
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

// ============================================================================
// TOOLTIP
// ============================================================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delay = 300,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0, y = 0;

        switch (side) {
          case 'top':
            x = rect.left + rect.width / 2;
            y = rect.top - 8;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2;
            y = rect.bottom + 8;
            break;
          case 'left':
            x = rect.left - 8;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right + 8;
            y = rect.top + rect.height / 2;
            break;
        }

        setPosition({ x, y });
        setIsVisible(true);
      }
    }, delay);
  }, [side, delay]);

  const hideTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const getTransform = () => {
    switch (side) {
      case 'top': return 'translate(-50%, -100%)';
      case 'bottom': return 'translate(-50%, 0)';
      case 'left': return 'translate(-100%, -50%)';
      case 'right': return 'translate(0, -50%)';
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          className={`
            fixed z-50 px-2 py-1 text-xs text-[var(--aethel-text-primary)] bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)]
            rounded shadow-lg pointer-events-none
            animate-in fade-in-0 duration-100
            ${className}
          `}
          style={{
            left: position.x,
            top: position.y,
            transform: getTransform(),
          }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'default',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colors = {
    default: 'bg-[var(--aethel-primary)]',
    success: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
    warning: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    error: 'bg-[var(--aethel-error)]',
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full bg-[var(--aethel-border-primary)] rounded-full overflow-hidden ${heights[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full ${colors[variant]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-[var(--aethel-text-tertiary)] mt-1 text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SPINNER
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
        aria-label="Carregando"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// ============================================================================
// SELECT
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button type="button"
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--aethel-surface-quaternary)]'}
          focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        id={id}
      >
        <span className={selectedOption ? 'text-[var(--aethel-text-secondary)]' : 'text-[var(--aethel-text-quaternary)]'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`text-[var(--aethel-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)]
                     rounded shadow-lg z-50 py-1 max-h-60 overflow-auto"
          role="listbox"
          aria-labelledby={id}
        >
          {options.map(option => (
            <button type="button"
              key={option.value}
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
                ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'}
                ${option.value === value ? 'bg-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'}
              `}
              onClick={() => {
                if (option.disabled) return;
                onValueChange(option.value);
                setIsOpen(false);
              }}
              disabled={option.disabled}
              role="option"
              aria-selected={option.value === value}
            >
              {option.value === value && <Check size={14} className="text-[var(--aethel-info)]" />}
              <span className={option.value !== value ? 'ml-5' : ''}>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SWITCH
// ============================================================================

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  label,
  className = '',
}) => {
  const id = useId();

  const sizes = {
    sm: { track: 'w-7 h-4', thumb: 'w-3 h-3', translate: 'translate-x-3' },
    md: { track: 'w-9 h-5', thumb: 'w-4 h-4', translate: 'translate-x-4' },
  };

  return (
    <label
      className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      htmlFor={id}
    >
      <button type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={`
          ${sizes[size].track} rounded-full relative transition-colors
          ${checked ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-border-secondary)]'}
          focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_50%,transparent)]
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 ${sizes[size].thumb} rounded-full bg-[var(--aethel-surface-secondary)]
            shadow transition-transform
            ${checked ? sizes[size].translate : 'translate-x-0'}
          `}
        />
      </button>
      {label && <span className="text-sm text-[var(--aethel-text-secondary)]">{label}</span>}
    </label>
  );
};

// ============================================================================
// CHECKBOX
// ============================================================================

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  indeterminate = false,
  label,
  className = '',
}) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      htmlFor={id}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => !disabled && onCheckedChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            w-4 h-4 rounded border-2 transition-colors
            ${checked || indeterminate ? 'bg-[var(--aethel-primary)] border-[var(--aethel-primary)]' : 'border-[var(--aethel-border-secondary)]'}
            ${!disabled && !checked && !indeterminate ? 'hover:border-[var(--aethel-border-secondary)]' : ''}
          `}
        >
          {checked && (
            <Check size={12} className="text-[var(--aethel-text-primary)]" />
          )}
          {indeterminate && !checked && (
            <div className="absolute inset-1 bg-[var(--aethel-surface-secondary)] rounded-sm" />
          )}
        </div>
      </div>
      {label && <span className="text-sm text-[var(--aethel-text-secondary)]">{label}</span>}
    </label>
  );
};

// ============================================================================
// END OF DESIGN SYSTEM COMPONENTS
// ============================================================================
