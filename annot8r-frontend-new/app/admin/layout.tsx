// app/(admin)/admin/layout.tsx
import { ReactNode } from 'react';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { AdminTopNav } from '@/components/admin/admin-top-nav';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Verify admin authentication before rendering
  const { user } = await requireAdmin();
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <AdminTopNav user={user} />
      <main className="flex-grow pb-12">
        {children}
      </main>
    </div>
  );
}