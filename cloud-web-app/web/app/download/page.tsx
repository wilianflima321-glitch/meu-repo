export default function DownloadPage() {
  const os = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isWindows = /Windows/i.test(os)
  const isMac = /Mac OS X|Macintosh/i.test(os)
  const isLinux = /Linux/i.test(os) && !/Android/i.test(os)

  return (
    <main className="aethel-container aethel-flex aethel-flex-col aethel-gap-6 aethel-p-6" aria-labelledby="download-title">
      <header className="aethel-card">
        <h1 id="download-title" style={{ fontSize: 'var(--aethel-font-size-3xl)', fontWeight: 700, marginBottom: 'var(--aethel-space-2)' }}>
          Download Aethel IDE
        </h1>
        <p style={{ color: 'var(--aethel-text-secondary)' }}>
          Professional IDE with integrated AI, Unreal Engine tools, and a modern developer experience.
        </p>
      </header>

      <section className="aethel-flex aethel-gap-6 aethel-flex-col" aria-label="Download options">
        <div className="aethel-card">
          <div className="aethel-flex aethel-gap-4 aethel-flex-col" role="list" aria-label="Operating system installers">
            <a
              role="listitem"
              className="aethel-button aethel-button-primary"
              href="/downloads/aethel-ide-windows.exe"
              aria-label="Download for Windows"
              download
            >
              Download for Windows {isWindows ? '· Recommended' : ''}
            </a>
            <a
              role="listitem"
              className="aethel-button aethel-button-secondary"
              href="/downloads/aethel-ide-mac.dmg"
              aria-label="Download for macOS"
              download
            >
              Download for macOS {isMac ? '· Recommended' : ''}
            </a>
            <a
              role="listitem"
              className="aethel-button aethel-button-secondary"
              href="/downloads/aethel-ide-linux.tar.gz"
              aria-label="Download for Linux"
              download
            >
              Download for Linux {isLinux ? '· Recommended' : ''}
            </a>
          </div>

          <div style={{ marginTop: 'var(--aethel-space-4)', color: 'var(--aethel-text-tertiary)', fontSize: 'var(--aethel-font-size-sm)' }}>
            <p>System requirements: Windows 10+, macOS 11+, Ubuntu 20.04+/equivalent.</p>
            <p>Installers are signed when available. Checksums: <a className="aethel-button aethel-button-ghost" href="/downloads/checksums.txt" rel="noopener">checksums.txt</a></p>
          </div>
        </div>
      </section>

      <section className="aethel-card" aria-labelledby="whats-included-heading">
        <h2 id="whats-included-heading" style={{ fontSize: 'var(--aethel-font-size-2xl)', fontWeight: 600, marginBottom: 'var(--aethel-space-3)' }}>
          What&apos;s Included
        </h2>
        <ul style={{ display: 'grid', gap: 'var(--aethel-space-2)' }}>
          <li>Modern IDE core with VS Code–class editing</li>
          <li>Unreal Engine tools and Blueprints integration</li>
          <li>Integrated AI chat and agent workflows</li>
          <li>Web mode and local projects</li>
          <li>Cloud AI connection for autonomy</li>
        </ul>
      </section>

      <section className="aethel-card" aria-labelledby="notes-heading">
        <h2 id="notes-heading" style={{ fontSize: 'var(--aethel-font-size-xl)', fontWeight: 600, marginBottom: 'var(--aethel-space-3)' }}>
          Release Notes & Verification
        </h2>
        <ul style={{ display: 'grid', gap: 'var(--aethel-space-2)' }}>
          <li><a className="aethel-button aethel-button-ghost" href="/downloads/RELEASE_NOTES.md">Release Notes</a></li>
          <li><a className="aethel-button aethel-button-ghost" href="/downloads/checksums.txt">Checksums (SHA-256)</a></li>
          <li><a className="aethel-button aethel-button-ghost" href="/downloads/PGP_KEYS.txt">PGP Public Keys</a></li>
        </ul>
        <p style={{ marginTop: 'var(--aethel-space-3)', color: 'var(--aethel-text-tertiary)', fontSize: 'var(--aethel-font-size-sm)' }}>
          Note: If downloads are not yet available, these links will return 404 until artifacts are published in <code>/public/downloads</code>.
        </p>
      </section>
    </main>
  )
}