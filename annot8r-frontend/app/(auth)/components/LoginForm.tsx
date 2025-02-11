// app/(auth)/components/login-form.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { toast } from "sonner";
import { FormFields } from "./FormFields";

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<boolean>(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      toast.error("Missing required fields", {
        description: "Please fill in both username and password",
      });
      setError(true);
      return;
    }

    startTransition(async () => {
      try {
        const credentials = {
          username,
          password,
          deviceInfo: {
            platform: navigator?.platform || "unknown",
            screenResolution:
              typeof window !== "undefined"
                ? `${window.screen.width}x${window.screen.height}`
                : "unknown",
            language: navigator?.language || "unknown",
            timezone:
              typeof Intl !== "undefined"
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : "UTC",
          },
        };

        await login(credentials);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";

        if (errorMessage.includes("Invalid credentials")) {
          toast.error("Login Failed", {
            description: "Incorrect username or password. Please try again.",
          });
        } else if (errorMessage.includes("locked")) {
          toast.error("Account Locked", {
            description:
              "Your account has been locked due to multiple failed attempts. Please contact support.",
          });
        } else if (errorMessage.includes("device")) {
          toast.error("New Device Detected", {
            description:
              "This login attempt is from a new device. Please verify your identity.",
          });
        } else {
          toast.error("Error", {
            description:
              "An unexpected error occurred. Please try again later.",
          });
        }

        setError(true);
        // Reset password field
        const passwordInput = form.elements.namedItem(
          "password"
        ) as HTMLInputElement;
        if (passwordInput) {
          passwordInput.value = "";
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormFields isPending={isPending} error={error} />

      <Button
        type="submit"
        className="w-full"
        disabled={isPending}
        variant={error ? "destructive" : "default"}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
