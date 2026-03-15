import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Edit, Trash2, Search, Shield, UserPlus, Briefcase, Settings2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { userApi, sessionApi, locationApi } from '@/lib/api';

export default function Users() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    position: '',
    hire_date: '',
    salary: '',
    address: '',
    location_id: '',
    location_ids: [] as number[],
    is_active: 1,
    commission_rate: 0,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: locationMode } = useQuery({
    queryKey: ['locationMode'],
    queryFn: async () => {
      const response = await sessionApi.getLocationMode();
      return response.data.mode || 'automatic';
    },
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const response = await sessionApi.getAllSessions();
      return response.data.data || [];
    },
  });

  const updateModeMutation = useMutation({
    mutationFn: sessionApi.setLocationMode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationMode'] });
      toast.success('Location mode updated');
    },
  });

  const setSessionMutation = useMutation({
    mutationFn: ({ userId, locationId }: { userId: number; locationId: number }) =>
      sessionApi.adminSetSession(userId, locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      toast.success('User session updated for today');
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: async () => {
      try {
        const response = await userApi.getAll({ search: searchTerm });
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role || 'user',
        phone: user.phone || '',
        position: user.position || '',
        hire_date: user.hire_date || '',
        salary: user.salary || '',
        address: user.address || '',
        location_id: user.location_id || '',
        location_ids: user.location_ids || [],
        is_active: user.is_active,
        commission_rate: user.commission_rate || 0,
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'user',
        phone: '',
        position: '',
        hire_date: '',
        salary: '',
        address: '',
        location_id: '',
        location_ids: [],
        is_active: 1,
        commission_rate: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    const submitData = { ...formData };
    if (editingUser && !formData.password) {
      delete (submitData as any).password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(id);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sales':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'employee':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                User Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and their roles</p>
            </div>
            <Button onClick={() => handleOpenDialog()} size="lg" className="shadow-lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Add User
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              Location Mode Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground italic">
                Control how sales reps select their operating location.
              </p>
              <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-slate-700 shadow-sm">
                <Button
                  variant={locationMode === 'automatic' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => updateModeMutation.mutate('automatic')}
                >
                  User Choice
                </Button>
                <Button
                  variant={locationMode === 'manual' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => updateModeMutation.mutate('manual')}
                >
                  Admin Set
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {locationMode === 'automatic'
                  ? '✓ Sales reps choose their location daily on the mobile app'
                  : '✓ Admins must assign today\'s location for each sales rep'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Today's Session</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>{user.position || '-'}</TableCell>
                      <TableCell>
                        {user.locations && user.locations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.locations.map((loc: any) => (
                              <span key={loc.id} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                {loc.name}
                              </span>
                            ))}
                          </div>
                        ) : user.location_name ? (
                          <span className="text-sm text-blue-600">{user.location_name}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'sales' || user.role === 'employee' ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const session = activeSessions?.find((s: any) => s.user_id === user.id);
                              if (session) {
                                return (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 lg:pr-3 py-0.5">
                                    <Clock className="h-3 w-3" />
                                    <span className="max-w-[80px] truncate">{session.location?.name}</span>
                                  </Badge>
                                );
                              }
                              return (
                                <span className="text-xs text-gray-400 italic">No session</span>
                              );
                            })()}
                            {locationMode === 'manual' && (
                              <select
                                className="text-[10px] border rounded px-1 h-6 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setSessionMutation.mutate({
                                      userId: user.id,
                                      locationId: Number(e.target.value),
                                    });
                                  }
                                }}
                              >
                                <option value="">Assign Today</option>
                                {locations?.map((l: any) => (
                                  <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.role === 'sales' && user.commission_rate ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400">
                            <Briefcase className="h-3.5 w-3.5" />
                            {user.commission_rate}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${user.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(user)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="employee">Employee Info</TabsTrigger>
                <TabsTrigger value="assignment">Location Assignment</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="user">User - Basic access</option>
                    <option value="employee">Employee - Staff member</option>
                    <option value="sales">Sales - Can create invoices and manage customers</option>
                    <option value="manager">Manager - Full access except user management</option>
                    <option value="admin">Admin - Full system access</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {formData.role === 'admin' && '✓ Full access to all features including user management'}
                    {formData.role === 'manager' && '✓ Can manage products, stock, invoices, and view reports'}
                    {formData.role === 'sales' && '✓ Can create invoices, manage customers, and access POS'}
                    {formData.role === 'employee' && '✓ Employee with van assignment for POS access'}
                    {formData.role === 'user' && '✓ View-only access to products and basic features'}
                  </p>
                </div>

                {formData.role === 'sales' && (
                  <div className="space-y-2">
                    <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                      className="h-11"
                      placeholder="e.g. 5.5"
                    />
                    <p className="text-xs text-muted-foreground">Percentage of sales value given as commission/profit.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <select
                    id="is_active"
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: Number(e.target.value) })}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </TabsContent>

              <TabsContent value="employee" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-11"
                      placeholder="e.g. +1234567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position/Title</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="h-11"
                      placeholder="e.g. Sales Representative"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="h-11"
                      placeholder="e.g. 50000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Full address"
                  />
                </div>
              </TabsContent>

              <TabsContent value="assignment" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="location_id">Primary Location</Label>
                  <select
                    id="location_id"
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">No primary location</option>
                    {locations?.map((location: any) => (
                      <option key={location.id} value={location.id}>
                        {location.name} ({location.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    The primary/default location for this user.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Locations (Multi-Select)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select all locations this user can operate from. In the mobile app, they can switch between these.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {locations?.map((location: any) => {
                      const isChecked = formData.location_ids.includes(location.id);
                      return (
                        <label
                          key={location.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                              : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...formData.location_ids, location.id]
                                : formData.location_ids.filter((id: number) => id !== location.id);
                              setFormData({ ...formData, location_ids: newIds });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="text-sm font-medium">{location.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{location.type}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {formData.location_ids.length > 0 && (
                    <p className="text-xs text-blue-600 font-medium">
                      {formData.location_ids.length} location(s) selected
                    </p>
                  )}
                </div>

                {formData.location_ids.length > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Multi-Location Assignment</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          This user can work across {formData.location_ids.length} location(s). In the mobile app, they will select which location to operate from each day.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
