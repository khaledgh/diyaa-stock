import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, DollarSign, ShoppingCart, CreditCard, Calendar, Download, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LocationSalesReport() {
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Fetch location sales data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['location-sales-report', fromDate, toDate],
    queryFn: async () => {
      const response = await reportApi.locationSales({ from_date: fromDate, to_date: toDate });
      return response.data.data;
    },
  });

  const locations = reportData?.locations || [];
  const summary = reportData?.summary || {};

  const exportReport = () => {
    const headers = ['Location', 'Invoice Count', 'Total Sales', 'Total Paid', 'Total Unpaid', 'Products Sold'];
    const csvData = [
      headers.join(','),
      ...locations.map((location: any) => [
        `"${location.location_name}"`,
        location.invoice_count || 0,
        location.total_sales || 0,
        location.total_paid || 0,
        location.total_unpaid || 0,
        location.products_sold || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-sales-report-${fromDate}-to-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading location sales report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            Failed to load location sales report. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Location Sales Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sales performance by location for selected dates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
            <span className="text-sm text-muted-foreground self-center">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.total_locations || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Active locations</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.total_invoices || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all locations</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_sales || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Revenue generated</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_unpaid || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Unpaid sales</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sales by Location</CardTitle>
            <Button onClick={exportReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing sales data from {summary.date_from} to {summary.date_to}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                  <TableHead className="text-right">Products Sold</TableHead>
                  <TableHead className="text-right">Avg Order Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales data available for the selected date range
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((location: any) => {
                    const avgOrderValue = location.invoice_count > 0 ? location.total_sales / location.invoice_count : 0;
                    return (
                      <TableRow key={location.location_id}>
                        <TableCell className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{location.location_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {location.invoice_count || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(location.total_sales || 0)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(location.total_paid || 0)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(location.total_unpaid || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {location.products_sold || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(avgOrderValue)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {locations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Top Performing Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const topLocation = locations.reduce((max: any, loc: any) =>
                  (loc.total_sales || 0) > (max.total_sales || 0) ? loc : max,
                  locations[0]
                );
                return (
                  <div>
                    <p className="text-lg font-semibold">{topLocation.location_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(topLocation.total_sales || 0)} in sales
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const collectionRate = summary.total_sales > 0
                  ? ((summary.total_paid / summary.total_sales) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div>
                    <p className="text-lg font-semibold">{collectionRate}%</p>
                    <p className="text-sm text-muted-foreground">
                      Of total sales collected
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
