'use client';

/**
 * Export System Page
 * Sistema de exportação para múltiplas plataformas
 */

import React, { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const ExportDialog = dynamic(
  () => import('@/components/export/ExportSystem'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white">Carregando Export System...</div>
        </div>
      </div>
    )
  }
);

export default function ExportPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (settings: unknown) => {
    setIsExporting(true);
    console.log('Exporting with settings:', settings);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      alert('Export completed!');
    }, 2000);
  };

  const handleClose = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-white">Carregando...</div>
        </div>
      }>
        <ExportDialog 
          open={true}
          onClose={handleClose}
          onExport={handleExport}
          projectDuration={300}
          projectResolution={{ width: 1920, height: 1080 }}
        />
      </Suspense>
    </div>
  );
}
