import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Truck, Package } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { vanApi, employeeApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const vanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  plate_number: z.string().max(50, 'Plate number must not exceed 50 characters').optional(),
  owner_type: z.enum(['company', 'rental'], {
    required_error: 'Owner type is required',
  }),
  employee_id: z.number().nullable().optional(),
});

type VanFormData = z.infer<typeof vanSchema>;

interface Van {
  id: number;
  name: string;
  plate_number?: string;
  owner_type: string;
  employee_id?: number;
  employee_name?: string;
  is_active: boolean;
}

export default function Vans() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);
  const [selectedVanForStock, setSelectedVanForStock] = useState<Van | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VanFormData>({
    resolver: zodResolver(vanSchema),
  });

  const ownerType = watch('owner_type');
  const employeeId = watch('employee_id');

  const { data: vans, isLoading } = useQuery({
    queryKey: ['vans'],
    queryFn: async () => {
      try {
        const response = await vanApi.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch vans:', error);
        return [];
      }
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const response = await employeeApi.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        return [];
      }
    },
  });

  const { data: vanStock } = useQuery({
    queryKey: ['van-stock', selectedVanForStock?.id],
    queryFn: async () => {
      if (!selectedVanForStock) return [];
      const response = await vanApi.getStock(selectedVanForStock.id);
      return response.data.data || [];
    },
    enabled: !!selectedVanForStock,
  });

  const createMutation = useMutation({
    mutationFn: (data: VanFormData) => vanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vans'] });
      toast.success(t('vans.createSuccess') || 'Van created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('vans.createError') || 'Failed to create van');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VanFormData }) =>
      vanApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vans'] });
      toast.success(t('vans.updateSuccess') || 'Van updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('vans.updateError') || 'Failed to update van');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vanApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vans'] });
      toast.success(t('vans.deleteSuccess') || 'Van deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('vans.deleteError') || 'Failed to delete van');
    },
  });

  const handleOpenDialog = (van?: Van) => {
    if (van) {
      setEditingVan(van);
      setValue('name', van.name);
      setValue('plate_number', van.plate_number || '');
      setValue('owner_type', van.owner_type as 'company' | 'rental');
      setValue('employee_id', van.employee_id || null);
    } else {
      setEditingVan(null);
      reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVan(null);
    reset();
  };

  const onSubmit = (data: VanFormData) => {
    if (editingVan) {
      updateMutation.mutate({ id: editingVan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t('vans.deleteConfirm') || 'Are you sure you want to delete this van?')) {
      deleteMutation.mutate(id);
    }
  };

  const ownerTypeOptions = [
    { value: 'company', label: t('vans.ownerTypes.company') || 'Company' },
    { value: 'rental', label: t('vans.ownerTypes.rental') || 'Rental' },
  ];

  const employeeOptions = employees?.map((employee: any) => ({
    value: employee.id.toString(),
    label: employee.name,
  })) || [];

  const getOwnerTypeLabel = (type: string) => {
    const option = ownerTypeOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('vans.title') || 'Vans'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('vans.subtitle') || 'Manage company and rental vehicles'}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('vans.addNew') || 'Add Van'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('vans.list') || 'All Vans'}</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('vans.name') || 'Name'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('vans.plateNumber') || 'Plate Number'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('vans.ownerType') || 'Owner Type'}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('vans.employee') || 'Employee'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('common.status') || 'Status'}</TableHead>
                      <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vans?.map((van: Van) => (
                      <TableRow key={van.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <div>
                              <div>{van.name}</div>
                              <div className="md:hidden text-xs text-muted-foreground mt-1">
                                {van.plate_number && `${van.plate_number} • `}
                                {getOwnerTypeLabel(van.owner_type)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{van.plate_number || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            van.owner_type === 'company'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {getOwnerTypeLabel(van.owner_type)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{van.employee_name || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            van.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {van.is_active ? t('common.active') : t('common.inactive')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVanForStock(van);
                                setIsStockDialogOpen(true);
                              }}
                              title="View Stock"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(van)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(van.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingVan
                ? t('vans.edit') || 'Edit Van'
                : t('vans.addNew') || 'Add Van'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('vans.name') || 'Name'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('vans.namePlaceholder') || 'Enter van name'}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate_number">{t('vans.plateNumber') || 'Plate Number'}</Label>
              <Input
                id="plate_number"
                {...register('plate_number')}
                placeholder={t('vans.plateNumberPlaceholder') || 'Enter plate number'}
              />
              {errors.plate_number && (
                <p className="text-sm text-red-500">{errors.plate_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_type">
                {t('vans.ownerType') || 'Owner Type'} <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={ownerTypeOptions}
                value={ownerType}
                onChange={(value) => setValue('owner_type', value as 'company' | 'rental')}
                placeholder={t('vans.selectOwnerType') || 'Select owner type'}
                searchPlaceholder={t('common.search') || 'Search...'}
                emptyText={t('common.noResults') || 'No results found'}
              />
              {errors.owner_type && (
                <p className="text-sm text-red-500">{errors.owner_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_id">{t('vans.employee') || 'Assigned Employee'}</Label>
              <Combobox
                options={[
                  { value: '', label: t('vans.noEmployee') || 'No employee assigned' },
                  ...employeeOptions,
                ]}
                value={employeeId?.toString() || ''}
                onChange={(value) => setValue('employee_id', value ? parseInt(value) : null)}
                placeholder={t('vans.selectEmployee') || 'Select employee'}
                searchPlaceholder={t('common.search') || 'Search...'}
                emptyText={t('common.noResults') || 'No results found'}
              />
              {errors.employee_id && (
                <p className="text-sm text-red-500">{errors.employee_id.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="w-full sm:w-auto"
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.saving') || 'Saving...'
                  : editingVan
                  ? t('common.update') || 'Update'
                  : t('common.create') || 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Van Stock Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVanForStock?.name} - Stock Inventory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!vanStock || vanStock.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products in this van
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vanStock.map((item: any) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{item.name_en}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price || 0)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-semibold">Total Value:</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(
                        vanStock.reduce((sum: number, item: any) => 
                          sum + ((item.quantity || 0) * (item.unit_price || 0)), 0
                        )
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsStockDialogOpen(false);
                setSelectedVanForStock(null);
              }}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
