// components/users/CreateUserDialog.tsx
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/apis/config";

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateUserDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isOfficeUser, setIsOfficeUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchWithAuth("/auth/users", {
        method: "POST",
        body: JSON.stringify({ 
          username, 
          password,
          isOfficeUser 
        }),
      });

      toast.success("User created successfully");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    setPassword("");
    setIsOfficeUser(false);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create New User</AlertDialogTitle>
          <AlertDialogDescription>
            Enter details for the new user.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters long
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="office-user"
              checked={isOfficeUser}
              onCheckedChange={setIsOfficeUser}
            />
            <Label htmlFor="office-user">Office User</Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCreate}
            disabled={isSubmitting || !username || !password}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Creating..." : "Create User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}