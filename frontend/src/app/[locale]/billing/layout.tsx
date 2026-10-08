import DashboardSidebar from '@/components/layout/DashboardSidebar';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a0a' }}>
      <DashboardSidebar />
      <main className="flex-1 min-w-0 pt-12 md:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
