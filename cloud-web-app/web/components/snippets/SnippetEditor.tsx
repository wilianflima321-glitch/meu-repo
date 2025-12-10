/**
 * Snippet Editor Component
 * Create and edit code snippets
 */

import React, { useState } from 'react';
import { getSnippetManager, Snippet } from '../../lib/snippets/snippet-manager';

interface SnippetEditorProps {
  snippet?: Snippet;
  language: string;
  onSave: (snippet: Snippet) => void;
  onCancel: () => void;
}

export const SnippetEditor: React.FC<SnippetEditorProps> = ({
  snippet,
  language,
  onSave,
  onCancel,
}) => {
  const [prefix, setPrefix] = useState(snippet?.prefix || '');
  const [description, setDescription] = useState(snippet?.description || '');
  const [body, setBody] = useState(
    Array.isArray(snippet?.body) ? snippet.body.join('\n') : snippet?.body || ''
  );

  const snippetManager = getSnippetManager();

  const handleSave = () => {
    const newSnippet: Snippet = {
      id: snippet?.id || `user-${Date.now()}`,
      prefix,
      body: body.split('\n'),
      description,
      scope: language,
    };

    if (snippet) {
      snippetManager.updateSnippet(language, snippet.id, newSnippet);
    } else {
      snippetManager.addSnippet(language, newSnippet);
    }

    onSave(newSnippet);
  };

  return (
    <div className="snippet-editor">
      <div className="editor-header">
        <h3>{snippet ? 'Edit Snippet' : 'New Snippet'}</h3>
      </div>

      <div className="editor-content">
        <div className="form-group">
          <label>Prefix (trigger)</label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g., log, func, class"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the snippet"
          />
        </div>

        <div className="form-group">
          <label>Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Snippet content&#10;Use $1, $2 for tab stops&#10;Use ${1:placeholder} for placeholders"
            rows={10}
          />
        </div>

        <div className="help-text">
          <strong>Variables:</strong> $TM_FILENAME, $TM_LINE_NUMBER, $CURRENT_YEAR, etc.
          <br />
          <strong>Tab stops:</strong> $1, $2, $0 (final position)
          <br />
          <strong>Placeholders:</strong> ${'{1:default}'}
        </div>
      </div>

      <div className="editor-footer">
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={!prefix || !body}
        >
          Save
        </button>
      </div>

      <style jsx>{`
        .snippet-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--panel-bg);
          color: var(--editor-fg);
        }

        .editor-header {
          padding: 16px;
          border-bottom: 1px solid var(--panel-border);
        }

        .editor-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .editor-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          background: var(--editor-bg);
          border: 1px solid var(--panel-border);
          color: var(--editor-fg);
          font-size: 13px;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', monospace;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--activitybar-activeBorder);
        }

        .help-text {
          font-size: 11px;
          opacity: 0.7;
          line-height: 1.6;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .editor-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid var(--panel-border);
        }

        .btn-cancel,
        .btn-save {
          padding: 8px 16px;
          border: none;
          border-radius: 3px;
          font-size: 13px;
          cursor: pointer;
        }

        .btn-cancel {
          background: var(--editor-bg);
          color: var(--editor-fg);
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-save {
          background: var(--activitybar-activeBorder);
          color: white;
        }

        .btn-save:hover {
          opacity: 0.9;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
