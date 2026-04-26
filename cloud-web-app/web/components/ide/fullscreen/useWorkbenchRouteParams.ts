'use client';

import { useMemo } from 'react';

import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname';

export function useWorkbenchRouteParams() {
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  return {
    fileParam: searchParams.get('file'),
    projectIdParam: searchParams.get('projectId'),
    entryParam: searchParams.get('entry'),
    previewUrlParam: searchParams.get('previewUrl'),
  };
}

export default useWorkbenchRouteParams;
