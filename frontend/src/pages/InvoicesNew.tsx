import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Plus, Search, ChevronLeft, ChevronRight, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function InvoicesNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sales'>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', invoiceType, searchQuery, currentPage, pageSize],
    queryFn: async () => {
      const response = await invoiceApi.getAll({ 
        invoice_type: invoiceType,
        search: searchQuery || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      });
      const payload = response?.data;

      const defaultResult = { data: [], pagination: { total: 0, pages: 1, page: 1 } } as {
        data: any[];
        pagination: { total: number; pages: number; page: number };
      };

      if (!payload) return defaultResult;

      if (Array.isArray(payload)) {
        return {
          data: payload,
          pagination: { total: payload.length, pages: 1, page: 1 },
        };
      }

      if (payload.invoices) {
        const inv = payload.invoices;
        if (Array.isArray(inv)) {
          return { data: inv, pagination: { total: inv.length, pages: 1, page: 1 } };
        }
        const dataArr = Array.isArray(inv?.data) ? inv.data : [];
        const pag = inv?.pagination || { total: dataArr.length, pages: 1, page: 1 };
        return { data: dataArr, pagination: pag };
      }

      if (payload.data) {
        const maybeData = payload.data;
        if (Array.isArray(maybeData)) {
          return {
            data: maybeData,
            pagination: payload.pagination || { total: maybeData.length, pages: 1, page: 1 },
          };
        }
        const innerData = Array.isArray(maybeData?.data) ? maybeData.data : [];
        const pag = maybeData?.pagination || payload.pagination || { total: innerData.length, pages: 1, page: 1 };
        return { data: innerData, pagination: pag };
      }

      return defaultResult;
    },
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await invoiceApi.getStats();
      return response.data.data;
    },
  });

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination || { total: 0, pages: 1, page: 1 };

  const handleViewDetails = (invoiceId: number) => {
    // Navigate to appropriate detail page based on invoice type
    if (invoiceType === 'purchase') {
      navigate(`/invoices/purchase/${invoiceId}`);
    } else {
      navigate(`/invoices/sales/${invoiceId}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('invoices.title') || 'Invoices'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoiceType === 'purchase' 
              ? 'Purchase invoices add stock to locations' 
              : 'Sales invoices reduce location stock'}
          </p>
        </div>
        <Button onClick={() => navigate(`/invoices/new?type=${invoiceType}`)} size="lg" className="shadow-lg">
          <Plus className="mr-2 h-5 w-5" />
          {invoiceType === 'purchase' ? 'New Purchase' : 'New Sale'}
        </Button>
      </div>

      {/* Invoice Type Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${invoiceType === 'purchase' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:bg-muted'}`}
          onClick={() => {
            setInvoiceType('purchase');
            setCurrentPage(1);
            setSearchQuery('');
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Purchase</h3>
                </div>
                <p className="text-sm text-muted-foreground">From suppliers</p>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {invoiceStats?.purchase_count || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${invoiceType === 'sales' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : 'hover:bg-muted'}`}
          onClick={() => {
            setInvoiceType('sales');
            setCurrentPage(1);
            setSearchQuery('');
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Sales</h3>
                </div>
                <p className="text-sm text-muted-foreground">To customers</p>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {invoiceStats?.sales_count || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        {invoiceType === 'purchase' ? 'Vendor' : 'Customer'}
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">Location</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices?.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {invoice.invoice_number}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDateTime(invoice.created_at)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {invoiceType === 'purchase' 
                              ? (invoice.vendor?.name || invoice.vendor?.company || '-')
                              : (invoice.customer?.name || '-')}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {invoice.location?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right">
                            {formatCurrency(invoice.paid_amount)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : invoice.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {invoice.payment_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(invoice.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {pagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage === pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
