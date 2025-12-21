import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  TrendingUp,
  Clock,
  Receipt,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerApi, invoiceApi, paymentApi, reportApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomerOverview() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch customer details
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await customerApi.getById(Number(id));
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  // Fetch recent invoices
  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ 
        customer_id: id, 
        invoice_type: 'sales',
        limit: 10 
      });
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  // Fetch recent payments
  const { data: payments } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const response = await paymentApi.getAll({ 
        customer_id: id, 
        limit: 10 
      });
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  // Fetch statement summary
  const { data: statement } = useQuery({
    queryKey: ['customer-statement-summary', id],
    queryFn: async () => {
      const fromDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        .toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      const response = await reportApi.customerStatement(Number(id), { 
        from_date: fromDate, 
        to_date: toDate 
      });
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate totals
  const totalSales = statement?.total_debit || 0;
  const totalPayments = statement?.total_credit || 0;
  const balance = statement?.closing_balance || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{customer?.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mt-1">
                {customer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </span>
                )}
                {customer?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/customers/${id}/statement`}>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Statement
            </Button>
          </Link>
          <Link to={`/invoices/new?customer_id=${id}`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Receipt className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalSales)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPayments)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className={`text-2xl font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credit Limit</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(customer?.credit_limit || 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{customer?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer?.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{customer?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">{customer?.payment_terms || 'Net 30'}</p>
                  </div>
                </div>
                {customer?.address && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> Address
                    </p>
                    <p className="font-medium">{customer.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statement?.transactions?.slice(0, 5).map((tx: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <div className="text-right">
                        {Number(tx.debit) > 0 ? (
                          <p className="text-red-600">+{formatCurrency(tx.debit)}</p>
                        ) : (
                          <p className="text-green-600">-{formatCurrency(tx.credit)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!statement?.transactions || statement.transactions.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">No recent transactions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <Link to={`/invoices/sales?customer_id=${id}`}>
                <Button variant="link" size="sm" className="gap-1">
                  View All <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices?.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Link to={`/invoices/sales/${invoice.id}`} className="text-primary hover:underline">
                            {invoice.invoice_number}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(invoice.paid_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : invoice.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <Link to={`/payments?customer_id=${id}`}>
                <Button variant="link" size="sm" className="gap-1">
                  View All <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments?.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.payment_number || `#${payment.id}`}</TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
