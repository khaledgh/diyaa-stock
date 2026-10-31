import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Package, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Page, PageHeader } from '@/components/layout/Page';
import { formatCurrency } from '@/lib/utils';
import { productApi, categoryApi, productTypeApi } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';

const productSchema = z.object({
  sku: z.string().max(50, 'SKU must be less than 50 characters'),
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
        is_active: product.is_active ? 1 : 0,
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

  const unitPrice = parseFloat(watch('unit_price') || '0') || 0;
  const costPrice = parseFloat(watch('cost_price') || '0') || 0;
  const isActive = watch('is_active') === 1;
  const profit = unitPrice - costPrice;
  const margin = unitPrice > 0 ? (profit / unitPrice) * 100 : null;
  const saving = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const FieldError = ({ message }: { message?: string }) =>
    message ? (
      <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
        <AlertCircle className="h-3 w-3" />
        {message}
      </p>
    ) : null;

  return (
    <Page className="max-w-6xl">
      <PageHeader
        backTo="/products"
        icon={Package}
        title={isEditing ? t('products.editProduct') : t('products.addProduct')}
        description={isEditing ? 'Update product details, prices and stock alerts' : 'Add a new product to your catalog'}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Basic information</h2>
            </div>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name_en">{t('products.nameEn')} *</Label>
                <Input id="name_en" {...register('name_en')} className={errors.name_en ? 'border-red-500' : ''} placeholder="e.g. Labneh 2kg" />
                <FieldError message={errors.name_en?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name_ar">{t('products.nameAr')}</Label>
                <Input id="name_ar" dir="rtl" {...register('name_ar')} className={errors.name_ar ? 'border-red-500' : ''} placeholder="الاسم بالعربية" />
                <FieldError message={errors.name_ar?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">{t('products.sku')}</Label>
                <Input id="sku" {...register('sku')} className={`font-mono ${errors.sku ? 'border-red-500' : ''}`} placeholder="Optional" />
                <FieldError message={errors.sku?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcode">{t('products.barcode')}</Label>
                <Input id="barcode" {...register('barcode')} className={`font-mono ${errors.barcode ? 'border-red-500' : ''}`} placeholder="Optional" />
                <FieldError message={errors.barcode?.message} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t('products.category')}</Label>
                  <Link to="/categories" className="text-xs font-medium text-primary hover:underline">Manage</Link>
                </div>
                <Combobox
                  options={(categories?.map((cat: any) => ({ value: cat.id.toString(), label: cat.name_ar && cat.name_ar !== cat.name_en ? `${cat.name_en} · ${cat.name_ar}` : cat.name_en })) || [])}
                  value={categoryId}
                  onChange={(value) => setValue('category_id', value)}
                  placeholder="No category"
                  searchPlaceholder="Search categories..."
                  emptyText="No categories found"
                  clearable
                />
                <FieldError message={errors.category_id?.message} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t('products.type')}</Label>
                  <Link to="/product-types" className="text-xs font-medium text-primary hover:underline">Manage</Link>
                </div>
                <Combobox
                  options={(productTypes?.map((type: any) => ({ value: type.id.toString(), label: type.name_ar && type.name_ar !== type.name_en ? `${type.name_en} · ${type.name_ar}` : type.name_en })) || [])}
                  value={typeId}
                  onChange={(value) => setValue('type_id', value)}
                  placeholder="No type"
                  searchPlaceholder="Search types..."
                  emptyText="No types found"
                  clearable
                />
                <FieldError message={errors.type_id?.message} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Pricing & stock</h2>
            </div>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="cost_price">{t('products.costPrice')} *</Label>
                <Input id="cost_price" type="number" step="0.01" min="0" {...register('cost_price')} className={`text-end tabular-nums ${errors.cost_price ? 'border-red-500' : ''}`} />
                <FieldError message={errors.cost_price?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit_price">{t('products.unitPrice')} *</Label>
                <Input id="unit_price" type="number" step="0.01" min="0" {...register('unit_price')} className={`text-end tabular-nums ${errors.unit_price ? 'border-red-500' : ''}`} />
                <FieldError message={errors.unit_price?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">{t('products.unit')} *</Label>
                <Input id="unit" {...register('unit')} className={errors.unit ? 'border-red-500' : ''} placeholder="piece, kg, box…" />
                <FieldError message={errors.unit?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min_stock_level">{t('products.minStock')}</Label>
                <Input id="min_stock_level" type="number" min="0" {...register('min_stock_level')} className={`text-end tabular-nums ${errors.min_stock_level ? 'border-red-500' : ''}`} />
                <p className="text-xs text-muted-foreground">0 uses the default alert level (10)</p>
                <FieldError message={errors.min_stock_level?.message} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-4">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label>{t('common.status')}</Label>
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="radiogroup" aria-label={t('common.status')}>
                  {[
                    { v: 1, label: t('common.active') },
                    { v: 0, label: t('common.inactive') },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={(isActive ? 1 : 0) === o.v}
                      onClick={() => setValue('is_active', o.v, { shouldDirty: true })}
                      className={`rounded-md py-1.5 text-sm font-medium transition-colors ${(isActive ? 1 : 0) === o.v ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{isActive ? 'Available in POS and invoices' : 'Hidden from POS and new invoices'}</p>
              </div>

              <dl className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Profit per unit</dt>
                  <dd className={`font-semibold tabular-nums ${profit < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(profit)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Margin</dt>
                  <dd className={`font-semibold tabular-nums ${margin !== null && margin < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {margin === null ? '—' : `${margin.toFixed(1)}%`}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="me-1.5 h-4 w-4" />
                  {saving ? 'Saving…' : t('common.save')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/products')} className="w-full text-muted-foreground">
                  {t('common.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </Page>
  );
}
