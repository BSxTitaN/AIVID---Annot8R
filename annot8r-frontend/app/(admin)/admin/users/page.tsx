// app/(admin)/page.tsx
import { Toaster } from "sonner";
import { getCurrentUser } from "@/lib/apis/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/lib/types/auth";
import { AdminNavbar } from "../../components/admin-nav";
import UsersPage from "../../components/users/UsersPage";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Prevent regular users from accessing admin dashboard
  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100">
        <AdminNavbar user={user} />
        <main className="container mx-auto px-4 py-8">
          <Toaster richColors closeButton position="top-center" />
          <UsersPage />{" "}
        </main>
      </div>
    </>
  );
}
