import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePrint } from '@/lib/print';
import {
  Printer,
  FileText,
  CreditCard,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Page, PageHeader } from '@/components/layout/Page';


export default function VendorStatement() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState({
    from_date: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
  });

  const { data: statement, isLoading } = useQuery({
    queryKey: ['vendor-statement', id, dateRange],
    queryFn: async () => {
      const response = await reportApi.vendorStatement(Number(id), dateRange);
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  const handleExportPDF = async () => {
    if (!id) return;

    try {
      // Get auth token and company settings
      const token = localStorage.getItem('auth_token');
      const companySettings = JSON.parse(localStorage.getItem('company_settings') || '{}');

      // Build URL with company info
      const params = new URLSearchParams({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
        company_name: companySettings.company_name || '',
        company_address: companySettings.company_address || '',
        company_phone: companySettings.company_phone || '',
      });

      // Call backend PDF endpoint
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/pdf/vendor-statement/${id}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to generate PDF');

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Statement_${statement?.vendor?.name || 'Vendor'}_${dateRange.from_date}_to_${dateRange.to_date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export error:', error);
    }
  };

  const handlePrint = usePrint(printRef, `Statement_${statement?.vendor?.name || 'Vendor'}_${dateRange.to_date}`);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'credit_note':
        return <Receipt className="h-4 w-6 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      invoice: 'bg-red-100 text-red-700 dark:bg-red-900/30',
      payment: 'bg-green-100 text-green-700 dark:bg-green-900/30',
      credit_note: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate running balance for vendor statement
  // Credit (invoices) increases what we owe, Debit (payments) decreases it
  let runningBalance = statement?.opening_balance || 0;
  const transactionsWithBalance = statement?.transactions?.map((t: any) => {
    runningBalance = runningBalance + (Number(t.credit) || 0) - (Number(t.debit) || 0);
    return { ...t, running_balance: runningBalance };
  }) || [];

  return (
    <Page>
      <PageHeader
        backTo="/vendors"
        icon={FileText}
        title="Vendor Statement"
        description={statement?.vendor?.name}
        actions={
          <>
            <DateRangePicker
              size="default"
              clearable={false}
              value={{ from: dateRange.from_date, to: dateRange.to_date }}
              onChange={(r) => setDateRange({ ...dateRange, from_date: r.from, to_date: r.to })}
            />

          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="gap-2"
            disabled={!statement?.transactions?.length}
          >
            <FileText className="h-4 w-4" />
            PDF (Beta)
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Statement
          </Button>
          </>
        }
      />

      {/* Printable Statement */}
      <div ref={printRef} className="overflow-hidden rounded-lg border bg-card shadow-sm print:border-0 print:shadow-none">
        {/* Statement Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-sm">
          <div className="min-w-0">
            <span className="font-semibold" dir="auto">{statement?.vendor?.name}</span>
            {[statement?.vendor?.phone, statement?.vendor?.address].filter(Boolean).map((v: string) => (
              <span key={v} className="ms-2 text-muted-foreground">· {v}</span>
            ))}
          </div>
          <span className="text-muted-foreground">
            {formatDate(dateRange.from_date)} – {formatDate(dateRange.to_date)}
          </span>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-2 border-b sm:grid-cols-5 sm:divide-x rtl:sm:divide-x-reverse">
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Opening balance</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(statement?.opening_balance || 0)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Bills</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(statement?.total_bills || 0)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Payments</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(statement?.total_payments || 0)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Returns</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-orange-600">{formatCurrency(statement?.total_credit_notes || 0)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Closing balance</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary">{formatCurrency(statement?.closing_balance || 0)}</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Opening Balance Row */}
              <TableRow className="bg-muted/30">
                <TableCell>{formatDate(dateRange.from_date)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-medium">Opening Balance</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(statement?.opening_balance || 0)}
                </TableCell>
              </TableRow>

              {transactionsWithBalance.map((transaction: any, index: number) => (
                <TableRow key={index} className="hover:bg-muted/30">
                  <TableCell className='w-[140px]'>{formatDate(transaction.date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center justify-center w-max gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(transaction.type)}`}>
                      {getTypeIcon(transaction.type)}
                      {transaction.type === 'invoice' ? 'Bill' :
                        transaction.type === 'credit_note' ? 'Credit Note' : 'Payment'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.reference}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {Number(transaction.debit) > 0 ? formatCurrency(transaction.debit) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {Number(transaction.credit) > 0 ? formatCurrency(transaction.credit) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transaction.running_balance)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Closing Balance Row */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell colSpan={4}>Closing Balance</TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(statement?.total_debit || 0)}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(statement?.total_credit || 0)}
                </TableCell>
                <TableCell className="text-right text-lg">
                  {formatCurrency(statement?.closing_balance || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Footer for Print */}
        <div className="p-6 border-t text-center text-sm text-muted-foreground print:mt-8">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </Page>
  );
}
