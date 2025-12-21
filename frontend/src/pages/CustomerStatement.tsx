import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft, 
  Printer, 
  Calendar,
  FileText,
  CreditCard,
  Receipt,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportCustomerStatementPDF } from '@/lib/exportPDF';
import * as XLSX from 'xlsx';

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

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Statement_${statement?.customer?.name || 'Customer'}_${dateRange.to_date}`,
  });

  const handleExportPDF = async () => {
    if (!statement) return;
    await exportCustomerStatementPDF(
      statement.transactions || [],
      { 
        name: statement.customer?.name || 'Customer', 
        phone: statement.customer?.phone, 
        email: statement.customer?.email 
      },
      dateRange.from_date,
      dateRange.to_date,
      statement.opening_balance || 0,
      statement.closing_balance || 0
    );
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Account Statement</h1>
            <p className="text-muted-foreground">{statement?.customer?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Period:</span>
            </div>
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

      {/* Printable Statement */}
      <div ref={printRef} className="bg-white dark:bg-card rounded-lg">
        {/* Statement Header for Print */}
        <div className="p-6 border-b print:border-b-2">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <p className="text-xl font-bold">{formatCurrency(statement?.opening_balance || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600">Total Invoices</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(statement?.total_debit || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <p className="text-sm text-green-600">Total Payments</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(statement?.total_credit || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10">
            <CardContent className="p-4">
              <p className="text-sm text-primary">Closing Balance</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(statement?.closing_balance || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <div className="px-6 pb-6">
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
    </div>
  );
}
