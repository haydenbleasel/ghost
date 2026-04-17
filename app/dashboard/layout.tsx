import { Navbar } from './_components/navbar';
import { requireUser } from '@/lib/session';
import type { ReactNode } from 'react';

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  await requireUser();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
};

export default DashboardLayout;
