// app/(dashboard)/layout.tsx
import { PageDataProvider } from "@/lib/context/page-data-context";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
        <PageDataProvider>{children}</PageDataProvider>
  );
}
