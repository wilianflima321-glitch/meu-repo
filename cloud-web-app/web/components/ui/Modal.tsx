'use client'

import { Fragment, type ReactNode, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  footer?: ReactNode
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    },
    [closeOnEscape, onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          onClick={(e) => e.stopPropagation()}
          className={`
            ${sizeClasses[size]} w-full
            bg-gradient-to-b from-[color-mix(in_srgb,var(--aethel-surface-secondary)_95%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)]
            backdrop-blur-xl
            border border-[var(--aethel-border-primary)]/50
            rounded-2xl
            shadow-2xl shadow-black/50
            animate-in fade-in zoom-in-95 duration-200
            flex flex-col max-h-[90vh]
          `}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-xl font-semibold text-[var(--aethel-text-primary)] leading-tight"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1.5 text-sm text-[var(--aethel-text-tertiary)]"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button type="button"
                  onClick={onClose}
                  className="
                    flex-shrink-0 p-2 rounded-lg
                    text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]
                    bg-transparent hover:bg-[var(--aethel-surface-quaternary)]/50
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)]
                  "
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          {title && (
            <div className="mx-6 border-t border-[var(--aethel-border-primary)]/50" />
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <>
              <div className="mx-6 border-t border-[var(--aethel-border-primary)]/50" />
              <div className="px-6 py-4 flex items-center justify-end gap-3">
                {footer}
              </div>
            </>
          )}
        </div>
      </div>
    </Fragment>
  )
}

/* Confirmation Modal Variant */
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
  loading = false,
}: ConfirmModalProps) {
  const confirmVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'primary'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <button type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-[var(--aethel-text-secondary)]">{message}</p>
    </Modal>
  )
}

export default Modal
