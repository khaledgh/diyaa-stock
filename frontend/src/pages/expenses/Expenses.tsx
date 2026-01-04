import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit2, Trash2, Calendar, FileText, BadgeDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { expenseApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Expense } from '@/types/expenses';
import ExpenseForm from './ExpenseForm';

export default function Expenses() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const queryClient = useQueryClient();

    // Fetch expenses
    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', page, search],
        queryFn: async () => {
            const response = await expenseApi.getAll({
                page,
                limit: 10,
                search: search || undefined,
            });
            return response.data;
        },
    });

    const expenses = expensesData?.data || [];
    const meta = expensesData?.meta;

    // Delete mutation
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

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this expense?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BadgeDollarSign className="h-8 w-8 text-primary" />
                        Expenses
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage company expenses and track spending</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => window.location.href = '/expenses/categories'}>
                        Manage Categories
                    </Button>
                    <Button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Expense
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search expenses..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Number</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            No expenses found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense: Expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {expense.expense_number}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(expense.expense_date).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {expense.expense_category?.name_en || 'Uncategorized'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {expense.vendor?.company_name || expense.vendor?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {expense.payment_method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingExpense(expense);
                                                            setShowAddModal(true);
                                                        }}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(expense.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <div className="text-sm text-muted-foreground">
                                Page {page} of {meta.last_page}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                                disabled={page === meta.last_page}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

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
        </div>
    );
}
