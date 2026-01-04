class DisposableCollection {
  constructor(...disposables) {
    this.disposables = [];
    for (const d of disposables) {
      if (d && typeof d.dispose === 'function') this.disposables.push(d);
    }
  }
  push(disposable) {
    if (disposable && typeof disposable.dispose === 'function') {
      this.disposables.push(disposable);
    }
    return disposable;
  }
  dispose() {
    const items = this.disposables.splice(0);
    for (const d of items) {
      try { d.dispose(); } catch (_) {}
    }
  }
}

class Emitter {
  constructor() {
    this.listeners = [];
    this.event = (listener) => {
      this.listeners.push(listener);
      return { dispose: () => {
        const idx = this.listeners.indexOf(listener);
        if (idx >= 0) this.listeners.splice(idx, 1);
      }};
    };
  }
  fire(event) {
    for (const l of [...this.listeners]) {
      try { l(event); } catch (_) {}
    }
  }
  dispose() {
    this.listeners.length = 0;
  }
}

class URI {
  constructor(path) {
    this.path = String(path ?? '');
  }
  toString() {
    return this.path;
  }
}

const nls = {
  localize: (_id, defaultMessage, ..._args) => String(defaultMessage ?? '')
};

function generateUuid() {
  try {
    const crypto = require('crypto');
    if (crypto.randomUUID) return crypto.randomUUID();
    const buf = crypto.randomBytes(16);
    // RFC4122 v4-ish
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = buf.toString('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

module.exports = {
  DisposableCollection,
  Emitter,
  URI,
  nls,
  generateUuid,
  PreferenceScope: { Default: 0, User: 1, Workspace: 2, Folder: 3 }
};
