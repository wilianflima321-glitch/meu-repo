'use client';

import React, { useMemo } from 'react';
import { DeployButton } from '../../../web/components/deploy/DeployButton';
import { useBrowserSearch } from '../../../web/lib/navigation/use-browser-pathname';

interface DeployTopbarActionProps {
  projectName: string;
}

export function DeployTopbarAction({ projectName }: DeployTopbarActionProps) {
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const projectIdParam = searchParams.get('projectId')?.trim();

  return (
    <DeployButton
      projectName={projectIdParam || projectName}
      projectId={projectIdParam}
      density="compact"
    />
  );
}

export default DeployTopbarAction;
