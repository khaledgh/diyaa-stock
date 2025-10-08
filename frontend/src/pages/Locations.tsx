import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
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
import { locationApi, vanApi } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  address: z.string().max(255, 'Address must not exceed 255 characters').optional(),
  phone: z.string().max(20, 'Phone must not exceed 20 characters').optional(),
  type: z.enum(['warehouse', 'branch', 'van'], {
    required_error: 'Type is required',
  }),
  van_id: z.number().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface Location {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  type: string;
  van_id?: number;
  van_name?: string;
}

export default function Locations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  });

  const locationType = watch('type');

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await locationApi.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        return [];
      }
    },
  });

  const { data: vans } = useQuery({
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
    mutationFn: (data: LocationFormData) => locationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(t('locations.createSuccess') || 'Location created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('locations.createError') || 'Failed to create location');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LocationFormData }) =>
      locationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(t('locations.updateSuccess') || 'Location updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('locations.updateError') || 'Failed to update location');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => locationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(t('locations.deleteSuccess') || 'Location deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('locations.deleteError') || 'Failed to delete location');
    },
  });

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setValue('name', location.name);
      setValue('address', location.address || '');
      setValue('phone', location.phone || '');
      setValue('type', location.type as 'warehouse' | 'branch' | 'van');
      if (location.van_id) {
        setValue('van_id', location.van_id);
      }
    } else {
      setEditingLocation(null);
      reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    reset();
  };

  const onSubmit = (data: LocationFormData) => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t('locations.deleteConfirm') || 'Are you sure you want to delete this location?')) {
      deleteMutation.mutate(id);
    }
  };

  const locationTypeOptions = [
    { value: 'warehouse', label: t('locations.types.warehouse') || 'Warehouse' },
    { value: 'branch', label: t('locations.types.branch') || 'Branch' },
    { value: 'van', label: t('locations.types.van') || 'Van' },
  ];

  const getTypeLabel = (type: string) => {
    const option = locationTypeOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('locations.title') || 'Locations'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('locations.subtitle') || 'Manage warehouses, branches, and van locations'}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('locations.addNew') || 'Add Location'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('locations.list') || 'All Locations'}</h2>
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
                      <TableHead>{t('locations.name') || 'Name'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('locations.type') || 'Type'}</TableHead>
                      <TableHead className="hidden xl:table-cell">{t('locations.van') || 'Van'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('locations.address') || 'Address'}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('locations.phone') || 'Phone'}</TableHead>
                      <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations?.map((location: Location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{location.name}</div>
                            <div className="md:hidden text-xs text-muted-foreground mt-1">
                              {getTypeLabel(location.type)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {getTypeLabel(location.type)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {location.type === 'van' && location.van_name ? (
                            <span className="text-sm font-medium">{location.van_name}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{location.address || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{location.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(location)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(location.id)}
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
              {editingLocation
                ? t('locations.edit') || 'Edit Location'
                : t('locations.addNew') || 'Add Location'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('locations.name') || 'Name'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('locations.namePlaceholder') || 'Enter location name'}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                {t('locations.type') || 'Type'} <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={locationTypeOptions}
                value={locationType}
                onChange={(value) => setValue('type', value as 'warehouse' | 'branch' | 'van')}
                placeholder={t('locations.selectType') || 'Select type'}
                searchPlaceholder={t('common.search') || 'Search...'}
                emptyText={t('common.noResults') || 'No results found'}
              />
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('locations.address') || 'Address'}</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder={t('locations.addressPlaceholder') || 'Enter address'}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('locations.phone') || 'Phone'}</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder={t('locations.phonePlaceholder') || 'Enter phone number'}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            {locationType === 'van' && (
              <div className="space-y-2">
                <Label htmlFor="van_id">
                  {t('locations.selectVan') || 'Select Van'} <span className="text-red-500">*</span>
                </Label>
                <select
                  id="van_id"
                  {...register('van_id', { 
                    valueAsNumber: true,
                    validate: (value) => locationType !== 'van' || !!value || 'Van is required when type is van'
                  })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a van...</option>
                  {vans?.map((van: any) => (
                    <option key={van.id} value={van.id}>
                      {van.name}
                    </option>
                  ))}
                </select>
                {errors.van_id && (
                  <p className="text-sm text-red-500">{errors.van_id.message}</p>
                )}
              </div>
            )}

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
                  : editingLocation
                  ? t('common.update') || 'Update'
                  : t('common.create') || 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
