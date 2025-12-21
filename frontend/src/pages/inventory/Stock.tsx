import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { stockApi } from '@/lib/api';
import { Warehouse, Search, AlertTriangle, Package } from 'lucide-react';

export default function Stock() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: warehouseStock, isLoading } = useQuery({
    queryKey: ['all-stock'],
    queryFn: async () => {
      const response = await stockApi.getAllStock();
      console.log('All Stock API Response:', response.data);
      console.log('All Stock Data:', response.data.data);
      return response.data.data;
    },
  });

  console.log('warehouseStock:', warehouseStock);
  console.log('isLoading:', isLoading);

  const filteredStock = warehouseStock?.filter((item: any) =>
    item.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('filteredStock:', filteredStock);
  console.log('filteredStock length:', filteredStock?.length);

  const lowStockItems = warehouseStock?.filter((item: any) => item.quantity <= item.min_stock_level) || [];
  const totalItems = warehouseStock?.length || 0;
  const totalQuantity = warehouseStock?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Warehouse className="h-8 w-8 text-purple-600" />
          {t('stock.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor inventory levels across all locations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalItems}</p>
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
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalQuantity}</p>
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
            <CardTitle className="text-xl">{t('stock.warehouse')}</CardTitle>
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
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.name')}</TableHead>
                  <TableHead>{t('products.category')}</TableHead>
                  <TableHead className="text-right">{t('common.quantity')}</TableHead>
                  <TableHead className="text-right">{t('products.minStock')}</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No products found matching your search' : 'No stock items'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStock?.map((item: any) => {
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
    </div>
  );
}
