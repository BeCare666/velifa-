'use client';
import { useUser } from '@clerk/nextjs';
import AdminSidebar from '@/components/admin/AdminSidebar';

const ADMINS = ['webdesigngeekl544@gmail.com'];
const ADMIN_USER_IDS = ['user_3EhX9MGab0sdPNNiZiQDRwsOes0'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return (
    <div style={{minHeight:'100vh',background: 'var(--bg)',
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,borderRadius:'50%',
        border:'2px solid var(--accent)',borderTopColor:'transparent',
        animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return (
    <div style={{minHeight:'100vh',background: 'var(--bg)',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:16,color:'white'}}>
      <p>Connectez-vous pour accéder à l&apos;admin</p>
      <a href="/sign-in" style={{color:'var(--accent)'}}>Se connecter</a>
    </div>
  );

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  const userId = user.id || '';
  const isAdmin = ADMINS.includes(email) || ADMIN_USER_IDS.includes(userId);

  if (!isAdmin) return (
    <div style={{minHeight:'100vh',background: 'var(--bg)',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:16,color:'white'}}>
      <p style={{fontSize:24}}>⛔ Accès refusé</p>
      <p style={{color:'rgb(var(--accent-rgb)/0.5)'}}>{email}</p>
      <a href="/dashboard" style={{color:'var(--accent)'}}>
        Retour au dashboard
      </a>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden pt-14 md:pt-0">{children}</main>
    </div>
  );
}
