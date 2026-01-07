'use client';

import React from 'react';
import { Coins, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CreditDisplayProps {
  collapsed?: boolean;
}

export function CreditDisplay({ collapsed }: CreditDisplayProps) {
  // TODO: Connect to Real Metering API (lib/metering.ts)
  const credits = 4500;
  const maxCredits = 5000;
  const percent = (credits / maxCredits) * 100;

  if (collapsed) {
    return (
      <div className="p-4 border-t border-slate-800 flex justify-center">
         <div className="relative group cursor-pointer">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
         </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Zap className="w-3 h-3 text-indigo-400" />
          Aethel Credits
        </h4>
        <span className="text-xs font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
          {credits.toLocaleString()}
        </span>
      </div>
      
      <div className="space-y-1">
        <Progress value={percent} className="h-1.5 bg-slate-800" indicatorClassName="bg-gradient-to-r from-amber-500 to-indigo-600" />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>{percent.toFixed(0)}% Utilizado</span>
          <span className="text-amber-500/80 hover:text-amber-400 cursor-pointer transition-colors">Comprar Mais</span>
        </div>
      </div>
    </div>
  );
}
