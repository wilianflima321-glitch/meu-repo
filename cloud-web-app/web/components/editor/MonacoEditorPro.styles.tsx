export function MonacoEditorDecorationsStyle() {
  return (
    <style jsx global>{`
        .editor-error-decoration {
          background-color: var(--aethel-editor-decoration-error-bg);
          text-decoration: wavy underline var(--aethel-error-light);
        }
        .editor-warning-decoration {
          background-color: var(--aethel-editor-decoration-warning-bg);
          text-decoration: wavy underline var(--aethel-warning-light);
        }
        .editor-info-decoration {
          text-decoration: underline dotted var(--aethel-primary-light);
        }
        .editor-hint-decoration {
          opacity: 0.7;
        }
        .git-glyph-added {
          background-color: var(--aethel-success-light);
          width: 3px !important;
          margin-left: 3px;
        }
        .git-glyph-modified {
          background-color: var(--aethel-warning-light);
          width: 3px !important;
          margin-left: 3px;
        }
        .git-glyph-deleted {
          background-color: var(--aethel-error-light);
          width: 3px !important;
          margin-left: 3px;
        }
        .aethel-inline-comment-glyph {
          position: relative;
        }
        .aethel-inline-comment-glyph::after {
          content: '';
          display: block;
          width: 9px;
          height: 9px;
          margin: 4px auto 0;
          border-radius: 999px;
          border: 1px solid var(--aethel-info-light);
          background: color-mix(in srgb, var(--aethel-info) 72%, transparent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--aethel-info) 16%, transparent);
        }
      `}</style>
  );
}
