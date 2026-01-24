'use client';

import Debugger from '../../components/Debugger';
import { PremiumLock } from '@/components/billing/PremiumLock';

/**
 * Debugger Page
 * NOTA: Esta é uma feature Pro - requer plano Pro ou superior
 */
export default function DebuggerPage() {
  return (
    <PremiumLock feature="debugger" requiredPlan="pro">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Debugger</h1>
        <Debugger />
      </div>
    </PremiumLock>
  );
}
