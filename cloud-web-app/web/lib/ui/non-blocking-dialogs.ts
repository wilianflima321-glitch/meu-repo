'use client'

interface ConfirmDialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

interface PromptDialogOptions extends ConfirmDialogOptions {
  placeholder?: string
  defaultValue?: string
}

function createBackdrop() {
  const backdrop = document.createElement('div')
  backdrop.setAttribute('role', 'presentation')
  backdrop.style.position = 'fixed'
  backdrop.style.inset = '0'
  backdrop.style.zIndex = '9999'
  backdrop.style.display = 'flex'
  backdrop.style.alignItems = 'center'
  backdrop.style.justifyContent = 'center'
  backdrop.style.padding = '16px'
  backdrop.style.background = 'rgba(2, 6, 23, 0.72)'
  backdrop.style.backdropFilter = 'blur(4px)'
  return backdrop
}

function createDialogShell(title: string, message: string) {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.style.width = 'min(440px, calc(100vw - 32px))'
  dialog.style.background = '#09090b'
  dialog.style.border = '1px solid rgba(148, 163, 184, 0.2)'
  dialog.style.borderRadius = '10px'
  dialog.style.boxShadow = '0 24px 48px rgba(2, 6, 23, 0.45)'
  dialog.style.color = '#e4e4e7'
  dialog.style.padding = '16px'

  const heading = document.createElement('h3')
  heading.textContent = title
  heading.style.margin = '0 0 8px 0'
  heading.style.fontSize = '13px'
  heading.style.fontWeight = '600'

  const body = document.createElement('p')
  body.textContent = message
  body.style.margin = '0'
  body.style.fontSize = '12px'
  body.style.lineHeight = '1.45'
  body.style.color = '#cbd5e1'

  dialog.appendChild(heading)
  dialog.appendChild(body)

  return { dialog, body }
}

function createButton(label: string, variant: 'primary' | 'secondary') {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.style.height = '30px'
  button.style.padding = '0 12px'
  button.style.borderRadius = '6px'
  button.style.border = variant === 'primary' ? '1px solid #0284c7' : '1px solid rgba(148, 163, 184, 0.3)'
  button.style.background = variant === 'primary' ? '#0284c7' : 'rgba(15, 23, 42, 0.6)'
  button.style.color = '#f8fafc'
  button.style.fontSize = '12px'
  button.style.fontWeight = '500'
  button.style.cursor = 'pointer'
  button.style.transition = 'background 100ms ease, border-color 100ms ease'

  button.onmouseenter = () => {
    if (variant === 'primary') {
      button.style.background = '#0369a1'
      button.style.border = '1px solid #0369a1'
      return
    }
    button.style.background = 'rgba(30, 41, 59, 0.8)'
    button.style.border = '1px solid rgba(148, 163, 184, 0.4)'
  }

  button.onmouseleave = () => {
    if (variant === 'primary') {
      button.style.background = '#0284c7'
      button.style.border = '1px solid #0284c7'
      return
    }
    button.style.background = 'rgba(15, 23, 42, 0.6)'
    button.style.border = '1px solid rgba(148, 163, 184, 0.3)'
  }

  return button
}

export function openConfirmDialog({
  title = 'Confirmar ação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}: ConfirmDialogOptions): Promise<boolean> {
  if (typeof document === 'undefined') {
    return Promise.resolve(false)
  }

  return new Promise<boolean>((resolve) => {
    const backdrop = createBackdrop()
    const { dialog } = createDialogShell(title, message)
    const footer = document.createElement('div')
    footer.style.display = 'flex'
    footer.style.justifyContent = 'flex-end'
    footer.style.gap = '8px'
    footer.style.marginTop = '14px'

    const cancelButton = createButton(cancelText, 'secondary')
    const confirmButton = createButton(confirmText, 'primary')

    const cleanup = (result: boolean) => {
      document.removeEventListener('keydown', handleKeydown)
      backdrop.remove()
      resolve(result)
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(false)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        cleanup(true)
      }
    }

    cancelButton.onclick = () => cleanup(false)
    confirmButton.onclick = () => cleanup(true)
    backdrop.onclick = (event) => {
      if (event.target === backdrop) cleanup(false)
    }

    footer.append(cancelButton, confirmButton)
    dialog.appendChild(footer)
    backdrop.appendChild(dialog)
    document.body.appendChild(backdrop)
    document.addEventListener('keydown', handleKeydown)

    confirmButton.focus()
  })
}

export function openPromptDialog({
  title = 'Informar valor',
  message,
  placeholder,
  defaultValue = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}: PromptDialogOptions): Promise<string | null> {
  if (typeof document === 'undefined') {
    return Promise.resolve(null)
  }

  return new Promise<string | null>((resolve) => {
    const backdrop = createBackdrop()
    const { dialog } = createDialogShell(title, message)

    const input = document.createElement('input')
    input.type = 'text'
    input.value = defaultValue
    input.placeholder = placeholder ?? ''
    input.style.width = '100%'
    input.style.height = '32px'
    input.style.marginTop = '12px'
    input.style.borderRadius = '6px'
    input.style.border = '1px solid rgba(148, 163, 184, 0.35)'
    input.style.background = '#0f172a'
    input.style.color = '#e2e8f0'
    input.style.padding = '0 10px'
    input.style.fontSize = '12px'

    const footer = document.createElement('div')
    footer.style.display = 'flex'
    footer.style.justifyContent = 'flex-end'
    footer.style.gap = '8px'
    footer.style.marginTop = '14px'

    const cancelButton = createButton(cancelText, 'secondary')
    const confirmButton = createButton(confirmText, 'primary')

    const cleanup = (result: string | null) => {
      document.removeEventListener('keydown', handleKeydown)
      backdrop.remove()
      resolve(result)
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(null)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        cleanup(input.value.trim() || null)
      }
    }

    cancelButton.onclick = () => cleanup(null)
    confirmButton.onclick = () => cleanup(input.value.trim() || null)
    backdrop.onclick = (event) => {
      if (event.target === backdrop) cleanup(null)
    }

    footer.append(cancelButton, confirmButton)
    dialog.appendChild(input)
    dialog.appendChild(footer)
    backdrop.appendChild(dialog)
    document.body.appendChild(backdrop)
    document.addEventListener('keydown', handleKeydown)

    input.focus()
    input.select()
  })
}
