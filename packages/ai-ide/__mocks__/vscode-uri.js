// Minimal mock of vscode-uri's URI used by tests
class URI {
  constructor(value) {
    this._value = String(value || '');
    this.scheme = '';
    this.fragment = '';
    // Provide a minimal path object with `base` and `fsPath` used in tests
    const parts = this._value.split('/').filter(Boolean);
    const base = parts.length ? parts[parts.length - 1] : '';
    this.path = {
      base,
      fsPath: () => this._value,
      // provide small path helpers often expected by Theia code
      join: (...parts) => parts.filter(p => typeof p !== 'undefined' && p !== null).join('/'),
      basename: (p) => String(p || '').split('/').pop(),
      ext: (p) => { const b = String(p || '').split('/').pop(); const idx = b.lastIndexOf('.'); return idx >= 0 ? b.substring(idx) : ''; }
    };
  }
  static parse(v) { return new URI(v); }
  static fromString(s) { return new URI(s); }
  static file(p) { return new URI(p); }
  toString() { return this._value; }
  toUriString() { return this._value; }
  toStringWithFragment() { return this._value + (this.fragment ? '#' + this.fragment : ''); }
  isEqual(other) { return other && String(other.toString ? other.toString() : other) === this._value; }

  // Resolve a relative path against this URI and return a new URI instance
  resolve(relative) {
    if (!relative) return new URI(this._value);
  const base = this._value.replace(/\\/g, '/').replace(/\\/g, '/');
    const rel = String(relative || '').replace(/^\/+/, '');
    const joined = base.endsWith('/') ? (base + rel) : (base + '/' + rel);
    return new URI(joined);
  }

  // Return a lightweight object with toString() representing the path of `other`
  // relative to this URI. If not contained, return undefined.
  relative(other) {
    try {
      const otherStr = other && (other.toString ? other.toString() : String(other));
      if (!otherStr) return undefined;
  const me = this._value.replace(/\\/g, '/');
  const them = String(otherStr).replace(/\\/g, '/');
      if (them.startsWith(me)) {
        const rel = them.substring(me.length).replace(/^\/+/, '');
        return { toString: () => rel };
      }
      return undefined;
    }
    catch (e) { return undefined; }
  }
}

// Support both default and named imports
module.exports = URI;
module.exports.URI = URI;
// provide .default for ESM-interop code that reads `require(...).default`
module.exports.default = URI;
