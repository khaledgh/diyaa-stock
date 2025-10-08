import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { invoiceApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function Transactions() {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Fetch sales invoices (income)
  const { data: salesInvoices } = useQuery({
    queryKey: ['sales-invoices-transactions'],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ invoice_type: 'sales' });
      return response.data.data?.data || [];
    },
  });

  // Fetch purchase invoices (expense)
  const { data: purchaseInvoices } = useQuery({
    queryKey: ['purchase-invoices-transactions'],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ invoice_type: 'purchase' });
      return response.data.data?.data || [];
    },
  });

  // Combine all transactions
  const allTransactions = [
    ...(salesInvoices?.map((invoice: any) => ({
      id: invoice.id,
      type: 'sales',
      invoice_number: invoice.invoice_number,
      date: invoice.created_at,
      description: `Sales to ${invoice.customer_name || 'Walk-in Customer'}`,
      location: invoice.location_name,
      amount: Number(invoice.total_amount),
      paid_amount: Number(invoice.paid_amount),
      payment_status: invoice.payment_status,
      isIncome: true,
    })) || []),
    ...(purchaseInvoices?.map((invoice: any) => ({
      id: invoice.id,
      type: 'purchase',
      invoice_number: invoice.invoice_number,
      date: invoice.created_at,
      description: `Purchase from ${invoice.vendor_name || 'Supplier'}`,
      location: invoice.location_name,
      amount: -Number(invoice.total_amount), // Negative for expenses
      paid_amount: -Number(invoice.paid_amount), // Negative for expenses
      payment_status: invoice.payment_status,
      isIncome: false,
    })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter transactions
  const filteredTransactions = allTransactions.filter(transaction => {
    if (filterType === 'income' && !transaction.isIncome) return false;
    if (filterType === 'expense' && transaction.isIncome) return false;
    
    // Date filtering
    if (dateRange !== 'all') {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateRange === 'today' && daysDiff > 0) return false;
      if (dateRange === 'week' && daysDiff > 7) return false;
      if (dateRange === 'month' && daysDiff > 30) return false;
    }
    
    return true;
  });

  // Calculate totals
  const totalIncome = allTransactions
    .filter(t => t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = Math.abs(allTransactions
    .filter(t => !t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0));
  
  const netProfit = totalIncome - totalExpense;

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Invoice #', 'Description', 'Location', 'Amount', 'Paid', 'Status'];
    const rows = filteredTransactions.map(t => [
      formatDateTime(t.date),
      t.type,
      t.invoice_number,
      t.description,
      t.location || 'N/A',
      t.amount.toFixed(2),
      t.paid_amount.toFixed(2),
      t.payment_status,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">All Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete financial transaction history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1">From sales invoices</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                <p className="text-xs text-muted-foreground mt-1">From purchases</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Income - Expenses</p>
              </div>
              <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Transactions</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={`${transaction.type}-${transaction.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.isIncome 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {transaction.isIncome ? (
                            <><ArrowUpCircle className="h-3 w-3" /> Income</>
                          ) : (
                            <><ArrowDownCircle className="h-3 w-3" /> Expense</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.invoice_number}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.location || 'N/A'}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.isIncome ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Math.abs(transaction.paid_amount))}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : transaction.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {transaction.payment_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
