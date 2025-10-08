import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['products', searchTerm, page],
    queryFn: async () => {
      try {
        const response = await productApi.getAll({ 
          search: searchTerm,
          page,
          per_page: perPage
        });
        
        console.log('Product API Response:', response.data);
        
        // The API returns: { success: true, message: "Success", data: { data: [], pagination: {} } }
        // So we need response.data.data to get { data: [...], pagination: {...} }
        
        const apiData = response.data.data || response.data;
        
        // Check if apiData has the nested structure
        if (apiData?.data && Array.isArray(apiData.data)) {
          console.log('Correct format detected: nested data array');
          return {
            data: apiData.data,
            pagination: apiData.pagination || null
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
        console.error('Failed to fetch products:', error);
        return { data: [], pagination: null };
      }
    },
  });

  const products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  const pagination = productsResponse?.pagination;
  
  console.log('Products:', products, 'Pagination:', pagination);


  const deleteMutation = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('common.deleteSuccess') || 'Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });


  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete') || 'Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('products.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your product inventory</p>
        </div>
        <Button onClick={() => navigate('/products/new')} size="lg" className="shadow-lg">
          <Plus className="mr-2 h-5 w-5" />
          {t('products.addProduct')}
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.name')}</TableHead>
                  <TableHead>{t('products.category')}</TableHead>
                  <TableHead>{t('products.type')}</TableHead>
                  <TableHead>{t('products.unitPrice')}</TableHead>
                  <TableHead>{t('products.warehouseStock')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.name_en}</TableCell>
                      <TableCell>{product.category_name_en || '-'}</TableCell>
                      <TableCell>{product.type_name_en || '-'}</TableCell>
                      <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                      <TableCell>{product.warehouse_stock || 0}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/products/edit/${product.id}`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            title="Delete"
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
