'use client';
import { useUser } from '@clerk/nextjs';
import AdminSidebar from '@/components/admin/AdminSidebar';

const ADMINS = ['webdesigngeekl544@gmail.com'];
const ADMIN_USER_IDS = ['user_3EhX9MGab0sdPNNiZiQDRwsOes0'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return (
    <div style={{minHeight:'100vh',background:'#080808',
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,borderRadius:'50%',
        border:'2px solid #D4AF37',borderTopColor:'transparent',
        animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#080808',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:16,color:'white'}}>
      <p>Connectez-vous pour accéder à l&apos;admin</p>
      <a href="/sign-in" style={{color:'#D4AF37'}}>Se connecter</a>
    </div>
  );

  console.log('EMAIL CLERK:', JSON.stringify(user.primaryEmailAddress?.emailAddress));
  console.log('USER ID CLERK:', JSON.stringify(user.id));
  console.log('ADMINS:', JSON.stringify(ADMINS));
  console.log('ADMIN_IDS:', JSON.stringify(ADMIN_USER_IDS));

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  const userId = user.id || '';
  const isAdmin = ADMINS.includes(email) || ADMIN_USER_IDS.includes(userId);

  if (!isAdmin) return (
    <div style={{minHeight:'100vh',background:'#080808',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:16,color:'white'}}>
      <p style={{fontSize:24}}>⛔ Accès refusé</p>
      <p style={{color:'rgba(255,255,255,0.5)'}}>{email}</p>
      <a href="/dashboard" style={{color:'#D4AF37'}}>
        Retour au dashboard
      </a>
    </div>
  );

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#0a0a0a'}}>
      <AdminSidebar />
      <main style={{flex:1,minWidth:0}}>{children}</main>
    </div>
  );
}
