import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, FileText, Loader2, Truck, Undo2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Page, PageHeader } from '@/components/layout/Page';
import { Combobox } from '@/components/ui/combobox';
import { creditNoteApi, vendorApi, locationApi, invoiceApi, customerApi, stockApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CreditNoteForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        type: 'purchase', // purchase or sales
        vendor_id: '',
        customer_id: '',
        location_id: '',
        credit_note_date: new Date().toISOString().split('T')[0],
        purchase_invoice_id: '',
        sales_invoice_id: '',
        notes: '',
        items: [] as any[],
    });

    const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

    // Fetch credit note if editing
    const { data: existingCreditNote, isLoading: isLoadingCN } = useQuery({
        queryKey: ['credit-note', id],
        queryFn: async () => {
            if (!id) return null;
            const response = await creditNoteApi.getById(parseInt(id));
            return response.data.data || response.data;
        },
        enabled: isEditMode,
    });

    useEffect(() => {
        if (existingCreditNote) {
            setFormData({
                type: existingCreditNote.type || 'purchase',
                vendor_id: existingCreditNote.vendor_id?.toString() || '',
                customer_id: existingCreditNote.customer_id?.toString() || '',
                location_id: existingCreditNote.location_id?.toString() || '',
                credit_note_date: new Date(existingCreditNote.credit_note_date).toISOString().split('T')[0],
                purchase_invoice_id: existingCreditNote.purchase_invoice_id?.toString() || '',
                sales_invoice_id: existingCreditNote.sales_invoice_id?.toString() || '',
                notes: existingCreditNote.notes || '',
                items: existingCreditNote.items?.map((item: any) => ({
                    product_id: item.product_id,
                    product_name: item.product?.name_en || item.product?.name || 'Unknown',
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    reason: item.reason || '',
                    invoice_qty: item.invoice_item?.quantity || item.quantity, // reference
                    returnable_qty: (item.invoice_item?.returnable_qty || 0) + item.quantity,
                    current_stock: 0, // will be loaded
                })) || [],
            });
        }
    }, [existingCreditNote]);

    // Fetch vendors, customers, locations
    // Note: Vendors and Customers arrays are kept for future use or if we need to select them manually
    // Currently they are derived from the selected invoice
    useQuery({ queryKey: ['vendors'], queryFn: () => vendorApi.getAll().then(r => r.data.data || []) });
    useQuery({ queryKey: ['customers'], queryFn: () => customerApi.getAll().then(r => r.data.data || []) });
    const { data: locationsData } = useQuery({ queryKey: ['locations'], queryFn: () => locationApi.getAll().then(r => r.data.data || []) });

    const locations = Array.isArray(locationsData) ? locationsData : [];

    // Fetch invoices for selection
    const { data: invoicesData, isLoading: isLoadingInvoices, error: invoicesError } = useQuery({
        queryKey: ['invoices-search', formData.type, invoiceSearchTerm],
        queryFn: async () => {
            console.log('Fetching invoices with params:', {
                invoice_type: formData.type,
                search: invoiceSearchTerm,
                status: 'finalized',
                limit: 50
            });
            const response = await invoiceApi.getAll({
                invoice_type: formData.type as any,
                search: invoiceSearchTerm || undefined,
                status: 'finalized',
                limit: 50
            });
            // Sales list responses nest under "invoices", purchases under "data".
            const payload = response.data.invoices || response.data.data || response.data;
            const invoices = Array.isArray(payload) ? payload : payload?.data;
            return Array.isArray(invoices) ? invoices : [];
        },
        enabled: !isEditMode,
    });

    const invoices = Array.isArray(invoicesData) ? invoicesData : [];

    // Fetch source invoice if editing
    const sourceInvoiceId = isEditMode
        ? (existingCreditNote?.purchase_invoice_id || existingCreditNote?.sales_invoice_id)
        : null;

    const { data: sourceInvoice } = useQuery({
        queryKey: ['invoice', formData.type, sourceInvoiceId],
        queryFn: async () => {
            if (!sourceInvoiceId) return null;
            const response = await invoiceApi.getById(sourceInvoiceId, formData.type as any);
            return response.data.data || response.data;
        },
        enabled: isEditMode && !!sourceInvoiceId,
    });

    // Fetch stock levels for current location
    const { data: locationStockData } = useQuery({
        queryKey: ['location-stock', formData.location_id],
        queryFn: async () => {
            if (!formData.location_id) return [];
            const response = await stockApi.getByLocation(parseInt(formData.location_id));
            return response.data.data || [];
        },
        enabled: !!formData.location_id,
    });

    const locationStock = Array.isArray(locationStockData) ? locationStockData : [];

    // Synchronize items with stock levels whenever stock data or items change
    useEffect(() => {
        if (formData.items.length > 0) {
            setFormData(prev => {
                const updatedItems = prev.items.map(item => {
                    const stockItem = locationStock.find((s: any) => s.product_id === item.product_id);
                    const newStock = stockItem?.quantity || 0;
                    if (item.current_stock !== newStock) {
                        return { ...item, current_stock: newStock };
                    }
                    return item;
                });

                const changed = updatedItems.some((item, idx) => item !== prev.items[idx]);
                if (changed) {
                    return { ...prev, items: updatedItems };
                }
                return prev;
            });
        }
    }, [locationStock, formData.items.length]);

    // Initial load for Edit Mode
    useEffect(() => {
        if (isEditMode && existingCreditNote && sourceInvoice) {
            setFormData(prev => ({
                ...prev,
                items: existingCreditNote.items?.map((item: any) => {
                    const invoiceItem = sourceInvoice.items?.find((ii: any) => ii.product_id === item.product_id);
                    const stockItem = locationStock.find((s: any) => s.product_id === item.product_id);

                    return {
                        product_id: item.product_id,
                        product_name: item.product?.name_en || item.product?.name || 'Unknown',
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        reason: item.reason || '',
                        invoice_qty: invoiceItem?.quantity || item.quantity,
                        // If CN is approved, invoice balance already has this quantity subtracted
                        // If CN is draft, invoice balance doesn't have it subtracted
                        returnable_qty: (invoiceItem?.returnable_qty || 0) + (existingCreditNote.status === 'approved' ? item.quantity : 0),
                        current_stock: stockItem?.quantity || 0,
                    };
                }) || [],
            }));
        }
    }, [isEditMode, existingCreditNote, sourceInvoice]);

    const invoiceOptions = invoices.map((p: any) => {
        const entityName = formData.type === 'purchase'
            ? (p.vendor?.company_name || p.vendor?.name || 'Unknown Vendor')
            : (p.customer?.name || 'Walk-in Customer');
        return {
            value: p.id.toString(),
            label: `${p.invoice_number} - ${entityName} (${formatCurrency(p.total_amount)})`
        };
    });

    const handleInvoiceChange = async (invoiceId: string) => {
        if (!invoiceId) return;

        try {
            const response = await invoiceApi.getById(parseInt(invoiceId), formData.type as any);
            const invoice = response.data.data || response.data;

            if (invoice) {
                setFormData(prev => ({
                    ...prev,
                    purchase_invoice_id: formData.type === 'purchase' ? invoiceId : '',
                    sales_invoice_id: formData.type === 'sales' ? invoiceId : '',
                    vendor_id: formData.type === 'purchase' ? (invoice.vendor_id?.toString() || '') : '',
                    customer_id: formData.type === 'sales' ? (invoice.customer_id?.toString() || '') : '',
                    location_id: invoice.location_id?.toString() || '',
                    items: invoice.items?.map((item: any) => {
                        const stockItem = locationStock.find((s: any) => s.product_id === item.product_id);
                        return {
                            product_id: item.product_id,
                            product_name: item.product?.name_en || item.product?.name || 'Unknown',
                            quantity: 0, // Start with 0 for manual entry
                            unit_price: item.unit_price,
                            invoice_qty: item.quantity,
                            returnable_qty: item.returnable_qty || 0,
                            current_stock: stockItem?.quantity || 0,
                            reason: `Return from ${formData.type} invoice`
                        };
                    }).filter((item: any) => item.returnable_qty > 0) || []
                }));

                if (formData.type === 'purchase' && !invoice.vendor_id) {
                    toast.warning('This invoice has no vendor assigned. You might face issues saving the credit note.', { duration: 5000 });
                } else if (formData.type === 'sales' && !invoice.customer_id && invoice.customer_id !== 0) {
                    // For sales, walk-in might be okay if systemic, but alert just in case
                    console.log('Sales invoice has no customer_id');
                }
            }
        } catch (error) {
            toast.error('Failed to load invoice details');
        }
    };

    const handleQuantityChange = (index: number, val: string) => {
        const qty = parseFloat(val) || 0;
        const item = formData.items[index];

        // Constraints
        let maxAllowed = item.returnable_qty;

        // For purchase returns, we also cannot return more than we have in stock
        if (formData.type === 'purchase') {
            maxAllowed = Math.min(maxAllowed, item.current_stock);
        }

        const finalQty = Math.max(0, Math.min(qty, maxAllowed));

        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], quantity: finalQty };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const mutation = useMutation({
        mutationFn: (data: any) => isEditMode ? creditNoteApi.update(parseInt(id!), data) : creditNoteApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
            toast.success(isEditMode ? 'Credit note updated' : 'Credit note created');
            navigate('/credit-notes');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save credit note');
        },
    });

    const handleSubmit = () => {
        const activeItems = formData.items.filter(item => item.quantity > 0);
        if (activeItems.length === 0) {
            toast.error('Please specify quantity for at least one item');
            return;
        }

        if (formData.type === 'purchase' && !formData.vendor_id) {
            toast.error('Cannot save purchase return: Selected invoice has no vendor.');
            return;
        }

        const payload = {
            ...formData,
            vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
            customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
            location_id: parseInt(formData.location_id),
            purchase_invoice_id: formData.purchase_invoice_id ? parseInt(formData.purchase_invoice_id) : null,
            sales_invoice_id: formData.sales_invoice_id ? parseInt(formData.sales_invoice_id) : null,
            credit_note_date: `${formData.credit_note_date}T00:00:00Z`,
            items: activeItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                reason: item.reason
            }))
        };

        mutation.mutate(payload);
    };

    if (isEditMode && isLoadingCN) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const selectedInvoiceId = formData.type === 'purchase' ? formData.purchase_invoice_id : formData.sales_invoice_id;
    const returnLocation = locations.find(l => l.id.toString() === formData.location_id)?.name;
    const returnedUnits = formData.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const typeOptions = [
        { value: 'purchase', title: 'Purchase return', hint: 'Goods sent back to a vendor', icon: Truck },
        { value: 'sales', title: 'Sales return', hint: 'Goods returned by a customer', icon: Undo2 },
    ] as const;

    return (
        <Page className="max-w-[1400px]">
            <PageHeader
                backTo="/credit-notes"
                icon={FileText}
                title={isEditMode ? 'Edit Credit Note' : 'New Credit Note'}
                description="Record returned goods against an invoice"
                actions={
                    <>
                        <Button variant="outline" onClick={() => navigate('/credit-notes')}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Save className="me-1.5 h-4 w-4" />}
                            Save Credit Note
                        </Button>
                    </>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-4">
                    <Card>
                        <CardContent className="space-y-4 p-5">
                            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Credit note type">
                                {typeOptions.map((opt) => {
                                    const active = formData.type === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            disabled={isEditMode}
                                            onClick={() => setFormData(prev => ({ ...prev, type: opt.value, items: [], purchase_invoice_id: '', sales_invoice_id: '' }))}
                                            className={`flex items-center gap-3 rounded-lg border p-3 text-start transition-colors disabled:cursor-not-allowed ${active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50 disabled:opacity-50'}`}
                                        >
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                <opt.icon className="h-4 w-4" aria-hidden />
                                            </span>
                                            <span>
                                                <span className="block text-sm font-medium">{opt.title}</span>
                                                <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Source invoice *</Label>
                                    {isLoadingInvoices ? (
                                        <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
                                        </div>
                                    ) : invoicesError ? (
                                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
                                            Couldn't load invoices. Try again.
                                        </div>
                                    ) : (
                                        <Combobox
                                            options={invoiceOptions}
                                            value={selectedInvoiceId}
                                            onChange={handleInvoiceChange}
                                            placeholder={invoiceOptions.length === 0 ? 'No finalized invoices found' : `Select ${formData.type} invoice…`}
                                            searchPlaceholder="Search by invoice number…"
                                            onSearchChange={setInvoiceSearchTerm}
                                            disabled={isEditMode}
                                        />
                                    )}
                                    {!isLoadingInvoices && !invoicesError && invoiceOptions.length === 0 && (
                                        <p className="text-xs text-muted-foreground">No finalized {formData.type} invoices yet.</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Return location</Label>
                                    <div className={`flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm ${returnLocation ? '' : 'text-muted-foreground'}`}>
                                        {returnLocation || 'Set from the invoice'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
                            <h2 className="text-sm font-semibold">
                                Returned items
                                {formData.items.length > 0 && <span className="ms-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{formData.items.length}</span>}
                            </h2>
                            <span className="text-xs text-muted-foreground">Only items that can still be returned are listed</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-5 py-2 text-start font-medium">Product</th>
                                        <th className="px-3 py-2 text-end font-medium">Invoiced</th>
                                        <th className="px-3 py-2 text-end font-medium">{formData.type === 'purchase' ? 'In stock' : 'Returnable'}</th>
                                        <th className="px-3 py-2 text-center font-medium">Return qty</th>
                                        <th className="px-3 py-2 text-end font-medium">Price</th>
                                        <th className="px-5 py-2 text-end font-medium">Line total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {formData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center">
                                                <Undo2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
                                                <p className="text-sm text-muted-foreground">
                                                    {selectedInvoiceId ? 'Nothing left to return on this invoice' : 'Choose a source invoice to load its items'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        formData.items.map((item, index) => {
                                            const maxAllowed = formData.type === 'purchase'
                                                ? Math.min(item.returnable_qty, item.current_stock)
                                                : item.returnable_qty;
                                            const qty = Number(item.quantity) || 0;
                                            return (
                                                <tr key={index} className="hover:bg-muted/30">
                                                    <td className="px-5 py-2.5">
                                                        <p className="font-medium" dir="auto">{item.product_name}</p>
                                                        <p className="text-xs text-muted-foreground">Max {maxAllowed}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-end tabular-nums text-muted-foreground">{item.invoice_qty}</td>
                                                    <td className="px-3 py-2.5 text-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(index, String(maxAllowed))}
                                                            className={`rounded px-1.5 py-0.5 tabular-nums font-medium hover:bg-primary/10 hover:text-primary ${formData.type === 'purchase' && item.current_stock <= 0 ? 'text-red-600' : ''}`}
                                                            title="Return the maximum"
                                                        >
                                                            {formData.type === 'purchase' ? item.current_stock : item.returnable_qty}
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <Input
                                                            type="number"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                            className="mx-auto h-8 w-20 text-center tabular-nums"
                                                            min="0"
                                                            max={maxAllowed}
                                                            placeholder="0"
                                                            aria-label={`Return quantity for ${item.product_name}`}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2.5 text-end tabular-nums text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                                                    <td className="px-5 py-2.5 text-end tabular-nums font-medium">{qty > 0 ? formatCurrency(qty * item.unit_price) : '—'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <div>
                    <Card className="lg:sticky lg:top-4">
                        <div className="border-b px-5 py-3">
                            <h2 className="text-sm font-semibold">Summary</h2>
                        </div>
                        <CardContent className="space-y-4 p-5">
                            <dl className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Return date</dt>
                                    <dd className="font-medium">{formatDate(formData.credit_note_date)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Units returned</dt>
                                    <dd className="font-medium tabular-nums">{returnedUnits}</dd>
                                </div>
                                <div className="flex items-center justify-between border-t pt-2">
                                    <dt className="font-medium">Return value</dt>
                                    <dd className="text-lg font-semibold tabular-nums text-primary">{formatCurrency(totalAmount)}</dd>
                                </div>
                            </dl>

                            <div className="space-y-1.5">
                                <Label htmlFor="cn-notes">Reason / notes</Label>
                                <textarea
                                    id="cn-notes"
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                                    rows={3}
                                    placeholder="Why are these items being returned?"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            <ul className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                                <li className="flex gap-2"><Info className="mt-0.5 h-3 w-3 shrink-0" />Quantities come from the original invoice, minus anything already returned.</li>
                                {formData.type === 'purchase' && (
                                    <li className="flex gap-2 text-amber-700 dark:text-amber-300"><Info className="mt-0.5 h-3 w-3 shrink-0" />You can't return more to a vendor than you currently have in stock.</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Page>
    );
}
