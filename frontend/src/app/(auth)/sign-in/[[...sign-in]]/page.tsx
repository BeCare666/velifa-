import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <SignIn />
    </main>
  );
}
