/**
 * Status Bar Component
 * Displays status information and quick selectors
 */

import React, { useState, useEffect } from 'react';
import { getStatusBarManager, StatusBarItem } from '../../lib/statusbar/statusbar-manager';

export const StatusBar: React.FC = () => {
  const [leftItems, setLeftItems] = useState<StatusBarItem[]>([]);
  const [rightItems, setRightItems] = useState<StatusBarItem[]>([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showEncodingSelector, setShowEncodingSelector] = useState(false);

  const statusBarManager = getStatusBarManager();

  // Load status bar items
  useEffect(() => {
    const updateItems = () => {
      setLeftItems(statusBarManager.getItemsByAlignment('left'));
      setRightItems(statusBarManager.getItemsByAlignment('right'));
    };

    updateItems();

    const unsubscribe = statusBarManager.onChange(updateItems);
    return unsubscribe;
  }, [statusBarManager]);

  // Handle item click
  const handleItemClick = (item: StatusBarItem) => {
    if (item.command) {
      // Execute command
      console.log(`Execute command: ${item.command}`);
      
      // Show selectors for specific items
      if (item.id === 'language') {
        setShowLanguageSelector(true);
      } else if (item.id === 'encoding') {
        setShowEncodingSelector(true);
      }
    }
  };

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        {leftItems.map((item) => (
          <div
            key={item.id}
            className="status-bar-item"
            onClick={() => handleItemClick(item)}
            title={item.tooltip}
            style={{
              backgroundColor: item.backgroundColor,
              color: item.color,
            }}
          >
            {item.text}
          </div>
        ))}
      </div>

      <div className="status-bar-right">
        {rightItems.map((item) => (
          <div
            key={item.id}
            className="status-bar-item"
            onClick={() => handleItemClick(item)}
            title={item.tooltip}
            style={{
              backgroundColor: item.backgroundColor,
              color: item.color,
            }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {showLanguageSelector && (
        <LanguageSelector
          onClose={() => setShowLanguageSelector(false)}
          onSelect={(languageId, languageName) => {
            statusBarManager.updateLanguage(languageId, languageName);
            setShowLanguageSelector(false);
          }}
        />
      )}

      {showEncodingSelector && (
        <EncodingSelector
          onClose={() => setShowEncodingSelector(false)}
          onSelect={(encoding) => {
            statusBarManager.updateEncoding(encoding);
            setShowEncodingSelector(false);
          }}
        />
      )}

      <style jsx>{`
        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 24px;
          background: var(--statusbar-bg);
          color: var(--statusbar-fg);
          font-size: 12px;
          padding: 0 8px;
          border-top: 1px solid var(--panel-border);
        }

        .status-bar-left,
        .status-bar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-bar-item {
          padding: 0 8px;
          cursor: pointer;
          white-space: nowrap;
          height: 100%;
          display: flex;
          align-items: center;
        }

        .status-bar-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

// Language Selector Component
interface LanguageSelectorProps {
  onClose: () => void;
  onSelect: (languageId: string, languageName: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onClose, onSelect }) => {
  const statusBarManager = getStatusBarManager();
  const languages = statusBarManager.getAvailableLanguages();

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div className="selector-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="selector-dialog">
        <div className="selector-header">Select Language Mode</div>
        <div className="selector-list">
          {languages.map((lang) => (
            <div
              key={lang.id}
              className="selector-item"
              onClick={() => onSelect(lang.id, lang.name)}
            >
              <div className="selector-item-name">{lang.name}</div>
              <div className="selector-item-detail">
                {lang.extensions.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .selector-overlay {
          position: fixed;
          bottom: 24px;
          right: 20px;
          z-index: 10000;
        }

        .selector-dialog {
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          width: 300px;
          max-height: 400px;
          display: flex;
          flex-direction: column;
        }

        .selector-header {
          padding: 8px 12px;
          font-weight: 600;
          border-bottom: 1px solid var(--panel-border);
        }

        .selector-list {
          overflow-y: auto;
          max-height: 350px;
        }

        .selector-item {
          padding: 8px 12px;
          cursor: pointer;
        }

        .selector-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .selector-item-name {
          font-size: 13px;
          margin-bottom: 2px;
        }

        .selector-item-detail {
          font-size: 11px;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

// Encoding Selector Component
interface EncodingSelectorProps {
  onClose: () => void;
  onSelect: (encoding: string) => void;
}

const EncodingSelector: React.FC<EncodingSelectorProps> = ({ onClose, onSelect }) => {
  const statusBarManager = getStatusBarManager();
  const encodings = statusBarManager.getAvailableEncodings();

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div className="selector-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="selector-dialog">
        <div className="selector-header">Select Encoding</div>
        <div className="selector-list">
          {encodings.map((enc) => (
            <div
              key={enc.id}
              className="selector-item"
              onClick={() => onSelect(enc.name)}
            >
              {enc.name}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .selector-overlay {
          position: fixed;
          bottom: 24px;
          right: 20px;
          z-index: 10000;
        }

        .selector-dialog {
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          width: 200px;
          max-height: 300px;
          display: flex;
          flex-direction: column;
        }

        .selector-header {
          padding: 8px 12px;
          font-weight: 600;
          border-bottom: 1px solid var(--panel-border);
        }

        .selector-list {
          overflow-y: auto;
        }

        .selector-item {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
        }

        .selector-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};
