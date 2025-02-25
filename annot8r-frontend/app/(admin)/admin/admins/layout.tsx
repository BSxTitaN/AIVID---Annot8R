// app/(admin)/admin/admins/layout.tsx
import { getCurrentUser } from "@/lib/apis/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/lib/types/auth";
import { AdminNavbar } from "../../components/admin-nav";

export default async function AdminsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only allow super admin access
  if (user.role !== UserRole.ADMIN || !user.isSuperAdmin) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar user={user} />
      <div className="container mx-auto px-4 py-8 flex gap-8 flex-col">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground">
            Manage system administrators and their permissions
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
