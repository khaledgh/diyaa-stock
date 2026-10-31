import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Receipt, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { expenseApi, expenseCategoryApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Expense } from '@/types/expenses';
import { ColumnDef, DataTable, DateRangeFilter, FilterSelect, SortState } from '@/components/data-table/DataTable';
import { Page, PageHeader, RowAction, RowActions, StatusBadge } from '@/components/layout/Page';
import ExpenseForm from './ExpenseForm';

export default function Expenses() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortState | null>({ id: 'date', dir: 'desc' });
    const [categoryId, setCategoryId] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const queryClient = useQueryClient();

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', page, pageSize, search, sort, categoryId, dateRange],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const response = await expenseApi.getAll({
                page,
                limit: pageSize,
                search: search || undefined,
                sort_by: sort?.id,
                sort_dir: sort?.dir,
                category_id: categoryId || undefined,
                start_date: dateRange.from || undefined,
                end_date: dateRange.to || undefined,
            });
            return response.data;
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['expense-categories', 'filter'],
        queryFn: async () => {
            const response = await expenseCategoryApi.getAll();
            const d = response.data.data || response.data;
            return Array.isArray(d) ? d : d?.data || [];
        },
    });

    const expenses: Expense[] = expensesData?.data || [];
    const meta = expensesData?.meta;

    const deleteMutation = useMutation({
        mutationFn: (id: number) => expenseApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('Expense deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete expense');
        },
    });

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this expense?')) {
            deleteMutation.mutate(id);
        }
    };

    const openEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setShowAddModal(true);
    };

    const withReset = <T,>(fn: (v: T) => void) => (v: T) => {
        fn(v);
        setPage(1);
    };

    const columns: ColumnDef<Expense>[] = [
        { id: 'expense_number', header: 'Number', alwaysVisible: true, value: (e) => e.expense_number, cell: (e) => <span className="font-medium">{e.expense_number}</span> },
        { id: 'date', header: 'Date', value: (e) => e.expense_date, cell: (e) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(e.expense_date)}</span> },
        {
            id: 'category',
            header: 'Category',
            value: (e) => e.expense_category?.name_en,
            cell: (e) => <StatusBadge tone="violet" dot={false}>{e.expense_category?.name_en || 'Uncategorized'}</StatusBadge>,
        },
        {
            id: 'vendor',
            header: 'Vendor',
            sortable: false,
            value: (e) => e.vendor?.company_name || e.vendor?.name,
            cell: (e) => <span className="text-muted-foreground">{e.vendor?.company_name || e.vendor?.name || '—'}</span>,
        },
        {
            id: 'payment_method',
            header: 'Paid by',
            value: (e) => e.payment_method,
            cell: (e) => <span className="capitalize text-muted-foreground">{(e.payment_method || '—').replace('_', ' ')}</span>,
        },
        { id: 'amount', header: 'Amount', align: 'end', value: (e) => Number(e.amount), cell: (e) => <span className="tabular-nums font-semibold">{formatCurrency(e.amount)}</span> },
        {
            id: 'actions',
            header: '',
            alwaysVisible: true,
            sortable: false,
            align: 'end',
            cell: (e) => (
                <RowActions>
                    <RowAction label="Edit" icon={Edit2} onClick={() => openEdit(e)} />
                    <RowAction label="Delete" icon={Trash2} tone="danger" onClick={() => handleDelete(e.id)} />
                </RowActions>
            ),
        },
    ];

    const pageTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return (
        <Page>
            <PageHeader
                icon={Receipt}
                title="Expenses"
                description="Company spending, by category and vendor"
                actions={
                    <>
                        <Button variant="outline" onClick={() => navigate('/expenses/categories')}>
                            <Tags className="me-1.5 h-4 w-4" />
                            Categories
                        </Button>
                        <Button onClick={() => setShowAddModal(true)}>
                            <Plus className="me-1.5 h-4 w-4" />
                            Add Expense
                        </Button>
                    </>
                }
            />

            <DataTable
                data={expenses}
                columns={columns}
                rowKey={(e) => e.id}
                loading={isLoading}
                search={search}
                onSearchChange={withReset(setSearch)}
                searchPlaceholder="Search number, notes, category…"
                sort={sort}
                onSortChange={withReset(setSort)}
                pagination={{ page, pageSize, total: meta?.total_count || 0, onPageChange: setPage, onPageSizeChange: setPageSize }}
                onRowClick={openEdit}
                storageKey="expenses"
                exportFileName="expenses"
                emptyTitle="No expenses found"
                activeFilterCount={(categoryId ? 1 : 0) + (dateRange.from || dateRange.to ? 1 : 0)}
                onResetFilters={() => {
                    setCategoryId('');
                    setDateRange({ from: '', to: '' });
                    setPage(1);
                }}
                filters={
                    <>
                        <FilterSelect
                            label="Category"
                            value={categoryId}
                            onChange={withReset(setCategoryId)}
                            options={categories.map((c: any) => ({ value: String(c.id), label: c.name_en }))}
                        />
                        <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={withReset(setDateRange)} />
                    </>
                }
                footer={() => ({
                    expense_number: <span className="text-xs font-medium text-muted-foreground">Page total</span>,
                    amount: formatCurrency(pageTotal),
                })}
            />

            <Dialog open={showAddModal} onOpenChange={(open) => {
                setShowAddModal(open);
                if (!open) setEditingExpense(null);
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                    </DialogHeader>
                    <ExpenseForm
                        expense={editingExpense}
                        onSuccess={() => {
                            setShowAddModal(false);
                            setEditingExpense(null);
                            queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        }}
                        onCancel={() => {
                            setShowAddModal(false);
                            setEditingExpense(null);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Page>
    );
}
