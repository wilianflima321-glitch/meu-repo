'use client';

import { useMemo } from 'react';

import { useBrowserSearch } from '../../../web/lib/navigation/use-browser-pathname';

export function useWorkbenchRouteParams() {
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  return {
    fileParam: searchParams.get('file'),
    projectIdParam: searchParams.get('projectId'),
    entryParam: searchParams.get('entry'),
    sourceParam: searchParams.get('source'),
    missionParam: searchParams.get('mission'),
    previewUrlParam: searchParams.get('previewUrl'),
  };
}

export default useWorkbenchRouteParams;
