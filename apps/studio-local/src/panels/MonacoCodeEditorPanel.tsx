import Editor, { type OnMount } from '@monaco-editor/react'
import { Code2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type FarmLanguage,
  resetLspFarmBridgeCache,
  wireMonacoToLspFarm,
} from '../ide/lspFarmMonacoBridge'

const SAMPLES: Record<FarmLanguage, string> = {
  typescript: `// Studio Local Monaco — L.13 lsp_farm hover/definition when binary live
export function greet(name: string): string {
  return \`Hello, \${name}\`
}

const message = greet('Aethel')
console.log(message)
`,
  rust: `// Studio Local Monaco — L.13 rust-analyzer when binary live
fn greet(name: &str) -> String {
    format!("Hello, {name}")
}

fn main() {
    println!("{}", greet("Aethel"));
}
`,
  python: `# Studio Local Monaco — L.13 Python LS when AETHEL_LSP_PYTHON / pyright live
def greet(name: str) -> str:
    return f"Hello, {name}"

print(greet("Aethel"))
`,
}

type FarmStatus = 'probing' | 'live' | 'held' | 'error'

/**
 * R21 — real Monaco chrome in Studio Local shell.
 * Wires L.13 Tauri lsp_farm for hover/definition; fail-closed when farm HELD.
 */
export function MonacoCodeEditorPanel() {
  const [language, setLanguage] = useState<FarmLanguage>('typescript')
  const [value, setValue] = useState(SAMPLES.typescript)
  const [farmStatus, setFarmStatus] = useState<FarmStatus>('probing')
  const [farmDetail, setFarmDetail] = useState('Probing lsp_farm…')
  const wireRef = useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    setValue(SAMPLES[language])
  }, [language])

  useEffect(() => {
    return () => {
      wireRef.current?.dispose()
      wireRef.current = null
      resetLspFarmBridgeCache()
    }
  }, [])

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      wireRef.current?.dispose()
      wireRef.current = null
      setFarmStatus('probing')
      setFarmDetail('Connecting L.13 lsp_farm…')

      const model = editor.getModel()
      if (!model) {
        setFarmStatus('error')
        setFarmDetail('Monaco model unavailable.')
        return
      }

      monaco.editor.setModelLanguage(model, language)

      void wireMonacoToLspFarm(monaco, model, language)
        .then((handle) => {
          wireRef.current = handle
          if (handle.farmLive) {
            setFarmStatus('live')
            setFarmDetail('L.13 farm live — hover / Go to Definition enabled.')
          } else {
            setFarmStatus('held')
            setFarmDetail(
              'L.13 farm HELD — language server binary missing or session dead (fail-closed; no fake tips).',
            )
          }
        })
        .catch((err) => {
          setFarmStatus('error')
          setFarmDetail(err instanceof Error ? err.message : 'lsp_farm wire failed.')
        })
    },
    [language],
  )

  const statusTone =
    farmStatus === 'live'
      ? 'text-[var(--aethel-success-light)]'
      : farmStatus === 'held'
        ? 'text-[var(--aethel-warning)]'
        : farmStatus === 'error'
          ? 'text-[var(--aethel-error-light)]'
          : 'text-[var(--aethel-text-tertiary)]'

  return (
    <section
      className="panel"
      style={{ display: 'flex', flexDirection: 'column', minHeight: 360, height: '100%' }}
      aria-label="Code editor"
    >
      <div className="panel-heading">
        <span className="inline-flex items-center gap-1.5">
          <Code2 className="h-3.5 w-3.5" />
          Monaco Editor
        </span>
        <strong className={statusTone} title={farmDetail}>
          {farmStatus === 'live' ? 'LSP LIVE' : farmStatus === 'held' ? 'LSP HELD' : farmStatus.toUpperCase()}
        </strong>
      </div>

      <div className="flex items-center gap-2 px-2 pb-2">
        {(['typescript', 'rust', 'python'] as FarmLanguage[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={[
              'rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors',
              language === lang
                ? 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-primary)]'
                : 'border-transparent text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
            ].join(' ')}
          >
            {lang}
          </button>
        ))}
      </div>

      <p className="px-2 pb-2 text-[11px] text-[var(--aethel-text-tertiary)]">{farmDetail}</p>

      <div style={{ flex: 1, minHeight: 240 }}>
        <Editor
          key={language}
          height="100%"
          language={language}
          value={value}
          theme="vs-dark"
          onChange={(next) => setValue(next ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
          loading={
            <div className="flex h-full items-center justify-center text-xs text-[var(--aethel-text-tertiary)]">
              Loading Monaco…
            </div>
          }
        />
      </div>
    </section>
  )
}
