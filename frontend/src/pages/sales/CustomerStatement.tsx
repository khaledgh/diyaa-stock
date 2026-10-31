import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePrint } from '@/lib/print';
import {
  Printer,
  FileText,
  CreditCard,
  Receipt,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Page, PageHeader } from '@/components/layout/Page';

export default function CustomerStatement() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState({
    from_date: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
  });

  const { data: statement, isLoading } = useQuery({
    queryKey: ['customer-statement', id, dateRange],
    queryFn: async () => {
      const response = await reportApi.customerStatement(Number(id), dateRange);
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  const handlePrint = usePrint(printRef, `Statement_${statement?.customer?.name || 'Customer'}_${dateRange.to_date}`);

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
        `${import.meta.env.VITE_API_BASE_URL}/pdf/customer-statement/${id}?${params.toString()}`,
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
      a.download = `Statement_${statement?.customer?.name || 'Customer'}_${dateRange.from_date}_to_${dateRange.to_date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export error:', error);
    }
  };


  const handleExportExcel = () => {
    if (!statement || !statement.transactions) return;

    const data = [
      // Header row
      { Date: 'Opening Balance', Type: '', Reference: '', Description: '', Debit: '', Credit: '', Balance: statement.opening_balance || 0 },
      // Transaction rows
      ...statement.transactions.map((t: any) => ({
        Date: formatDate(t.date),
        Type: t.type === 'invoice' ? 'Invoice' : t.type === 'payment' ? 'Payment' : 'Credit Note',
        Reference: t.reference || '',
        Description: t.description || '',
        Debit: t.debit || '',
        Credit: t.credit || '',
        Balance: t.running_balance || ''
      })),
      // Closing balance
      { Date: 'Closing Balance', Type: '', Reference: '', Description: '', Debit: statement.total_debit || 0, Credit: statement.total_credit || 0, Balance: statement.closing_balance || 0 }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statement');
    XLSX.writeFile(wb, `Statement_${statement.customer?.name || 'Customer'}_${dateRange.to_date}.xlsx`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'credit_note':
        return <Receipt className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'Invoice';
      case 'payment':
        return 'Payment';
      case 'credit_note':
        return 'Credit Note';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Sort transactions by date
  const sortedTransactions = [...(statement?.transactions || [])].sort((a: any, b: any) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate running balance
  let runningBalance = statement?.opening_balance || 0;
  const transactionsWithBalance = sortedTransactions.map((t: any) => {
    runningBalance += (Number(t.debit) || 0) - (Number(t.credit) || 0);
    return { ...t, running_balance: runningBalance };
  });

  return (
    <Page>
      <PageHeader
        backTo="/customers"
        icon={FileText}
        title="Account Statement"
        description={[statement?.customer?.name, statement?.customer?.phone].filter(Boolean).join(' · ')}
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
            onClick={() => handleExportExcel()}
            className="gap-2"
            disabled={!statement?.transactions?.length}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportPDF()}
            className="gap-2"
            disabled={!statement?.transactions?.length}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          </>
        }
      />

      {/* Printable Statement */}
      <div ref={printRef} className="overflow-hidden rounded-lg border bg-card shadow-sm print:border-0 print:shadow-none">
        {/* Statement Header for Print */}
        <div className="hidden border-b p-6 print:block print:border-b-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Account Statement</h2>
              <p className="text-muted-foreground mt-1">
                {formatDate(dateRange.from_date)} - {formatDate(dateRange.to_date)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{statement?.customer?.name}</p>
              {statement?.customer?.phone && (
                <p className="text-sm text-muted-foreground">{statement.customer.phone}</p>
              )}
              {statement?.customer?.address && (
                <p className="text-sm text-muted-foreground">{statement.customer.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 border-b sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Opening balance</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(statement?.opening_balance || 0)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Invoiced</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(statement?.total_debit || 0)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(statement?.total_credit || 0)}</p>
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
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
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

              {transactionsWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions in this period
                  </TableCell>
                </TableRow>
              ) : (
                transactionsWithBalance.map((transaction: any, index: number) => (
                  <TableRow key={`${transaction.type}-${transaction.id}-${index}`}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <span className="text-sm">{getTypeLabel(transaction.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className="text-right">
                      {Number(transaction.debit) > 0 ? (
                        <span className="text-blue-600">{formatCurrency(transaction.debit)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(transaction.credit) > 0 ? (
                        <span className="text-green-600">{formatCurrency(transaction.credit)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(transaction.running_balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Closing Balance Row */}
              <TableRow className="bg-primary/5 font-semibold">
                <TableCell>{formatDate(dateRange.to_date)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>Closing Balance</TableCell>
                <TableCell className="text-right">{formatCurrency(statement?.total_debit || 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(statement?.total_credit || 0)}</TableCell>
                <TableCell className="text-right text-primary text-lg">
                  {formatCurrency(statement?.closing_balance || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Footer for Print */}
        <div className="p-6 border-t text-center text-sm text-muted-foreground print:mt-8">
          <p>This is a computer-generated statement and does not require a signature.</p>
          <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </Page>
  );
}
