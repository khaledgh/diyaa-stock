import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MapPin, Package, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { productApi } from '@/lib/api';

export default function LowStock() {
  const { data: productsData } = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: async () => {
      const response = await productApi.getAll();
      return response.data.data?.data || response.data.data || [];
    },
  });

  // Filter products with low stock
  const lowStockProducts = productsData?.filter((product: any) => {
    if (!product.stock_by_location || product.stock_by_location.length === 0) {
      return true; // No stock at all
    }
    
    // Check if any location has low stock
    return product.stock_by_location.some((stock: any) => 
      stock.quantity < (product.min_stock_level || 10)
    );
  }) || [];

  // Calculate total low stock items
  const totalLowStockItems = lowStockProducts.reduce((sum: number, product: any) => {
    if (!product.stock_by_location || product.stock_by_location.length === 0) {
      return sum + 1;
    }
    return sum + product.stock_by_location.filter((s: any) => s.quantity < (product.min_stock_level || 10)).length;
  }, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            Low Stock Alert
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Products that need restocking across all locations
          </p>
        </div>
        <div className="bg-orange-100 dark:bg-orange-900 px-4 py-2 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Alerts</p>
          <p className="text-2xl font-bold text-orange-600">{totalLowStockItems}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products Affected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Unique products</p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Location Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{totalLowStockItems}</p>
                <p className="text-xs text-muted-foreground mt-1">Locations with low stock</p>
              </div>
              <MapPin className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {lowStockProducts.length > 0 ? 'Action Required' : 'All Good'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lowStockProducts.length > 0 ? 'Restock needed' : 'Stock levels normal'}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Products by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-green-600" />
                        <p className="text-lg font-semibold text-green-600">All Products Well Stocked!</p>
                        <p className="text-sm text-muted-foreground">No low stock alerts at this time</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockProducts.flatMap((product: any) => {
                    const minStock = product.min_stock_level || 10;
                    
                    // If no stock at all
                    if (!product.stock_by_location || product.stock_by_location.length === 0) {
                      return (
                        <TableRow key={`${product.id}-no-stock`} className="bg-red-50 dark:bg-red-950">
                          <TableCell className="font-medium">{product.name_en}</TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>
                            <span className="text-red-600 font-semibold">No Locations</span>
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-bold">0</TableCell>
                          <TableCell className="text-right">{minStock}</TableCell>
                          <TableCell className="text-right text-red-600 font-bold">-{minStock}</TableCell>
                          <TableCell>
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Critical
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    // Show each location with low stock
                    return product.stock_by_location
                      .filter((stock: any) => stock.quantity < minStock)
                      .map((stock: any, idx: number) => {
                        const shortage = minStock - stock.quantity;
                        const priority = stock.quantity === 0 ? 'Critical' : 
                                       stock.quantity < minStock / 2 ? 'High' : 'Medium';
                        const priorityColor = priority === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            priority === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                        
                        return (
                          <TableRow 
                            key={`${product.id}-${stock.location_name}-${idx}`}
                            className={priority === 'Critical' ? 'bg-red-50 dark:bg-red-950' : ''}
                          >
                            <TableCell className="font-medium">{product.name_en}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{stock.location_name}</span>
                                <span className="text-xs text-muted-foreground">({stock.location_type})</span>
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${
                              stock.quantity === 0 ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {stock.quantity}
                            </TableCell>
                            <TableCell className="text-right">{minStock}</TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">
                              -{shortage}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                                {priority}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      });
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
