import DashboardSidebar from '@/components/layout/DashboardSidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardSidebar />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
