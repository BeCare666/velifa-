'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { SubscriptionProvider } from '@/context/SubscriptionContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </ClerkProvider>
  );
}
