'use client';

import { createContext, useContext } from 'react';
import type { AethelContextValue } from './aethel-provider.contracts';

export const AethelContext = createContext<AethelContextValue | null>(null);

export function useAethel() {
  const context = useContext(AethelContext);
  if (!context) {
    throw new Error('useAethel must be used within AethelProvider');
  }
  return context;
}
