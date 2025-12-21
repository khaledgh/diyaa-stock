import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft, 
  Printer, 
  Calendar,
  Users,
  DollarSign,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportSalesByCustomer } from '@/lib/exportExcel';
import { exportSalesByCustomerPDF } from '@/lib/exportPDF';

export default function SalesByCustomer() {
  const printRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState({
    from_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['sales-by-customer', dateRange],
    queryFn: async () => {
      const response = await reportApi.salesByCustomer(dateRange);
      return response.data.data || response.data;
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Sales_By_Customer_${dateRange.from_date}_${dateRange.to_date}`,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-600" />
              Sales by Customer
            </h1>
            <p className="text-muted-foreground">Customer sales breakdown</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportSalesByCustomer(report?.customers || [], dateRange.from_date, dateRange.to_date)} 
            className="gap-2"
            disabled={!report?.customers?.length}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportSalesByCustomerPDF(report?.customers || [], dateRange.from_date, dateRange.to_date)} 
            className="gap-2"
            disabled={!report?.customers?.length}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Period:</span>
            <input
              type="date"
              value={dateRange.from_date}
              onChange={(e) => setDateRange({ ...dateRange, from_date: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.to_date}
              onChange={(e) => setDateRange({ ...dateRange, to_date: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="bg-white dark:bg-card rounded-lg">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Sales by Customer</h2>
              <p className="text-muted-foreground mt-1">
                {formatDate(dateRange.from_date)} - {formatDate(dateRange.to_date)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(report?.summary?.total_sales || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Total Sales</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(report?.summary?.total_sales || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(report?.summary?.total_paid || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Credit Notes</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(report?.summary?.total_credit_notes || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Outstanding</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(report?.summary?.total_outstanding || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Customers</p>
              <p className="text-lg font-bold">
                {report?.summary?.total_customers || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Customer Table */}
        <div className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Credit Notes</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report?.customers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    No sales in this period
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {report?.customers?.map((customer: any, index: number) => (
                    <TableRow key={customer.customer_id || index} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {customer.customer_id > 0 ? (
                          <Link 
                            to={`/customers/${customer.customer_id}/statement`}
                            className="text-primary hover:underline"
                          >
                            {customer.customer_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{customer.customer_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.invoice_count}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.total_sales)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {customer.total_credit_notes > 0 ? formatCurrency(customer.total_credit_notes) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(customer.total_paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.total_outstanding) > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {formatCurrency(customer.total_outstanding)}
                          </span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(report?.summary?.total_sales || 0)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(report?.summary?.total_credit_notes || 0)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(report?.summary?.total_paid || 0)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(report?.summary?.total_outstanding || 0)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t text-center text-sm text-muted-foreground">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
