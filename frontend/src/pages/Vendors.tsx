import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { vendorApi } from '@/lib/api';
import { Building2, Plus, Edit, Trash2, Phone, Mail, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Vendors() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    payment_terms: '',
    credit_limit: '',
  });

  const { data: vendorsResponse, isLoading } = useQuery({
    queryKey: ['vendors', searchTerm, page],
    queryFn: async () => {
      try {
        const response = await vendorApi.getAll({
          search: searchTerm,
          page,
          per_page: perPage
        });
        
        console.log('Vendor API Response:', response.data);
        
        // Backend returns PaginationResponse directly: { data: [], total: X, current_page: 1, per_page: 20, total_pages: Y }
        const apiData = response.data;
        
        // Check if it's the pagination response format
        if (apiData?.data && Array.isArray(apiData.data) && apiData.total !== undefined) {
          console.log('Pagination format detected');
          return {
            data: apiData.data,
            pagination: {
              total: apiData.total,
              current_page: apiData.current_page,
              per_page: apiData.per_page,
              total_pages: apiData.total_pages
            }
          };
        }
        
        // Fallback: if apiData is directly an array (old format)
        if (Array.isArray(apiData)) {
          console.log('Old format: direct array');
          return { data: apiData, pagination: null };
        }
        
        console.log('Unknown format, returning empty. ApiData:', apiData);
        return { data: [], pagination: null };
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
        return { data: [], pagination: null };
      }
    },
  });

  const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];
  const pagination = vendorsResponse?.pagination;
  
  console.log('Vendors:', vendors, 'Pagination:', pagination);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await vendorApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(t('vendors.createSuccess'));
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error(t('vendors.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return await vendorApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(t('vendors.updateSuccess'));
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error(t('vendors.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await vendorApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(t('vendors.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('vendors.deleteError'));
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      tax_number: '',
      payment_terms: '',
      credit_limit: '',
    });
    setEditingVendor(null);
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      company_name: vendor.company_name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      tax_number: vendor.tax_number || '',
      payment_terms: vendor.payment_terms || '',
      credit_limit: vendor.credit_limit || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error(t('common.fillRequired'));
      return;
    }

    const data = {
      ...formData,
      credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
    };

    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('vendors.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-green-600" />
            {t('vendors.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('vendors.subtitle')}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('vendors.addNew')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? t('vendors.edit') : t('vendors.addNew')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>{t('vendors.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('vendors.namePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.companyName')}</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder={t('vendors.companyNamePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('common.phone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('vendors.phonePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('common.email')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('vendors.emailPlaceholder')}
                />
              </div>

              <div className="col-span-2">
                <Label>{t('common.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('vendors.addressPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.taxNumber')}</Label>
                <Input
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  placeholder={t('vendors.taxNumberPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('vendors.paymentTerms')}</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder={t('vendors.paymentTermsPlaceholder')}
                />
              </div>

              <div className="col-span-2">
                <Label>{t('vendors.creditLimit')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="col-span-2">
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? t('common.saving') 
                    : t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{t('vendors.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search vendors by name, company, phone, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-11"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('vendors.name')}</TableHead>
                  <TableHead>{t('vendors.companyName')}</TableHead>
                  <TableHead>{t('common.phone')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('vendors.paymentTerms')}</TableHead>
                  <TableHead className="text-right">{t('vendors.totalPurchases')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors?.map((vendor: any) => (
                    <TableRow key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.company_name || '-'}</TableCell>
                      <TableCell>
                        {vendor.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {vendor.phone}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {vendor.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {vendor.email}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{vendor.payment_terms || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-medium">{vendor.total_purchases || 0}</div>
                          <div className="text-xs text-gray-500">
                            ${parseFloat(vendor.total_amount || 0).toFixed(2)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/vendors/${vendor.id}/statement`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Statement
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vendor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(vendor.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          
          {pagination && pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              onPageChange={setPage}
              totalItems={pagination.total}
              itemsPerPage={pagination.per_page}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
