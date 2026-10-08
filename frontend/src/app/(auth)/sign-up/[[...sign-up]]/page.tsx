import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <SignUp />
    </main>
  );
}
