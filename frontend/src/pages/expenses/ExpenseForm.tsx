import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox'; // Assuming this component exists based on previous file
import { expenseApi, expenseCategoryApi, vendorApi } from '@/lib/api';
import { Expense } from '@/types/expenses';

interface ExpenseFormProps {
    expense: Expense | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
    const { register, control, handleSubmit, reset } = useForm({
        defaultValues: {
            expense_category_id: '',
            vendor_id: '',
            amount: '',
            tax_amount: '0',
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            reference_number: '',
            notes: '',
        },
    });

    // Fetch categories
    const { data: categoriesData } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await expenseCategoryApi.getAll({ active: true });
            return response.data; // Assuming response structure { data: [...] } or direct array
        },
    });

    const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : (Array.isArray(categoriesData) ? categoriesData : []);

    // Fetch vendors
    const { data: vendorsData } = useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            const response = await vendorApi.getAll();
            return response.data;
        },
    });

    const vendors = Array.isArray(vendorsData?.data) ? vendorsData.data : (Array.isArray(vendorsData) ? vendorsData : []);

    useEffect(() => {
        if (expense) {
            reset({
                expense_category_id: expense.expense_category_id?.toString() || '',
                vendor_id: expense.vendor_id?.toString() || '',
                amount: expense.amount?.toString() || '',
                tax_amount: expense.tax_amount?.toString() || '0',
                expense_date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : '',
                payment_method: expense.payment_method || 'cash',
                reference_number: expense.reference_number || '',
                notes: expense.notes || '',
            });
        }
    }, [expense, reset]);

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                expense_category_id: Number(data.expense_category_id),
                vendor_id: data.vendor_id ? Number(data.vendor_id) : null,
                amount: Number(data.amount),
                tax_amount: Number(data.tax_amount),
                expense_date: new Date(data.expense_date).toISOString(), // Send full ISO string for Go parsing
            };

            if (expense) {
                return expenseApi.update(expense.id, payload);
            }
            return expenseApi.create(payload);
        },
        onSuccess: () => {
            toast.success(`Expense ${expense ? 'updated' : 'created'} successfully`);
            onSuccess();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save expense');
        },
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    const vendorOptions = vendors.map((v: any) => ({
        value: v.id.toString(),
        label: v.company_name || v.name || 'Unknown Vendor',
    }));

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="expense_category_id">Category</Label>
                        <Controller
                            name="expense_category_id"
                            control={control}
                            rules={{ required: 'Category is required' }}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category: any) => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vendor_id">Vendor (Optional)</Label>
                        <Controller
                            name="vendor_id"
                            control={control}
                            render={({ field }) => (
                                <Combobox
                                    options={[
                                        { value: '', label: 'No vendor' },
                                        ...vendorOptions,
                                    ]}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select vendor"
                                    searchPlaceholder="Search vendors..."
                                    emptyText="No vendors found"
                                />
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...register('amount', { required: 'Amount is required' })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tax_amount">Tax Amount</Label>
                        <Input
                            id="tax_amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...register('tax_amount')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expense_date">Date</Label>
                        <Input
                            id="expense_date"
                            type="date"
                            {...register('expense_date', { required: 'Date is required' })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="payment_method">Payment Method</Label>
                        <Controller
                            name="payment_method"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="reference_number">Reference Number</Label>
                        <Input
                            id="reference_number"
                            placeholder="Receipt number, transaction ID, etc."
                            {...register('reference_number')}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any additional details..."
                            {...register('notes')}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Saving...' : 'Save Expense'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
