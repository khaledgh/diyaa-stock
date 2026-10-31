import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColumnDef, DataTable } from '@/components/data-table/DataTable';
import { ActiveBadge, StatusBadge, Page, PageHeader, RowAction, RowActions } from '@/components/layout/Page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { vanApi } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';

const vanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  plate_number: z.string().max(50, 'Plate number must not exceed 50 characters').optional(),
  owner_type: z.enum(['company', 'rental'], {
    required_error: 'Owner type is required',
  }),
  is_active: z.boolean().default(true),
});

type VanFormData = z.infer<typeof vanSchema>;

interface Van {
  id: number;
  name: string;
  plate_number?: string;
  owner_type: string;
  is_active: boolean;
}

export default function Vans() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);

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
      setValue('is_active', van.is_active);
    } else {
      setEditingVan(null);
      reset({
        name: '',
        plate_number: '',
        owner_type: 'company',
        is_active: true,
      });
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


  const getOwnerTypeLabel = (type: string) => {
    const option = ownerTypeOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  const columns: ColumnDef<any>[] = [
    { id: 'name', header: t('vans.name') || 'Name', alwaysVisible: true, value: (v) => v.name, cell: (v) => <span className="font-medium">{v.name}</span> },
    { id: 'plate_number', header: t('vans.plateNumber') || 'Plate Number', value: (v) => v.plate_number, cell: (v) => <span className="font-mono text-xs">{v.plate_number || '—'}</span> },
    {
      id: 'owner_type',
      header: t('vans.ownerType') || 'Owner Type',
      value: (v) => getOwnerTypeLabel(v.owner_type),
      cell: (v) => <StatusBadge tone={v.owner_type === 'rental' ? 'amber' : 'blue'} dot={false}>{v.owner_type ? getOwnerTypeLabel(v.owner_type) : '—'}</StatusBadge>,
    },
    { id: 'status', header: t('common.status') || 'Status', value: (v) => (v.is_active ? 1 : 0), cell: (v) => <ActiveBadge active={!!v.is_active} /> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (v) => (
        <RowActions>
          <RowAction label="Edit" icon={Edit} onClick={() => handleOpenDialog(v)} />
          <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(v.id)} />
        </RowActions>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Truck}
        title={t('vans.title') || 'Vans'}
        description={t('vans.subtitle') || 'Manage company and rental vehicles'}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="me-1.5 h-4 w-4" />
            {t('vans.addNew') || 'Add Van'}
          </Button>
        }
      />

      <DataTable
        data={vans || []}
        columns={columns}
        rowKey={(v) => v.id}
        loading={isLoading}
        defaultSort={{ id: 'name', dir: 'asc' }}
        searchPlaceholder="Search name or plate…"
        onRowClick={(v) => handleOpenDialog(v)}
        storageKey="vans"
        exportFileName="vans"
        emptyTitle="No vans yet"
      />

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

            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">{t('common.status') || 'Status'}</Label>
                <p className="text-sm text-muted-foreground">
                  {watch('is_active') ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                </p>
              </div>
              <Switch
                checked={watch('is_active')}
                onCheckedChange={(checked: boolean) => setValue('is_active', checked)}
              />
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

    </Page>
  );
}
