import { Suspense } from 'react';
import TeamPageClient from '@/components/team/TeamPageClient';

export const metadata = {
  title: 'Team — Aethel Engine',
  description: 'Project collaborators and roles.',
};

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-[var(--aethel-text-tertiary)]" role="status">
          Loading team...
        </div>
      }
    >
      <TeamPageClient />
    </Suspense>
  );
}
