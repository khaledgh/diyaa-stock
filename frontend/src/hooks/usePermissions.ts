import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const canView = (page: string): boolean => {
    if (!user || !user.navigation) return false;
    return user.navigation.includes(page);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isManager = (): boolean => {
    return user?.role === 'manager';
  };

  const isSales = (): boolean => {
    return user?.role === 'sales';
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  return {
    hasPermission,
    canView,
    isAdmin,
    isManager,
    isSales,
    hasRole,
    user,
  };
}
