'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';

// Dynamic import
const NewProjectWizard = dynamic(
  () => import('@/components/dashboard/NewProjectWizard').then(mod => mod.NewProjectWizard),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Project Wizard...</div>
        </div>
      </div>
    ),
  }
);

export default function NewProjectPage() {
  const router = useRouter();

  const handleComplete = (projectId: string) => {
    console.log('Project created:', projectId);
    // Navigate to level editor with the new project
    router.push(`/level-editor?project=${projectId}`);
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black"><span className="text-white">Loading...</span></div>}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <NewProjectWizard onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    </Suspense>
  );
}
