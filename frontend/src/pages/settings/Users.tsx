import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit, Trash2, Shield, UserPlus, Briefcase, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColumnDef, DataTable, FilterSelect } from '@/components/data-table/DataTable';
import { ActiveBadge, BadgeTone, Page, PageHeader, RowAction, RowActions, StatusBadge } from '@/components/layout/Page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { userApi, sessionApi, locationApi } from '@/lib/api';
import { DatePicker } from '@/components/ui/date-picker';

export default function Users() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    location_mode: 'manual',
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
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await userApi.getAll();
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
        location_mode: user.location_mode || 'manual',
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
        location_mode: 'manual',
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

  const roleTone: Record<string, BadgeTone> = { admin: 'violet', manager: 'blue', sales: 'green', employee: 'amber' };
  const roles = Array.from(new Set((users || []).map((u: any) => u.role).filter(Boolean))) as string[];
  const filteredUsers = (users || []).filter((u: any) => (!roleFilter || u.role === roleFilter) && (!statusFilter || (statusFilter === 'active' ? u.is_active : !u.is_active)));
  const sessionFor = (userId: number) => activeSessions?.find((sess: any) => sess.user_id === userId);

  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Name',
      alwaysVisible: true,
      value: (u) => u.full_name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {(u.full_name || u.email || '?').split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'phone', header: 'Phone', defaultHidden: true, value: (u) => u.phone, cell: (u) => <span className="text-muted-foreground" dir="ltr">{u.phone || '—'}</span> },
    { id: 'position', header: 'Position', defaultHidden: true, value: (u) => u.position, cell: (u) => <span className="text-muted-foreground">{u.position || '—'}</span> },
    { id: 'role', header: 'Role', value: (u) => u.role, cell: (u) => <StatusBadge tone={roleTone[u.role] || 'gray'} dot={false}>{u.role}</StatusBadge> },
    {
      id: 'locations',
      header: 'Locations',
      sortable: false,
      value: (u) => (u.locations || []).map((l: any) => l.name).join(', ') || u.location_name,
      cell: (u) =>
        u.locations?.length ? (
          <div className="flex flex-wrap gap-1">
            {u.locations.map((l: any) => (
              <span key={l.id} className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.name}</span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">{u.location_name || '—'}</span>
        ),
    },
    {
      id: 'session',
      header: "Today's location",
      sortable: false,
      cell: (u) => {
        if (u.role !== 'sales' && u.role !== 'employee') return <span className="text-muted-foreground/50">—</span>;
        const session = sessionFor(u.id);
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {session ? (
              <StatusBadge tone="green">{session.location?.name}</StatusBadge>
            ) : (
              <span className="text-xs text-muted-foreground">Not started</span>
            )}
            {locationMode === 'manual' && (
              <select
                aria-label="Assign today's location"
                className="h-7 rounded-md border bg-background px-1.5 text-xs"
                value=""
                onChange={(e) => e.target.value && setSessionMutation.mutate({ userId: u.id, locationId: Number(e.target.value) })}
              >
                <option value="">Assign…</option>
                {locations?.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
          </div>
        );
      },
    },
    {
      id: 'commission',
      header: 'Commission',
      align: 'end',
      value: (u) => (u.role === 'sales' ? Number(u.commission_rate || 0) : null),
      cell: (u) => (u.role === 'sales' && u.commission_rate ? <span className="tabular-nums font-medium">{u.commission_rate}%</span> : <span className="text-muted-foreground/50">—</span>),
    },
    { id: 'status', header: 'Status', value: (u) => (u.is_active ? 1 : 0), cell: (u) => <ActiveBadge active={!!u.is_active} /> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (u) => (
        <RowActions>
          <RowAction label="Edit" icon={Edit} onClick={() => handleOpenDialog(u)} />
          <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(u.id)} />
        </RowActions>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Shield}
        title="Users"
        description="People who can sign in, their roles and locations"
        actions={
          <>
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs" title={locationMode === 'automatic' ? 'Sales reps choose their location daily on the mobile app' : "Admins assign today's location for each sales rep"}>
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Rep location:</span>
              <div className="inline-flex rounded bg-muted p-0.5" role="group" aria-label="Location mode">
                {([
                  ['automatic', 'Rep chooses'],
                  ['manual', 'Admin assigns'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateModeMutation.mutate(mode)}
                    className={`rounded px-2 py-0.5 font-medium ${locationMode === mode ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="me-1.5 h-4 w-4" />
              Add User
            </Button>
          </>
        }
      />

      <DataTable
        data={filteredUsers}
        columns={columns}
        rowKey={(u) => u.id}
        loading={isLoading}
        defaultSort={{ id: 'name', dir: 'asc' }}
        searchPlaceholder="Search name, email, phone…"
        onRowClick={(u) => handleOpenDialog(u)}
        storageKey="users"
        exportFileName="users"
        emptyTitle="No users found"
        activeFilterCount={(roleFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
        onResetFilters={() => {
          setRoleFilter('');
          setStatusFilter('');
        }}
        filters={
          <>
            <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={roles.map((r) => ({ value: r, label: r }))} />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </>
        }
      />

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
                    <DatePicker id="hire_date" clearable value={formData.hire_date || ''} onChange={(v) => setFormData({ ...formData, hire_date: v })} />
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
                  <Label htmlFor="location_mode">Login Location Strategy</Label>
                  <select
                    id="location_mode"
                    value={formData.location_mode}
                    onChange={(e) => setFormData({ ...formData, location_mode: e.target.value })}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="manual">Manual Selection (Sales Choice)</option>
                    <option value="fixed">Fixed Location (Always Primary)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {formData.location_mode === 'manual' 
                      ? '✓ User must select which location to work from each day.' 
                      : '✓ User is automatically logged into the primary location and cannot switch.'}
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
    </Page>
  );
}
