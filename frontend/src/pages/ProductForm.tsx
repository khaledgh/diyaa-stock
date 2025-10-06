import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { productApi, categoryApi, productTypeApi } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU must be less than 50 characters'),
  barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
  name_en: z.string().min(1, 'Product name is required').max(200, 'Name must be less than 200 characters'),
  name_ar: z.string().max(200, 'Name must be less than 200 characters').optional(),
  category_id: z.string().optional(),
  type_id: z.string().optional(),
  unit_price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Unit price must be greater than 0',
  }),
  cost_price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: 'Cost price cannot be negative',
  }),
  unit: z.string().min(1, 'Unit is required'),
  min_stock_level: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: 'Minimum stock level cannot be negative',
  }),
  is_active: z.number(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      barcode: '',
      name_en: '',
      name_ar: '',
      category_id: '',
      type_id: '',
      unit_price: '',
      cost_price: '',
      unit: 'piece',
      min_stock_level: '0',
      is_active: 1,
    },
  });

  const categoryId = watch('category_id');
  const typeId = watch('type_id');

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await productApi.getById(Number(id!));
      return response.data.data;
    },
    enabled: isEditing,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoryApi.getAll();
      return response.data.data || [];
    },
  });

  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: async () => {
      const response = await productTypeApi.getAll();
      return response.data.data || [];
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        barcode: product.barcode || '',
        name_en: product.name_en,
        name_ar: product.name_ar || '',
        category_id: product.category_id?.toString() || '',
        type_id: product.type_id?.toString() || '',
        unit_price: product.unit_price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        unit: product.unit || 'piece',
        min_stock_level: product.min_stock_level?.toString() || '0',
        is_active: product.is_active,
      });
    }
  }, [product, reset]);

  const createMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('common.saveSuccess') || 'Product saved successfully');
      navigate('/products');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => productApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('common.updateSuccess') || 'Product updated successfully');
      navigate('/products');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (isEditing) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (loadingProduct) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditing ? t('products.editProduct') : t('products.addProduct')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditing ? 'Update product information' : 'Add a new product to your inventory'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku">{t('products.sku')} *</Label>
                <Input
                  id="sku"
                  {...register('sku')}
                  className={`h-11 ${errors.sku ? 'border-red-500' : ''}`}
                />
                {errors.sku && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.sku.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">{t('products.barcode')}</Label>
                <Input
                  id="barcode"
                  {...register('barcode')}
                  className={`h-11 ${errors.barcode ? 'border-red-500' : ''}`}
                />
                {errors.barcode && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.barcode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">{t('products.nameEn')} *</Label>
                <Input
                  id="name_en"
                  {...register('name_en')}
                  className={`h-11 ${errors.name_en ? 'border-red-500' : ''}`}
                />
                {errors.name_en && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name_en.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('products.nameAr')}</Label>
                <Input
                  id="name_ar"
                  {...register('name_ar')}
                  className={`h-11 ${errors.name_ar ? 'border-red-500' : ''}`}
                />
                {errors.name_ar && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name_ar.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">{t('products.category')}</Label>
                <Combobox
                  options={[
                    { value: '', label: 'Select category...' },
                    ...(categories?.map((cat: any) => ({
                      value: cat.id.toString(),
                      label: cat.name_en,
                    })) || [])
                  ]}
                  value={categoryId}
                  onChange={(value) => setValue('category_id', value)}
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                  emptyText="No categories found"
                />
                {errors.category_id && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_id">{t('products.type')}</Label>
                <Combobox
                  options={[
                    { value: '', label: 'Select type...' },
                    ...(productTypes?.map((type: any) => ({
                      value: type.id.toString(),
                      label: type.name_en,
                    })) || [])
                  ]}
                  value={typeId}
                  onChange={(value) => setValue('type_id', value)}
                  placeholder="Select product type"
                  searchPlaceholder="Search types..."
                  emptyText="No types found"
                />
                {errors.type_id && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.type_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">{t('products.unit')}</Label>
                <Input
                  id="unit"
                  {...register('unit')}
                  className={`h-11 ${errors.unit ? 'border-red-500' : ''}`}
                />
                {errors.unit && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">{t('products.unitPrice')} *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  {...register('unit_price')}
                  className={`h-11 ${errors.unit_price ? 'border-red-500' : ''}`}
                />
                {errors.unit_price && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.unit_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price">{t('products.costPrice')} *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  {...register('cost_price')}
                  className={`h-11 ${errors.cost_price ? 'border-red-500' : ''}`}
                />
                {errors.cost_price && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.cost_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock_level">{t('products.minStock')}</Label>
                <Input
                  id="min_stock_level"
                  type="number"
                  {...register('min_stock_level')}
                  className={`h-11 ${errors.min_stock_level ? 'border-red-500' : ''}`}
                />
                {errors.min_stock_level && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.min_stock_level.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">{t('common.status')}</Label>
                <select
                  id="is_active"
                  {...register('is_active', { valueAsNumber: true })}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={1}>{t('common.active')}</option>
                  <option value={0}>{t('common.inactive')}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <Button type="button" variant="outline" onClick={() => navigate('/products')} size="lg">
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                size="lg"
                className="min-w-32"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
