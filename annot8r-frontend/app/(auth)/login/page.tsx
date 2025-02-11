// app/(auth)/login/page.tsx
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Toaster } from "sonner";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Toaster richColors closeButton position="top-center" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-24 h-24">
              <Image
                src="/Image.png"
                alt="Annota8r Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
