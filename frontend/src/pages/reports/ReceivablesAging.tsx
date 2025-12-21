import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft, 
  Printer, 
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportReceivablesAging } from '@/lib/exportExcel';
import { exportReceivablesAgingPDF } from '@/lib/exportPDF';

export default function ReceivablesAging() {
  const printRef = useRef<HTMLDivElement>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['receivables-aging', asOfDate],
    queryFn: async () => {
      const response = await reportApi.receivablesAging({ as_of_date: asOfDate });
      return response.data.data || response.data;
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Receivables_Aging_${asOfDate}`,
  });

  const agingColumns = [
    { key: 'current_amount', label: 'Current', color: 'text-green-600' },
    { key: 'days_1_15', label: '1-15 Days', color: 'text-yellow-600' },
    { key: 'days_16_30', label: '16-30 Days', color: 'text-orange-500' },
    { key: 'days_31_45', label: '31-45 Days', color: 'text-orange-600' },
    { key: 'days_over_45', label: '45+ Days', color: 'text-red-600' },
  ];

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
              <TrendingUp className="h-6 w-6 text-green-600" />
              Receivables Aging Summary
            </h1>
            <p className="text-muted-foreground">Outstanding customer invoices by age</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportReceivablesAging(report?.customers || [], asOfDate)} 
            className="gap-2"
            disabled={!report?.customers?.length}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => await exportReceivablesAgingPDF(report?.customers || [], asOfDate)} 
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
          <div className="flex items-center gap-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">As of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="bg-white dark:bg-card rounded-lg">
        {/* Header for Print */}
        <div className="p-6 border-b print:border-b-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Receivables Aging Summary</h2>
              <p className="text-muted-foreground mt-1">As of {formatDate(asOfDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(report?.summary?.grand_total || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6">
          {agingColumns.map((col) => (
            <Card key={col.key} className="text-center">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">{col.label}</p>
                <p className={`text-lg font-bold ${col.color}`}>
                  {formatCurrency(report?.summary?.[col.key] || 0)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customer Table */}
        <div className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right text-green-600">Current</TableHead>
                <TableHead className="text-right text-yellow-600">1-15 Days</TableHead>
                <TableHead className="text-right text-orange-500">16-30 Days</TableHead>
                <TableHead className="text-right text-orange-600">31-45 Days</TableHead>
                <TableHead className="text-right text-red-600">45+ Days</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report?.customers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    No outstanding receivables
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {report?.customers?.map((customer: any) => (
                    <TableRow key={customer.customer_id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <Link 
                          to={`/customers/${customer.customer_id}/statement`}
                          className="text-primary hover:underline"
                        >
                          {customer.customer_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.customer_phone || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.current_amount) > 0 
                          ? formatCurrency(customer.current_amount) 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.days_1_15) > 0 
                          ? formatCurrency(customer.days_1_15) 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.days_16_30) > 0 
                          ? formatCurrency(customer.days_16_30) 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.days_31_45) > 0 
                          ? <span className="text-orange-600">{formatCurrency(customer.days_31_45)}</span>
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.days_over_45) > 0 
                          ? <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {formatCurrency(customer.days_over_45)}
                            </span>
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(customer.total_outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={2}>
                      Total ({report?.summary?.total_customers} customers)
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(report?.summary?.current_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {formatCurrency(report?.summary?.days_1_15 || 0)}
                    </TableCell>
                    <TableCell className="text-right text-orange-500">
                      {formatCurrency(report?.summary?.days_16_30 || 0)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(report?.summary?.days_31_45 || 0)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(report?.summary?.days_over_45 || 0)}
                    </TableCell>
                    <TableCell className="text-right text-lg">
                      {formatCurrency(report?.summary?.grand_total || 0)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer for Print */}
        <div className="p-6 border-t text-center text-sm text-muted-foreground print:mt-8">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
