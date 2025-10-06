import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { stockApi, productApi, vanApi } from '@/lib/api';
import { Package, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Inventory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [locationType, setLocationType] = useState('warehouse');
  const [selectedVan, setSelectedVan] = useState('');
  const [quantity, setQuantity] = useState('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['all-stock'],
    queryFn: async () => {
      const response = await stockApi.getAllStock();
      return response.data.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const response = await productApi.getAll();
      return response.data.data.data;
    },
  });

  const { data: vans } = useQuery({
    queryKey: ['vans-all'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data.data;
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async (data: any) => {
      return await stockApi.addStock(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stock'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      toast.success(t('stock.stockAdded'));
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error(t('stock.stockAddError'));
    },
  });

  const resetForm = () => {
    setSelectedProduct('');
    setLocationType('warehouse');
    setSelectedVan('');
    setQuantity('');
  };

  const handleAddStock = () => {
    if (!selectedProduct || !quantity) {
      toast.error(t('common.fillRequired'));
      return;
    }

    if (locationType === 'van' && !selectedVan) {
      toast.error(t('stock.selectVan'));
      return;
    }

    addStockMutation.mutate({
      product_id: parseInt(selectedProduct),
      location_type: locationType,
      location_id: locationType === 'van' ? parseInt(selectedVan) : 0,
      quantity: parseInt(quantity),
    });
  };

  const filteredInventory = inventory?.filter((item: any) =>
    item.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parseVanQuantities = (vanQuantitiesStr: string) => {
    if (!vanQuantitiesStr) return [];
    return vanQuantitiesStr.split('|').map(item => {
      const [name, qty] = item.split(':');
      return { name, quantity: parseInt(qty) || 0 };
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            {t('inventory.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('inventory.subtitle')}</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('inventory.addStock')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('inventory.addStockToLocation')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>{t('products.name')}</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.selectProduct')} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product: any) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name_en} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('inventory.locationType')}</Label>
                <Select value={locationType} onValueChange={setLocationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">{t('stock.warehouse')}</SelectItem>
                    <SelectItem value="van">{t('vans.title')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {locationType === 'van' && (
                <div>
                  <Label>{t('vans.name')}</Label>
                  <Select value={selectedVan} onValueChange={setSelectedVan}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('transfers.selectVan')} />
                    </SelectTrigger>
                    <SelectContent>
                      {vans?.map((van: any) => (
                        <SelectItem key={van.id} value={van.id.toString()}>
                          {van.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>{t('common.quantity')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={t('inventory.enterQuantity')}
                />
              </div>

              <Button 
                onClick={handleAddStock} 
                className="w-full"
                disabled={addStockMutation.isPending}
              >
                {addStockMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{t('inventory.allProducts')}</CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder={t('inventory.searchPlaceholder')}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('products.sku')}</TableHead>
                    <TableHead>{t('products.name')}</TableHead>
                    <TableHead>{t('products.category')}</TableHead>
                    <TableHead className="text-right">{t('stock.warehouse')}</TableHead>
                    <TableHead>{t('inventory.vanStock')}</TableHead>
                    <TableHead className="text-right">{t('inventory.totalStock')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchTerm ? t('common.noResults') : t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory?.map((item: any) => {
                      const vanQtys = parseVanQuantities(item.van_quantities);
                      return (
                        <TableRow key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name_en}</TableCell>
                          <TableCell>{item.category_name_en || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {item.warehouse_quantity} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell>
                            {vanQtys.length > 0 ? (
                              <div className="space-y-1">
                                {vanQtys.map((van: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{van.name}:</span>{' '}
                                    <span className="font-medium">{van.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {item.total_quantity} {item.unit}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
