import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/apis/config';
import { toast } from 'sonner';

export function useUserActions(onSuccess: () => void) {
  const resetPassword = useCallback(async (username: string, newPassword: string) => {
    try {
      await fetchWithAuth(`/auth/users/${username}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      toast.success('Password reset successfully');
      onSuccess();
    } catch {
      toast.error('Failed to reset password');
    }
  }, [onSuccess]);

  const lockUser = useCallback(async (username: string, reason: string) => {
    try {
      await fetchWithAuth('/auth/lock-user', {
        method: 'POST',
        body: JSON.stringify({ username, reason }),
      });
      toast.success('User locked successfully');
      onSuccess();
    } catch {
      toast.error('Failed to lock user');
    }
  }, [onSuccess]);

  const unlockUser = useCallback(async (username: string) => {
    try {
      await fetchWithAuth('/auth/unlock-user', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      toast.success('User unlocked successfully');
      onSuccess();
    } catch {
      toast.error('Failed to unlock user');
    }
  }, [onSuccess]);

  const forceLogout = useCallback(async (username: string) => {
    try {
      await fetchWithAuth(`/auth/users/${username}/logout`, {
        method: 'POST',
      });
      toast.success('User logged out successfully');
      onSuccess();
    } catch {
      toast.error('Failed to logout user');
    }
  }, [onSuccess]);

  const deleteUser = useCallback(async (username: string) => {
    try {
      const response = await fetchWithAuth(`/auth/users/${username}/delete`, {
        method: 'POST',  // Changed from DELETE to POST
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user');
      }
      
      toast.success('User deleted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      throw error;
    }
  }, [onSuccess]);

  const toggleOfficeUser = useCallback(async (username: string, isOfficeUser: boolean) => {
    try {
      await fetchWithAuth(`/auth/users/${username}/office-status`, {
        method: 'POST',
        body: JSON.stringify({ isOfficeUser })
      });
      
      toast.success('Office user status updated');
      onSuccess();
    } catch (error) {
      toast.error('Failed to update office user status');
      throw error;
    }
  }, [onSuccess]);

  return {
    resetPassword,
    lockUser,
    unlockUser,
    forceLogout,
    deleteUser,
    toggleOfficeUser
  };
}