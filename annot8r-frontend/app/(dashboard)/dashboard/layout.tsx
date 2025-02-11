// app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/apis/auth";
import { UserRole } from "@/lib/types/auth";
import { PageDataProvider } from "@/lib/context/page-data-context";
import { Navbar } from "../components/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Prevent admins from accessing user dashboard
  if (user.role === UserRole.ADMIN) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} />
      <main>
        <PageDataProvider>{children}</PageDataProvider>
      </main>
    </div>
  );
}
