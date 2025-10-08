import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { stockApi, productApi, locationApi } from '@/lib/api';
import { Package, Search, Plus, Warehouse, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Inventory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [quantity, setQuantity] = useState('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['all-stock'],
    queryFn: async () => {
      const response = await stockApi.getAllStock();
      return response.data.data;
    },
  });

  const { data: warehouseStock, isLoading: isWarehouseLoading } = useQuery({
    queryKey: ['warehouse-stock'],
    queryFn: async () => {
      const response = await stockApi.getWarehouse();
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

  const { data: locations } = useQuery({
    queryKey: ['locations-all'],
    queryFn: async () => {
      const response = await locationApi.getAll();
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
    setSelectedLocation('');
    setQuantity('');
  };

  const handleAddStock = () => {
    if (!selectedProduct || !quantity || !selectedLocation) {
      toast.error(t('common.fillRequired'));
      return;
    }

    addStockMutation.mutate({
      product_id: parseInt(selectedProduct),
      location_id: parseInt(selectedLocation),
      quantity: parseInt(quantity),
    });
  };

  const filteredInventory = inventory?.filter((item: any) =>
    item.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWarehouseStock = warehouseStock?.filter((item: any) =>
    item.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = warehouseStock?.filter((item: any) => item.quantity <= item.min_stock_level) || [];
  const totalWarehouseItems = warehouseStock?.length || 0;
  const totalWarehouseQuantity = warehouseStock?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const parseLocationQuantities = (locationQuantitiesStr: string) => {
    if (!locationQuantitiesStr) return [];
    return locationQuantitiesStr.split('|').map(item => {
      const [name, qty, type] = item.split(':');
      return { name, quantity: parseInt(qty) || 0, type };
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
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all products across all locations</p>
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
                <Label>{t('locations.location')}</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((location: any) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name} ({location.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Locations</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse Only</TabsTrigger>
        </TabsList>

        {/* All Locations Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">All Products - All Locations</CardTitle>
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
                        <TableHead>{t('locations.locations')}</TableHead>
                        <TableHead className="text-right">{t('inventory.totalStock')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            {searchTerm ? t('common.noResults') : t('common.noData')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInventory?.map((item: any) => {
                          const locationQtys = parseLocationQuantities(item.location_quantities);
                          return (
                            <TableRow key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <TableCell className="font-medium">{item.sku}</TableCell>
                              <TableCell className="font-medium">{item.name_en}</TableCell>
                              <TableCell>{item.category_name_en || '-'}</TableCell>
                              <TableCell>
                                {locationQtys.length > 0 ? (
                                  <div className="space-y-1">
                                    {locationQtys.map((loc: any, idx: number) => (
                                      <div key={idx} className="text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{loc.name}</span>
                                        <span className="text-xs text-gray-500 ml-1">({loc.type}):</span>{' '}
                                        <span className="font-medium">{loc.quantity}</span>
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
        </TabsContent>

        {/* Warehouse Only Tab */}
        <TabsContent value="warehouse" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalWarehouseItems}</p>
                  </div>
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-2xl">
                    <Package className="h-7 w-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Quantity</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalWarehouseQuantity}</p>
                  </div>
                  <div className="p-4 bg-green-100 dark:bg-green-900 rounded-2xl">
                    <Warehouse className="h-7 w-7 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{lowStockItems.length}</p>
                  </div>
                  <div className="p-4 bg-red-100 dark:bg-red-900 rounded-2xl">
                    <AlertTriangle className="h-7 w-7 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Warehouse Stock</CardTitle>
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search by product name, SKU, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isWarehouseLoading ? (
                <div className="text-center py-8">{t('common.loading')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('products.sku')}</TableHead>
                      <TableHead>{t('products.name')}</TableHead>
                      <TableHead>{t('products.category')}</TableHead>
                      <TableHead className="text-right">{t('common.quantity')}</TableHead>
                      <TableHead className="text-right">Min Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWarehouseStock?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {searchTerm ? 'No products found matching your search' : 'No stock items'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWarehouseStock?.map((item: any) => {
                        const isLowStock = item.quantity <= item.min_stock_level;
                        return (
                          <TableRow 
                            key={item.id} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isLowStock ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                          >
                            <TableCell className="font-medium">{item.sku}</TableCell>
                            <TableCell className="font-medium">{item.name_en}</TableCell>
                            <TableCell>{item.category_name_en || '-'}</TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                {item.quantity} {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-gray-600 dark:text-gray-400">{item.min_stock_level}</TableCell>
                            <TableCell>
                              {isLowStock ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <AlertTriangle className="h-3 w-3" />
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  In Stock
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
