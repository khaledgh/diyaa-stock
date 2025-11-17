import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { customerApi } from '@/lib/api';

export default function Customers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    credit_limit: '0',
  });

  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['customers', searchTerm, page],
    queryFn: async () => {
      try {
        const response = await customerApi.getAll({
          search: searchTerm,
          page,
          per_page: perPage
        });
        
        console.log('Customer API Response:', response.data);
        
        // Backend returns PaginationResponse directly: { data: [], total: 46, current_page: 1, per_page: 20, total_pages: 3 }
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
        console.error('Failed to fetch customers:', error);
        return { data: [], pagination: null };
      }
    },
  });

  const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : [];
  const pagination = customersResponse?.pagination;
  
  console.log('Customers:', customers, 'Pagination:', pagination);

  const createMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer saved successfully');
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => customerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
  });

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: '0' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };


  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            {t('customers.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your customer database</p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="lg" className="shadow-lg">
          <Plus className="mr-2 h-5 w-5" />
          {t('customers.addCustomer')}
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search customers by name, phone, or email..."
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
                  <TableHead>{t('customers.name')}</TableHead>
                  <TableHead>{t('customers.phone')}</TableHead>
                  <TableHead>{t('customers.email')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No customers found matching your search' : 'No customers yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers?.map((customer: any) => (
                    <TableRow key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(customer)} title="Edit">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(customer.id)} title="Delete">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('customers.name')} *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  className="h-11"
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('customers.phone')}</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  className="h-11"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('customers.email')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  className="h-11"
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('customers.address')}</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  className="h-11"
                  placeholder="Enter address"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} size="lg">
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="lg">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
