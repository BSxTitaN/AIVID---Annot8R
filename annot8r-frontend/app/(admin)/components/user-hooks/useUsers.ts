import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/apis/config';
import { toast } from 'sonner';
import { SortConfig, UserInfo, UserStatus } from '@/lib/types/users';

export function useUsers() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchUsers = useCallback(async (
    page: number,
    searchQuery: string,
    selectedStatus: UserStatus,
    sort: SortConfig,
    showLoading = true
  ) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortField: sort.field,
        sortOrder: sort.order,
      });

      if (searchQuery) {
        params.append('query', searchQuery);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetchWithAuth(`/auth/users?${params}`);
      
      // Log the response for debugging
      console.log('Users response:', response);
      
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
      setLastRefreshed(new Date());
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    currentPage,
    totalPages,
    lastRefreshed,
    setCurrentPage,
    fetchUsers,
  };
}