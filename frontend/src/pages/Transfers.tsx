import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Truck, Package, Eye } from 'lucide-react';
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
import { transferApi, locationApi, productApi, stockApi, vanApi } from '@/lib/api';
import { formatDateTime, formatQuantity } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const transferItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const transferSchema = z.object({
  from_location_id: z.number().min(1, 'Please select source location'),
  to_location_id: z.number().min(1, 'Please select destination location'),
  items: z.array(transferItemSchema).min(1, 'Please add at least one item'),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface Transfer {
  id: number;
  from_location_id: number;
  to_location_id: number;
  from_location_type: string;
  to_location_type: string;
  from_location_name?: string;
  to_location_name?: string;
  to_van_name?: string;
  status: string;
  created_by_name?: string;
  created_at: string;
  items?: TransferItem[];
}

interface TransferItem {
  product_id: number;
  product_name?: string;
  name_en?: string;
  quantity: number;
  product?: {
    id: number;
    sku: string;
    name_en: string;
    name_ar: string;
    unit: string;
  };
}

export default function Transfers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_location_id: 0,
      to_location_id: 0,
      items: [],
    },
  });

  const selectedFromLocation = watch('from_location_id');
  const selectedToLocation = watch('to_location_id');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Update form items when transferItems changes
  useEffect(() => {
    setValue('items', transferItems);
  }, [transferItems, setValue]);

  const { data: locations } = useQuery({
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

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers', locations],
    queryFn: async () => {
      try {
        const response = await transferApi.getAll();
        const transfersData = response.data.data || [];
        
        // Map location IDs to names
        if (locations && transfersData.length > 0) {
          return transfersData.map((transfer: Transfer) => {
            const fromLocation = locations.find((loc: any) => loc.id === transfer.from_location_id);
            const toLocation = locations.find((loc: any) => loc.id === transfer.to_location_id);
            
            return {
              ...transfer,
              from_location_name: fromLocation?.name || `Location ${transfer.from_location_id}`,
              to_location_name: toLocation?.name || `Location ${transfer.to_location_id}`,
            };
          });
        }
        
        return transfersData;
      } catch (error) {
        console.error('Failed to fetch transfers:', error);
        return [];
      }
    },
    enabled: !!locations,
  });

  const { data: products } = useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: async () => {
      try {
        const response = await productApi.getAll({ search: debouncedSearch });
        // Handle paginated response
        const apiData = response.data.data || response.data;
        return Array.isArray(apiData) ? apiData : (apiData.data || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
      }
    },
  });

  const { data: sourceLocationStock } = useQuery({
    queryKey: ['location-stock', selectedFromLocation, locations],
    queryFn: async () => {
      if (!selectedFromLocation) return [];
      try {
        // Find the selected location to determine its type
        const location = locations?.find((loc: any) => loc.id === selectedFromLocation);
        
        let response;
        // Always use the location-specific endpoint with the actual location ID
        // The backend will query based on location_type and location_id
        if (location?.type === 'van') {
          // For van, use the van stock endpoint
          response = await vanApi.getStock(selectedFromLocation);
          console.log('Fetching van stock for van ID:', selectedFromLocation);
        } else {
          // For warehouse and other locations, use the location stock endpoint with actual ID
          response = await stockApi.getByLocation(selectedFromLocation);
          console.log('Fetching stock for location ID:', selectedFromLocation, 'type:', location?.type);
        }
        
        const stockData = response.data.data || [];
        console.log('Stock Response:', {
          locationId: selectedFromLocation,
          locationType: location?.type,
          stockData,
          stockDataLength: stockData.length,
        });
        return stockData;
      } catch (error) {
        console.error('Failed to fetch location stock:', error);
        return [];
      }
    },
    enabled: !!selectedFromLocation && !!locations,
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

  const handleViewDetails = async (transferId: number) => {
    try {
      const response = await transferApi.getById(transferId);
      const transferData = response.data.data;
      
      // Map location IDs to names
      if (locations) {
        const fromLocation = locations.find((loc: any) => loc.id === transferData.from_location_id);
        const toLocation = locations.find((loc: any) => loc.id === transferData.to_location_id);
        
        transferData.from_location_name = fromLocation?.name || `Location ${transferData.from_location_id}`;
        transferData.to_location_name = toLocation?.name || `Location ${transferData.to_location_id}`;
      }
      
      setSelectedTransfer(transferData);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load transfer details');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) {
      toast.error(t('transfers.selectProductAndQuantity') || 'Please select product and quantity');
      return;
    }

    if (!selectedFromLocation) {
      toast.error('Please select source location first');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    const stock = sourceLocationStock?.find((s: any) => s.product_id === Number(selectedProduct));

    if (!stock || stock.quantity < Number(quantity)) {
      toast.error(t('transfers.insufficientStock') || 'Insufficient stock in source location');
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
    setSelectedProduct('');
    setQuantity('');
  };

  const onSubmit = (data: TransferFormData) => {
    // Validate that we have items
    if (transferItems.length === 0) {
      toast.error(t('transfers.addAtLeastOneItem') || 'Please add at least one item to the transfer');
      return;
    }

    // Determine location types based on actual location data
    const fromLocation = locations?.find((loc: any) => loc.id === data.from_location_id);
    const toLocation = locations?.find((loc: any) => loc.id === data.to_location_id);

    // Use the actual location type from the database and the actual location ID
    const fromLocationType = fromLocation?.type || 'location';
    const toLocationType = toLocation?.type || 'location';

    console.log('Transfer Data:', {
      fromLocation: fromLocation?.name,
      fromLocationType,
      fromLocationId: data.from_location_id,
      toLocation: toLocation?.name,
      toLocationType,
      toLocationId: data.to_location_id,
    });

    // Add the current transfer items to the form data
    const formDataWithItems = {
      ...data,
      from_location_type: fromLocationType,
      from_location_id: data.from_location_id,
      to_location_type: toLocationType,
      to_location_id: data.to_location_id,
      items: transferItems,
    };

    createMutation.mutate(formDataWithItems);
  };

  const locationOptions = locations?.map((loc: any) => ({
    value: loc.id.toString(),
    label: `${loc.name} (${loc.type})`,
  })) || [];

  // Log all stock data to debug
  if (sourceLocationStock && sourceLocationStock.length > 0) {
    console.log('=== STOCK DATA DEBUG ===');
    console.log('Total stock records:', sourceLocationStock.length);
    console.log('First stock record:', sourceLocationStock[0]);
    console.log('All field names in first stock record:', Object.keys(sourceLocationStock[0] || {}));
    console.log('All stock records:', sourceLocationStock);
  }
  
  if (products && products.length > 0) {
    console.log('=== PRODUCTS DEBUG ===');
    console.log('Total products:', products.length);
    console.log('First product:', products[0]);
  }

  const productOptions = products?.map((product: any) => {
    // Find matching stock record
    const stock = sourceLocationStock?.find((s: any) => {
      // Log each stock record being checked
      const allKeys = Object.keys(s);
      console.log(`Checking stock record with keys: ${allKeys.join(', ')}`);
      
      // Try to get product_id from all possible locations
      let stockProductId = null;
      for (const key of allKeys) {
        if (key.toLowerCase().includes('product') && key.toLowerCase().includes('id')) {
          stockProductId = s[key];
          console.log(`Found product ID field: ${key} = ${stockProductId}`);
          break;
        }
      }
      
      const productIdNum = Number(product.id);
      const stockProductIdNum = Number(stockProductId);
      
      const matches = stockProductIdNum === productIdNum;
      
      if (matches) {
        console.log('✅ MATCH FOUND:', {
          productId: product.id,
          productName: product.name_en,
          stockProductId,
          stockRecord: s
        });
      }
      
      return matches;
    });
    
    // Get quantity from stock record
    let stockQty = 0;
    if (stock) {
      const allKeys = Object.keys(stock);
      for (const key of allKeys) {
        if (key.toLowerCase() === 'quantity' || key.toLowerCase() === 'qty') {
          stockQty = Number(stock[key]) || 0;
          console.log(`Found quantity field: ${key} = ${stockQty}`);
          break;
        }
      }
    }
    
    console.log('Product Option:', {
      productId: product.id,
      productName: product.name_en,
      foundStock: !!stock,
      stockQuantity: stockQty
    });
    
    return {
      value: product.id.toString(),
      label: `${product.name_en} (Stock: ${formatQuantity(stockQty)})`,
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
                      <TableHead className="hidden lg:table-cell">{t('transfers.fromLocation') || 'From'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('transfers.toLocation') || 'To'}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.status') || 'Status'}</TableHead>
                      <TableHead className="hidden xl:table-cell">Created By</TableHead>
                      <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers?.map((transfer: Transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          <div>
                            <div>{formatDateTime(transfer.created_at)}</div>
                            <div className="lg:hidden text-xs text-muted-foreground mt-1">
                              {transfer.from_location_name} → {transfer.to_location_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{transfer.from_location_name || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{transfer.to_location_name || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transfer.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {transfer.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{transfer.created_by_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(transfer.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('transfers.newTransfer') || 'New Stock Transfer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('transfers.fromLocation') || 'From Location'} <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={[
                    { value: '', label: 'Select source location...' },
                    ...locationOptions,
                  ]}
                  value={selectedFromLocation?.toString() || ''}
                  onChange={(value) => {
                    setValue('from_location_id', value ? parseInt(value) : 0);
                    setTransferItems([]); // Clear items when changing source location
                  }}
                  placeholder="Select source location"
                  searchPlaceholder={t('common.search') || 'Search...'}
                  emptyText={t('common.noResults') || 'No locations found'}
                />
                {errors.from_location_id && (
                  <p className="text-sm text-red-500">{errors.from_location_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  {t('transfers.toLocation') || 'To Location'} <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={[
                    { value: '', label: 'Select destination location...' },
                    ...locationOptions.filter((opt: any) => opt.value !== selectedFromLocation?.toString()),
                  ]}
                  value={selectedToLocation?.toString() || ''}
                  onChange={(value) => setValue('to_location_id', value ? parseInt(value) : 0)}
                  placeholder="Select destination location"
                  searchPlaceholder={t('common.search') || 'Search...'}
                  emptyText={t('common.noResults') || 'No locations found'}
                />
                {errors.to_location_id && (
                  <p className="text-sm text-red-500">{errors.to_location_id.message}</p>
                )}
              </div>
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
                    onSearchChange={setProductSearch}
                    placeholder={t('transfers.selectProduct') || 'Select product'}
                    searchPlaceholder={t('common.search') || 'Search...'}
                    emptyText={selectedFromLocation ? (t('common.noResults') || 'No products found') : 'Please select source location first'}
                    disabled={!selectedFromLocation}
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

      {/* Transfer Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('transfers.transferDetails') || 'Transfer Details'}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('common.date') || 'Date'}</Label>
                  <p className="font-medium">{formatDateTime(selectedTransfer.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common.status') || 'Status'}</Label>
                  <p className="font-medium capitalize">{selectedTransfer.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('transfers.fromLocation') || 'From Location'}</Label>
                  <p className="font-medium">{selectedTransfer.from_location_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('transfers.toLocation') || 'To Location'}</Label>
                  <p className="font-medium">{selectedTransfer.to_location_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created By</Label>
                  <p className="font-medium">{selectedTransfer.created_by_name || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{t('transfers.items') || 'Items'}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('transfers.product') || 'Product'}</TableHead>
                      <TableHead className="text-right">{t('common.quantity') || 'Quantity'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTransfer.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product?.name_en || item.product_name || item.name_en || '-'}</div>
                            <div className="text-xs text-muted-foreground">{item.product?.sku || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
