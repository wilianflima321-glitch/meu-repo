import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aethel Terminal',
  description: 'Integrated multi-session terminal for the Aethel Engine workspace.',
};

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
