'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, TrendingUp } from 'lucide-react';
import { colors, dashboardStatDefinitions, quickActions, tint } from './ProjectsDashboard.constants';
import type { DashboardStats } from './ProjectsDashboard.types';

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  color?: string;
}> = ({ icon, label, value, trend, color = colors.primary }) => (
  <div
    style={{
      padding: '20px',
      background: colors.surface,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: tint(color, 15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {icon}
      </div>
      {trend !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: trend >= 0 ? colors.success : colors.error,
          }}
        >
          <TrendingUp size={14} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '24px', fontWeight: 600, color: colors.text }}>{value}</div>
      <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '2px' }}>{label}</div>
    </div>
  </div>
);

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  href: string;
}> = ({ icon, label, href }) => (
  <Link
    href={href}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      background: colors.surface,
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
      textDecoration: 'none',
      color: colors.text,
      transition: 'all 0.2s',
    }}
    onMouseEnter={(event) => {
      event.currentTarget.style.borderColor = colors.borderFocus;
      event.currentTarget.style.background = colors.surfaceHover;
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.borderColor = colors.border;
      event.currentTarget.style.background = colors.surface;
    }}
  >
    <div style={{ color: colors.primary }}>{icon}</div>
    <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
    <ChevronRight size={16} color={colors.textDim} style={{ marginLeft: 'auto' }} />
  </Link>
);

export const ProjectsDashboardHeader: React.FC<{
  onCreateProject: () => void;
}> = ({ onCreateProject }) => (
  <div style={{ maxWidth: '1400px', margin: '0 auto 32px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 600, color: colors.text }}>
          Meus Projetos
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>
          Gerencie seus projetos, acompanhe sinais de uso e entre no workbench mais rapido.
        </p>
      </div>

      <button
        type="button"
        aria-label="Abrir modal de novo projeto"
        onClick={onCreateProject}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: colors.primary,
          border: 'none',
          borderRadius: '10px',
          color: 'var(--aethel-text-primary)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(event) => (event.currentTarget.style.background = colors.primaryHover)}
        onMouseLeave={(event) => (event.currentTarget.style.background = colors.primary)}
      >
        <Plus size={18} />
        Novo Projeto
      </button>
    </div>
  </div>
);

export const ProjectsDashboardStatsGrid: React.FC<{
  stats: DashboardStats;
}> = ({ stats }) => (
  <div style={{ maxWidth: '1400px', margin: '0 auto 32px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {dashboardStatDefinitions.map((definition) => {
        const value = definition.key === 'aiTokensUsed'
          ? stats.aiTokensUsed.toLocaleString()
          : stats[definition.key];

        return (
          <StatCard
            key={definition.key}
            icon={definition.icon}
            label={definition.label}
            value={value}
            color={definition.color}
          />
        );
      })}
    </div>
  </div>
);

export const ProjectsDashboardQuickActions: React.FC = () => (
  <div style={{ maxWidth: '1400px', margin: '48px auto 0' }}>
    <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: colors.text }}>
      Acesso Rapido
    </h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {quickActions.map((action) => (
        <QuickActionCard key={action.href} icon={action.icon} label={action.label} href={action.href} />
      ))}
    </div>
  </div>
);
