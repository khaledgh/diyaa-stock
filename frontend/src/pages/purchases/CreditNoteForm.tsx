import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, X, FileText, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { creditNoteApi, vendorApi, locationApi, invoiceApi, customerApi, stockApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
            console.log('Invoice API response:', response.data);
            const invoices = response.data.data?.data || response.data.data || response.data || [];
            console.log('Parsed invoices:', invoices);
            return invoices;
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

    return (
        <div className="p-4 md:p-6 mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/credit-notes')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Credit Note' : 'New Credit Note'}</h1>
                        <p className="text-sm text-muted-foreground">Record product returns and adjustments</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/credit-notes')}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Credit Note
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Credit Note Type & Source</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Type *</Label>
                                    <div className="flex gap-4 mt-1">
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors flex-1">
                                            <input
                                                type="radio"
                                                name="type"
                                                checked={formData.type === 'purchase'}
                                                onChange={() => setFormData(prev => ({ ...prev, type: 'purchase', items: [], purchase_invoice_id: '', sales_invoice_id: '' }))}
                                                disabled={isEditMode}
                                            />
                                            <span className="font-medium text-sm">Purchase Return (Vendor)</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors flex-1">
                                            <input
                                                type="radio"
                                                name="type"
                                                checked={formData.type === 'sales'}
                                                onChange={() => setFormData(prev => ({ ...prev, type: 'sales', items: [], purchase_invoice_id: '', sales_invoice_id: '' }))}
                                                disabled={isEditMode}
                                            />
                                            <span className="font-medium text-sm">Sales Return (Customer)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <Label>Source Invoice *</Label>
                                    {isLoadingInvoices ? (
                                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm text-muted-foreground">Loading invoices...</span>
                                        </div>
                                    ) : invoicesError ? (
                                        <div className="p-2 border border-red-200 rounded-md bg-red-50 text-red-600 text-sm">
                                            Failed to load invoices. Check console for details.
                                        </div>
                                    ) : (
                                        <Combobox
                                            options={invoiceOptions}
                                            value={formData.type === 'purchase' ? formData.purchase_invoice_id : formData.sales_invoice_id}
                                            onChange={handleInvoiceChange}
                                            placeholder={invoiceOptions.length === 0 ? 'No finalized invoices found' : `Select ${formData.type} invoice...`}
                                            searchPlaceholder="Search by number..."
                                            onSearchChange={setInvoiceSearchTerm}
                                            disabled={isEditMode}
                                        />
                                    )}
                                    {!isLoadingInvoices && !invoicesError && invoiceOptions.length === 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            No finalized {formData.type} invoices available. Create an invoice first.
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <Label>Return Location</Label>
                                    <Input
                                        value={locations.find(l => l.id.toString() === formData.location_id)?.name || 'Select invoice first'}
                                        disabled
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Returned Items</CardTitle>
                            <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Only items with returnable balance are shown
                            </p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Product</TableHead>
                                        <TableHead className="text-right">Inv Qty</TableHead>
                                        <TableHead className="text-right">Loc Stock</TableHead>
                                        <TableHead className="text-center w-32">Return Qty</TableHead>
                                        <TableHead className="text-right pr-6">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formData.items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={formData.type === 'purchase' ? 6 : 5} className="text-center py-12 text-muted-foreground">
                                                {formData.purchase_invoice_id || formData.sales_invoice_id
                                                    ? 'No returnable items found in this invoice'
                                                    : 'Select an invoice to load items'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        formData.items.map((item, index) => {
                                            const maxAllowed = formData.type === 'purchase'
                                                ? Math.min(item.returnable_qty, item.current_stock)
                                                : item.returnable_qty;

                                            return (
                                                <TableRow key={index} className="hover:bg-muted/30">
                                                    <TableCell className="pl-6">
                                                        <div className="font-medium text-sm">{item.product_name}</div>
                                                        <div className="text-[10px] text-muted-foreground">ID: {item.product_id}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-mono">{item.invoice_qty}</TableCell>
                                                    <TableCell className="text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(index, item.current_stock.toString())}
                                                            className={`hover:underline font-bold font-mono ${item.current_stock <= 0 ? 'text-red-500' : 'text-orange-600'}`}
                                                            title="Click to fill current stock"
                                                        >
                                                            {item.current_stock}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col items-center">
                                                            <Input
                                                                type="number"
                                                                value={item.quantity || ''}
                                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                className="h-8 text-center font-bold w-20"
                                                                min="0"
                                                                max={maxAllowed}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 font-mono text-sm">
                                                        {formatCurrency(item.unit_price)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Return Date:</span>
                                    <span className="font-medium">{formData.credit_note_date}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-muted-foreground">Total Return Value:</span>
                                    <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Label>Notes / Reason</Label>
                                <textarea
                                    className="w-full text-sm p-3 border rounded-md focus:ring-2 focus:ring-primary outline-none"
                                    rows={4}
                                    placeholder="Explain why these items are being returned..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/50 border-none shadow-none">
                        <CardContent className="pt-6 space-y-2 text-xs text-muted-foreground">
                            <p className="flex gap-2">
                                <Search className="h-3 w-3 shrink-0" />
                                <span>Invoice quantities are pre-loaded from the original transaction.</span>
                            </p>
                            <p className="flex gap-2">
                                <FileText className="h-3 w-3 shrink-0" />
                                <span>Balance shows remaining quantity that hasn't been returned yet.</span>
                            </p>
                            {formData.type === 'purchase' && (
                                <p className="flex gap-2 text-orange-600">
                                    <Loader2 className="h-3 w-3 shrink-0" />
                                    <span>For vendor returns, you cannot return more than current available stock.</span>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
