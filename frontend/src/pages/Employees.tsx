import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Employee {
  id: number;
  name: string;
  email?: string;
  phone: string;
  position: string;
  hire_date: string;
  salary?: number;
  van_name?: string;
  is_active: boolean;
}

export default function Employees() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salary, setSalary] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeeApi.getAll();
      return response.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => employeeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => employeeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    },
  });

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setName(employee.name);
      setEmail(employee.email || '');
      setPhone(employee.phone);
      setPosition(employee.position);
      setHireDate(employee.hire_date);
      setSalary(employee.salary?.toString() || '');
    } else {
      setEditingEmployee(null);
      setName('');
      setEmail('');
      setPhone('');
      setPosition('');
      setHireDate('');
      setSalary('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setPhone('');
    setPosition('');
    setHireDate('');
    setSalary('');
  };

  const handleSubmit = () => {
    if (!name || !phone || !position || !hireDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const employeeData: any = {
      name,
      phone,
      position,
      hire_date: hireDate,
    };

    if (email) employeeData.email = email;
    if (salary) employeeData.salary = Number(salary);

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: employeeData });
    } else {
      createMutation.mutate(employeeData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('employees.title') || 'Employees'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('employees.subtitle') || 'Manage your team members'}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('employees.addEmployee') || 'Add Employee'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('employees.employeeList') || 'Employee List'}</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name') || 'Name'}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('employees.position') || 'Position'}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('common.phone') || 'Phone'}</TableHead>
                    <TableHead className="hidden xl:table-cell">{t('employees.hireDate') || 'Hire Date'}</TableHead>
                    <TableHead className="hidden xl:table-cell">{t('employees.salary') || 'Salary'}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('employees.van') || 'Van'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees?.map((employee: Employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{employee.position}</TableCell>
                        <TableCell className="hidden lg:table-cell">{employee.phone}</TableCell>
                        <TableCell className="hidden xl:table-cell">{formatDate(employee.hire_date)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {employee.salary ? formatCurrency(employee.salary) : '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{employee.van_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Employee name"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@example.com"
              />
            </div>

            <div>
              <Label>Phone <span className="text-red-500">*</span></Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>

            <div>
              <Label>Position <span className="text-red-500">*</span></Label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., Sales Representative"
              />
            </div>

            <div>
              <Label>Hire Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Salary</Label>
              <Input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingEmployee
                ? 'Update Employee'
                : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
