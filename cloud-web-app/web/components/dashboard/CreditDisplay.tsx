'use client';

import React from 'react';
import { Coins, Zap, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';

interface CreditData {
  available: number;
  limit: number;
  used: number;
}

async function fetchCredits(): Promise<CreditData> {
  const response = await fetch('/api/billing/credits');
  if (!response.ok) {
    throw new Error('Falha ao buscar créditos');
  }
  return response.json();
}

interface CreditDisplayProps {
  collapsed?: boolean;
}

export function CreditDisplay({ collapsed }: CreditDisplayProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-credits'],
    queryFn: fetchCredits,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 5, // Atualiza a cada 5 minutos
  });

  const credits = data?.available ?? 0;
  const maxCredits = data?.limit ?? 1;
  const percent = maxCredits > 0 ? (credits / maxCredits) * 100 : 0;

  if (collapsed) {
    return (
      <div className="p-4 border-t border-[var(--aethel-border-primary)] flex justify-center">
         <div className="relative group cursor-pointer">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-[var(--aethel-text-secondary)] animate-spin" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-[var(--aethel-error)]" />
            ) : (
              <>
                <Coins className="w-5 h-5 text-[var(--aethel-warning)]" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--aethel-warning-light)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--aethel-warning)]"></span>
                </span>
              </>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-secondary)] flex items-center gap-1">
          <Zap className="w-3 h-3 text-[var(--aethel-info)]" />
          Créditos Aethel
        </h4>
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-[var(--aethel-text-secondary)]" />
        ) : error ? (
          <span className="text-xs text-[var(--aethel-error)]">Erro</span>
        ) : (
          <span className="text-xs font-mono text-[var(--aethel-text-primary)] bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 rounded border border-[var(--aethel-border-secondary)]">
            {credits.toLocaleString('pt-BR')}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <Progress value={percent} className="h-1.5 bg-[var(--aethel-surface-tertiary)]" indicatorClassName="bg-gradient-to-r from-[var(--aethel-warning)] to-sky-600" />
        <div className="flex justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>{percent.toFixed(0)}% Utilizado</span>
          <span className="text-[var(--aethel-warning)]/80 hover:text-[var(--aethel-warning)] cursor-pointer transition-colors">Comprar Mais</span>
        </div>
      </div>
    </div>
  );
}
