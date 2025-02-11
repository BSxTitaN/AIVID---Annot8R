// components/admins/CreateAdminDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/apis/config";

interface CreateAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAdminDialog({ isOpen, onClose, onSuccess }: CreateAdminDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth('/auth/create-admin', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          password 
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create admin');
      }

      toast.success('Admin created successfully');
      onSuccess();
      setUsername("");
      setPassword("");
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Admin</DialogTitle>
          <DialogDescription>
            Create a new admin account. Admins can manage users and view logs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min. 8 characters)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}