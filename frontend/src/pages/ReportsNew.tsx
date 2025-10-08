import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Package, DollarSign, Users, MapPin, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceApi, productApi, reportApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function ReportsNew() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Fetch sales data
  const { data: salesData } = useQuery({
    queryKey: ['sales-report', dateRange],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ invoice_type: 'sales' });
      return response.data.data?.data || [];
    },
  });

  // Fetch purchase data
  const { data: purchaseData } = useQuery({
    queryKey: ['purchase-report', dateRange],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ invoice_type: 'purchase' });
      return response.data.data?.data || [];
    },
  });

  // Fetch products for inventory report
  const { data: productsData } = useQuery({
    queryKey: ['products-report'],
    queryFn: async () => {
      const response = await productApi.getAll();
      // Handle nested data structure
      const apiData = response.data.data || response.data;
      if (apiData?.data && Array.isArray(apiData.data)) {
        return apiData.data;
      }
      if (Array.isArray(apiData)) {
        return apiData;
      }
      return [];
    },
  });

  // Calculate sales metrics
  const totalSales = salesData?.reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0) || 0;
  const totalSalesPaid = salesData?.reduce((sum: number, inv: any) => sum + Number(inv.paid_amount), 0) || 0;
  const salesCount = salesData?.length || 0;

  // Calculate purchase metrics
  const totalPurchases = purchaseData?.reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0) || 0;
  const totalPurchasesPaid = purchaseData?.reduce((sum: number, inv: any) => sum + Number(inv.paid_amount), 0) || 0;
  const purchaseCount = purchaseData?.length || 0;

  // Calculate profit
  const grossProfit = totalSales - totalPurchases;
  const profitMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : '0';

  // Sales by customer
  const salesByCustomer = salesData?.reduce((acc: any, inv: any) => {
    const customer = inv.customer_name || 'Walk-in';
    if (!acc[customer]) {
      acc[customer] = { name: customer, total: 0, count: 0 };
    }
    acc[customer].total += Number(inv.total_amount);
    acc[customer].count += 1;
    return acc;
  }, {});

  const topCustomers = Object.values(salesByCustomer || {})
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 10);

  // Sales by location
  const salesByLocation = salesData?.reduce((acc: any, inv: any) => {
    const location = inv.location_name || 'Unknown';
    if (!acc[location]) {
      acc[location] = { name: location, total: 0, count: 0 };
    }
    acc[location].total += Number(inv.total_amount);
    acc[location].count += 1;
    return acc;
  }, {});

  const locationSales = Object.values(salesByLocation || {})
    .sort((a: any, b: any) => b.total - a.total);

  // Purchase by vendor
  const purchaseByVendor = purchaseData?.reduce((acc: any, inv: any) => {
    const vendor = inv.vendor_name || 'Unknown';
    if (!acc[vendor]) {
      acc[vendor] = { name: vendor, total: 0, count: 0 };
    }
    acc[vendor].total += Number(inv.total_amount);
    acc[vendor].count += 1;
    return acc;
  }, {});

  const topVendors = Object.values(purchaseByVendor || {})
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 10);

  // Low stock products
  const lowStockProducts = Array.isArray(productsData) ? productsData.filter((p: any) => {
    // Check stock by location
    if (!p.stock_by_location || p.stock_by_location.length === 0) {
      return true; // No stock at all
    }
    // Check if any location has low stock
    const hasLowStock = p.stock_by_location.some((stock: any) => 
      stock.quantity < (p.min_stock_level || 10)
    );
    return hasLowStock;
  }) : [];

  const exportReport = (reportName: string, data: any[]) => {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive business insights and reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                <p className="text-xs text-muted-foreground mt-1">{salesCount} invoices</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPurchases)}</p>
                <p className="text-xs text-muted-foreground mt-1">{purchaseCount} invoices</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(grossProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Margin: {profitMargin}%</p>
              </div>
              <DollarSign className={`h-8 w-8 ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalSales - totalSalesPaid)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Unpaid sales</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Report</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="locations">By Location</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Sales Report</CardTitle>
                <Button onClick={() => exportReport('sales-report', salesData || [])} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData?.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{formatDateTime(invoice.created_at)}</TableCell>
                        <TableCell>{invoice.customer_name || 'Walk-in'}</TableCell>
                        <TableCell>{invoice.location_name || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.paid_amount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : invoice.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.payment_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Report */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Purchase Report</CardTitle>
                <Button onClick={() => exportReport('purchase-report', purchaseData || [])} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseData?.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{formatDateTime(invoice.created_at)}</TableCell>
                        <TableCell>{invoice.vendor_name || 'Unknown'}</TableCell>
                        <TableCell>{invoice.location_name || 'N/A'}</TableCell>
                        <TableCell className="text-right text-red-600">-{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell className="text-right text-red-600">-{formatCurrency(invoice.paid_amount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : invoice.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.payment_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Customers */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Top Customers</CardTitle>
                <Button onClick={() => exportReport('top-customers', topCustomers)} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer: any, index: number) => (
                      <TableRow key={customer.name}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {customer.name}
                        </TableCell>
                        <TableCell className="text-right">{customer.count}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(customer.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.total / customer.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales by Location */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Sales by Location</CardTitle>
                <Button onClick={() => exportReport('location-sales', locationSales)} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationSales.map((location: any) => (
                      <TableRow key={location.name}>
                        <TableCell className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {location.name}
                        </TableCell>
                        <TableCell className="text-right">{location.count}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(location.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(location.total / location.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Low Stock Alert</CardTitle>
                <Button onClick={() => exportReport('low-stock', lowStockProducts)} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          All products are well stocked
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockProducts.flatMap((product: any) => {
                        const minStock = product.min_stock_level || 10;
                        
                        if (!product.stock_by_location || product.stock_by_location.length === 0) {
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name_en}</TableCell>
                              <TableCell>{product.sku}</TableCell>
                              <TableCell className="text-red-600">No Stock</TableCell>
                              <TableCell className="text-right text-red-600 font-bold">0</TableCell>
                              <TableCell className="text-right">{minStock}</TableCell>
                              <TableCell>
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Critical
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return product.stock_by_location
                          .filter((stock: any) => stock.quantity < minStock)
                          .map((stock: any, idx: number) => (
                            <TableRow key={`${product.id}-${stock.location_name}-${idx}`}>
                              <TableCell className="font-medium">{product.name_en}</TableCell>
                              <TableCell>{product.sku}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {stock.location_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-orange-600 font-semibold">{stock.quantity}</TableCell>
                              <TableCell className="text-right">{minStock}</TableCell>
                              <TableCell>
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Low Stock
                                </span>
                              </TableCell>
                            </TableRow>
                          ));
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
