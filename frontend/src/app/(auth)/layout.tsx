import Providers from '@/components/Providers';
import { fontVariables } from '../fonts';

/** Pages de connexion Clerk (hors routage par langue). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" className={fontVariables}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
