// app/(admin)/admin/projects/layout.tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AdminNavbar } from "../../components/admin-nav";
import { getCurrentUser } from "@/lib/apis/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/lib/types/auth";
import { PageDataProvider } from "@/lib/context/page-data-context";

export default async function AdminProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Prevent regular users from accessing admin dashboard
  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <PageDataProvider>
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar user={user} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumb />
        {children}
      </div>
    </div>
    </PageDataProvider>
  );
}
