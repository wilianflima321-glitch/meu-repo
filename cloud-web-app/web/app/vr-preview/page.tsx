'use client';

import VRPreview from '../../components/VRPreview';
import { PremiumLock } from '@/components/billing/PremiumLock';

/**
 * VR Preview Page
 * NOTA: Esta é uma feature Studio - requer plano Studio ou superior
 */
export default function VRPreviewPage() {
  return (
    <PremiumLock feature="advanced-analytics" requiredPlan="studio">
      <div className='h-screen'>
        <VRPreview />
      </div>
    </PremiumLock>
  );
}