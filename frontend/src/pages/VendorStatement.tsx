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
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportVendorStatementPDF } from '@/lib/exportPDF';


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
    if (!statement) return;
    
    // Calculate balances for statement PDF
    let runningBalance = statement.opening_balance || 0;
    const transactionsWithBalance = (statement.transactions || []).map((t: any) => {
        runningBalance = runningBalance + (Number(t.debit) || 0) - (Number(t.credit) || 0);
        return { ...t, running_balance: runningBalance };
    });

    await exportVendorStatementPDF(
      transactionsWithBalance,
      { 
        name: statement.vendor?.name || 'Vendor', 
        phone: statement.vendor?.phone, 
        email: statement.vendor?.email,
        address: statement.vendor?.address
      },
      dateRange.from_date,
      dateRange.to_date,
      statement.opening_balance || 0,
      statement.closing_balance || 0
    );
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Statement_${statement?.vendor?.name || 'Vendor'}_${dateRange.to_date}`,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'credit_note':
        return <Receipt className="h-4 w-4 text-blue-500" />;
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

  // Calculate running balance
  let runningBalance = statement?.opening_balance || 0;
  const transactionsWithBalance = statement?.transactions?.map((t: any) => {
    runningBalance = runningBalance + (Number(t.debit) || 0) - (Number(t.credit) || 0);
    return { ...t, running_balance: runningBalance };
  }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/vendors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Vendor Statement
            </h1>
            <p className="text-muted-foreground">
              {statement?.vendor?.name} • {statement?.vendor?.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Date Range Filter */}
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

      {/* Printable Statement */}
      <div ref={printRef} className="bg-white dark:bg-card rounded-lg print:shadow-none">
        {/* Statement Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{statement?.vendor?.name}</h2>
              <p className="text-muted-foreground">{statement?.vendor?.phone}</p>
              <p className="text-muted-foreground">{statement?.vendor?.address}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Statement Period</p>
              <p className="font-medium">
                {formatDate(dateRange.from_date)} - {formatDate(dateRange.to_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-muted/30">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className="text-lg font-semibold">
              {formatCurrency(statement?.opening_balance || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Bills</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(statement?.total_debit || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(statement?.total_credit || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Closing Balance</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(statement?.closing_balance || 0)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
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
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(transaction.type)}`}>
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
    </div>
  );
}
