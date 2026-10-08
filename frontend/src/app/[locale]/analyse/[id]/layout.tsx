'use client';

import { useAuth } from '@clerk/nextjs';
import DashboardSidebar from '@/components/layout/DashboardSidebar';

/**
 * Le rapport est public (lien partagé à un prospect) : la barre latérale du tableau de bord
 * n'est affichée qu'aux utilisateurs connectés.
 */
export default function AnalyseLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a0a' }}>
      {isSignedIn && <DashboardSidebar />}
      <main className={`flex-1 min-w-0 overflow-x-hidden ${isSignedIn ? 'pt-12 md:pt-0' : ''}`}>
        {children}
      </main>
    </div>
  );
}
