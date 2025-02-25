// app/(admin)/admin/users/layout.tsx
import { getCurrentUser } from "@/lib/apis/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/lib/types/auth";
import { AdminNavbar } from "../../components/admin-nav";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only allow admin access
  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar user={user} />
      <div className="container mx-auto px-4 py-8 flex gap-8 flex-col">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, control access, and monitor activity
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
