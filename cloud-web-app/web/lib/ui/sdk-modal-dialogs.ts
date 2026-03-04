interface ModalDialogOptions {
  title?: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export function openSdkModalDialog({
  title = 'Confirm action',
  message,
  detail,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
}: ModalDialogOptions): Promise<boolean> {
  if (typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      padding: 16px;
      backdrop-filter: blur(4px);
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      width: min(440px, calc(100vw - 32px));
      background: #09090b;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 10px;
      box-shadow: 0 24px 48px rgba(2, 6, 23, 0.45);
      color: #e4e4e7;
      padding: 16px;
    `;

    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.cssText = 'margin:0 0 8px 0;font-size:13px;font-weight:600;';
    dialog.appendChild(heading);

    const body = document.createElement('p');
    body.textContent = detail ? `${message}\n\n${detail}` : message;
    body.style.cssText = 'margin:0;font-size:12px;line-height:1.45;color:#cbd5e1;white-space:pre-wrap;';
    dialog.appendChild(body);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:14px;';

    const close = (result: boolean) => {
      document.removeEventListener('keydown', handleKeyDown);
      backdrop.remove();
      resolve(result);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        close(true);
      }
    };

    const makeButton = (label: string, primary: boolean) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = `
        height: 30px;
        padding: 0 12px;
        border-radius: 6px;
        border: 1px solid ${primary ? '#0284c7' : 'rgba(148, 163, 184, 0.3)'};
        background: ${primary ? '#0284c7' : 'rgba(15, 23, 42, 0.6)'};
        color: #f8fafc;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      `;
      return button;
    };

    if (showCancel) {
      const cancelButton = makeButton(cancelText, false);
      cancelButton.onclick = () => close(false);
      footer.appendChild(cancelButton);
    }

    const confirmButton = makeButton(confirmText, true);
    confirmButton.onclick = () => close(true);
    footer.appendChild(confirmButton);

    backdrop.onclick = (event) => {
      if (event.target === backdrop) close(false);
    };

    dialog.appendChild(footer);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', handleKeyDown);
    confirmButton.focus();
  });
}

export function openSdkModalPrompt(message: string, defaultValue = '', title = 'Input'): Promise<string | undefined> {
  if (typeof document === 'undefined') {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      padding: 16px;
      backdrop-filter: blur(4px);
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      width: min(440px, calc(100vw - 32px));
      background: #09090b;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 10px;
      box-shadow: 0 24px 48px rgba(2, 6, 23, 0.45);
      color: #e4e4e7;
      padding: 16px;
    `;

    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.cssText = 'margin:0 0 8px 0;font-size:13px;font-weight:600;';
    dialog.appendChild(heading);

    const body = document.createElement('p');
    body.textContent = message;
    body.style.cssText = 'margin:0;font-size:12px;line-height:1.45;color:#cbd5e1;';
    dialog.appendChild(body);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    input.style.cssText = `
      width: 100%;
      height: 32px;
      margin-top: 12px;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: #0f172a;
      color: #e2e8f0;
      padding: 0 10px;
      font-size: 12px;
    `;
    dialog.appendChild(input);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:14px;';

    const close = (result: string | undefined) => {
      document.removeEventListener('keydown', handleKeyDown);
      backdrop.remove();
      resolve(result);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(undefined);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = input.value.trim();
        close(value ? value : undefined);
      }
    };

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      height: 30px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: rgba(15, 23, 42, 0.6);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    `;
    cancelButton.onclick = () => close(undefined);

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.textContent = 'Confirm';
    confirmButton.style.cssText = `
      height: 30px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid #0284c7;
      background: #0284c7;
      color: #f8fafc;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    `;
    confirmButton.onclick = () => {
      const value = input.value.trim();
      close(value ? value : undefined);
    };

    footer.append(cancelButton, confirmButton);
    dialog.appendChild(footer);

    backdrop.onclick = (event) => {
      if (event.target === backdrop) close(undefined);
    };

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', handleKeyDown);
    input.focus();
    input.select();
  });
}
