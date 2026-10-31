import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tags } from 'lucide-react';
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
import { expenseCategoryApi } from '@/lib/api';

interface ExpenseCategory {
    id: number;
    name_en: string;
    name_ar?: string;
    description?: string;
    is_active: boolean;
}

export default function ExpenseCategories() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [formData, setFormData] = useState({
        name_en: '',
        name_ar: '',
        description: '',
    });

    const { data: categoriesData, isLoading } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await expenseCategoryApi.getAll();
            return response.data;
        },
    });

    const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : (Array.isArray(categoriesData) ? categoriesData : []);

    const createMutation = useMutation({
        mutationFn: (data: any) => expenseCategoryApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Category created successfully');
            handleCloseDialog();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create category');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            expenseCategoryApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Category updated successfully');
            handleCloseDialog();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update category');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => expenseCategoryApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Category deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        },
    });

    const handleOpenDialog = (category?: ExpenseCategory) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name_en: category.name_en,
                name_ar: category.name_ar || '',
                description: category.description || '',
            });
        } else {
            setEditingCategory(null);
            setFormData({ name_en: '', name_ar: '', description: '' });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingCategory(null);
        setFormData({ name_en: '', name_ar: '', description: '' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            const payload = {
                ...formData,
                is_active: editingCategory.is_active,
            };
            updateMutation.mutate({ id: editingCategory.id, data: payload });
        } else {
            const payload = {
                ...formData,
                is_active: true,
            };
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this category?')) {
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
            {r.name_ar && <p className="truncate text-xs text-muted-foreground" dir="rtl">{r.name_ar}</p>}
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
      <Page className="max-w-5xl">
        <PageHeader
          icon={Tags}
          title="Expense Categories"
          description="Organise company spending"
          actions={
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="me-1.5 h-4 w-4" />
              Add Category
            </Button>
          }
        />
        <DataTable
          data={categories}
          columns={columns}
          rowKey={(r) => r.id}
          loading={isLoading}
          defaultSort={{ id: 'name_en', dir: 'asc' }}
          searchPlaceholder="Search name or description…"
          onRowClick={(r) => handleOpenDialog(r)}
          exportFileName="expense-categories"
          emptyTitle="Nothing here yet"
        />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Add Category'}
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
                                placeholder="Enter category name in English"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name_ar">Name (Arabic)</Label>
                            <Input
                                id="name_ar"
                                value={formData.name_ar}
                                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                placeholder="Enter category name in Arabic"
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
                                    : editingCategory
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
