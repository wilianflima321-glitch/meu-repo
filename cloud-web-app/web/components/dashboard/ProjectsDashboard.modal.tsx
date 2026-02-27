import React, { useState } from 'react';
import { projectDashboardColors as colors, projectTypeColors, projectTypeIcons } from './ProjectsDashboard.constants';
import type { CreateProjectData, Project } from './ProjectsDashboard.types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateProjectData) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<Project['type']>('game');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), type, description: description.trim() });
    setName('');
    setType('game');
    setDescription('');
    onClose();
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '480px',
          maxWidth: '90vw',
          background: colors.surface,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          zIndex: 1001,
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: colors.text }}>
            Novo Projeto
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>
            Configure seu novo projeto de desenvolvimento.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.text }}
            >
              Nome do Projeto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu Projeto Incrível"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.text }}
            >
              Tipo de Projeto
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['game', 'web', 'api', 'library', 'other'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px',
                    background: type === option ? projectTypeColors[option] + '20' : colors.bg,
                    border: `1px solid ${type === option ? projectTypeColors[option] : colors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: type === option ? projectTypeColors[option] : colors.textMuted,
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {projectTypeIcons[option]}
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.text }}
            >
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição do projeto..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: '10px 20px',
                background: !name.trim() ? colors.textDim : colors.primary,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
