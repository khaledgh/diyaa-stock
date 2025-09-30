import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Truck, Package } from 'lucide-react';
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
import { transferApi, vanApi, productApi, stockApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const transferItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const transferSchema = z.object({
  to_location_id: z.number().min(1, 'Please select a van'),
  items: z.array(transferItemSchema).min(1, 'Please add at least one item'),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface Transfer {
  id: number;
  to_van_name?: string;
  status: string;
  created_by_name?: string;
  created_at: string;
}

interface TransferItem {
  product_id: number;
  product_name?: string;
  quantity: number;
}

export default function Transfers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      to_location_id: 0,
      items: [],
    },
  });

  const selectedVan = watch('to_location_id');

  // Update form items when transferItems changes
  React.useEffect(() => {
    setValue('items', transferItems);
  }, [transferItems, setValue]);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      try {
        const response = await transferApi.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch transfers:', error);
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

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await productApi.getAll();
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
      }
    },
  });

  const { data: warehouseStock } = useQuery({
    queryKey: ['warehouse-stock'],
    queryFn: async () => {
      try {
        const response = await stockApi.getWarehouse();
        return response.data.data || [];
      } catch (error) {
        console.error('Failed to fetch warehouse stock:', error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TransferFormData) => transferApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      toast.success(t('transfers.transferComplete') || 'Transfer completed successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('transfers.transferError') || 'Failed to create transfer');
    },
  });

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) {
      toast.error(t('transfers.selectProductAndQuantity') || 'Please select product and quantity');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    const stock = warehouseStock?.find((s: any) => s.product_id === Number(selectedProduct));

    if (!stock || stock.quantity < Number(quantity)) {
      toast.error(t('transfers.insufficientStock') || 'Insufficient warehouse stock');
      return;
    }

    const newItem: TransferItem = {
      product_id: Number(selectedProduct),
      product_name: product?.name_en,
      quantity: Number(quantity),
    };

    setTransferItems([...transferItems, newItem]);
    setSelectedProduct('');
    setQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    reset();
    setTransferItems([]);
  };

  const onSubmit = (data: TransferFormData) => {
    // Add the current transfer items to the form data
    const formDataWithItems = {
      ...data,
      to_location_type: 'van',
      items: transferItems,
    };

    // Validate that we have items
    if (transferItems.length === 0) {
      toast.error(t('transfers.addAtLeastOneItem') || 'Please add at least one item to the transfer');
      return;
    }

    createMutation.mutate(formDataWithItems);
  };

  const vanOptions = vans?.filter((van: any) => van.is_active).map((van: any) => ({
    value: van.id.toString(),
    label: van.name,
  })) || [];

  const productOptions = products?.map((product: any) => {
    const stock = warehouseStock?.find((s: any) => s.product_id === product.id);
    return {
      value: product.id.toString(),
      label: `${product.name_en} (Stock: ${stock?.quantity || 0})`,
    };
  }) || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('transfers.title') || 'Stock Transfers'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('transfers.subtitle') || 'Transfer stock from warehouse to vans'}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('transfers.newTransfer') || 'New Transfer'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('transfers.recentTransfers') || 'Recent Transfers'}</h2>
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
                      <TableHead>{t('common.date') || 'Date'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('transfers.toVan') || 'To Van'}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.status') || 'Status'}</TableHead>
                      <TableHead className="hidden lg:table-cell">Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers?.map((transfer: Transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
                        <TableCell className="hidden md:table-cell">{transfer.to_van_name || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transfer.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {transfer.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{transfer.created_by_name || '-'}</TableCell>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('transfers.newTransfer') || 'New Stock Transfer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>
                {t('transfers.selectVan') || 'Select Van'} <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={[
                  { value: '', label: t('transfers.selectVanPlaceholder') || 'Select a van...' },
                  ...vanOptions,
                ]}
                value={selectedVan?.toString() || ''}
                onChange={(value) => setValue('to_location_id', value ? parseInt(value) : 0)}
                placeholder={t('transfers.selectVan') || 'Select van'}
                searchPlaceholder={t('common.search') || 'Search...'}
                emptyText={t('common.noResults') || 'No vans found'}
              />
              {errors.to_location_id && (
                <p className="text-sm text-red-500">{errors.to_location_id.message}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('transfers.addItems') || 'Add Items'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <Label>{t('transfers.selectProduct') || 'Select Product'}</Label>
                  <Combobox
                    options={[
                      { value: '', label: t('transfers.selectProductPlaceholder') || 'Select a product...' },
                      ...productOptions,
                    ]}
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                    placeholder={t('transfers.selectProduct') || 'Select product'}
                    searchPlaceholder={t('common.search') || 'Search...'}
                    emptyText={t('common.noResults') || 'No products found'}
                  />
                </div>
                <div>
                  <Label>{t('common.quantity') || 'Quantity'}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      min="1"
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddItem} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {transferItems.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('transfers.product') || 'Product'}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('common.quantity') || 'Quantity'}</TableHead>
                        <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items.message}</p>
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
                disabled={createMutation.isPending}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending
                  ? t('common.transferring') || 'Transferring...'
                  : t('transfers.createTransfer') || 'Create Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
