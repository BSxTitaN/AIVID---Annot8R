// app/(auth)/components/form-fields.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, KeyRound } from "lucide-react";

interface FormFieldsProps {
  isPending: boolean;
  error: boolean;
}

export function FormFields({ isPending, error }: FormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            type="text"
            required
            placeholder="Enter your username"
            autoComplete="username"
            disabled={isPending}
            className={`pl-9 ${error ? 'border-destructive' : ''}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isPending}
            className={`pl-9 ${error ? 'border-destructive' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}