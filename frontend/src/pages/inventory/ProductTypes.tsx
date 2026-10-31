import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColumnDef, DataTable } from '@/components/data-table/DataTable';
import { Page, PageHeader, RowAction, RowActions } from '@/components/layout/Page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { productTypeApi } from '@/lib/api';

interface ProductType {
  id: number;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: number;
}

export default function ProductTypes() {
  // const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description: '',
  });

  const { data: productTypes, isLoading } = useQuery({
    queryKey: ['product-types'],
    queryFn: async () => {
      const response = await productTypeApi.getAll();
      return response.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Product type created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productTypeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Product type updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Product type deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product type');
    },
  });

  const handleOpenDialog = (productType?: ProductType) => {
    if (productType) {
      setEditingType(productType);
      setFormData({
        name_en: productType.name_en,
        name_ar: productType.name_ar || '',
        description: productType.description || '',
      });
    } else {
      setEditingType(null);
      setFormData({ name_en: '', name_ar: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData({ name_en: '', name_ar: '', description: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this product type?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'name_en',
      header: 'Name',
      alwaysVisible: true,
      value: (r) => r.name_en,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name_en}</p>
          {r.name_ar && <p className="truncate text-xs text-muted-foreground" dir="auto">{r.name_ar}</p>}
        </div>
      ),
    },
    { id: 'description', header: 'Description', value: (r) => r.description, cell: (r) => <span className="line-clamp-1 text-muted-foreground">{r.description || '—'}</span> },
    {
      id: 'actions',
      header: '',
      alwaysVisible: true,
      sortable: false,
      align: 'end',
      cell: (r) => (
        <RowActions>
          <RowAction label="Edit" icon={Edit} onClick={() => handleOpenDialog(r)} />
          <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(r.id)} />
        </RowActions>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        icon={Shapes}
        title="Product Types"
        description="Classify products by type"
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="me-1.5 h-4 w-4" />
            Add Product Type
          </Button>
        }
      />
      <DataTable
        data={productTypes || []}
        columns={columns}
        rowKey={(r) => r.id}
        loading={isLoading}
        defaultSort={{ id: 'name_en', dir: 'asc' }}
        searchPlaceholder="Search name or description…"
        onRowClick={(r) => handleOpenDialog(r)}
        exportFileName="product-types"
        emptyTitle="Nothing here yet"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Product Type' : 'Add Product Type'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name_en">
                Name (English) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name_en"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="Enter product type name in English"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">Name (Arabic)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="Enter product type name in Arabic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingType
                  ? 'Update'
                  : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
