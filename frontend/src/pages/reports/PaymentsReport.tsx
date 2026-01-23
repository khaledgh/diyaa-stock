import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Calendar, Download, TrendingUp, AlertCircle, User, Briefcase, Eye, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PaymentsReport() {
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day');
    const [entityFilter, setEntityFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Detailed view state
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Fetch grouped report data
    const { data: reportData, isLoading, error } = useQuery({
        queryKey: ['payments-report', fromDate, toDate, groupBy, entityFilter, typeFilter],
        queryFn: async () => {
            const params: any = {
                from_date: fromDate,
                to_date: toDate,
                group_by: groupBy
            };
            if (entityFilter) params.entity_name = entityFilter;
            if (typeFilter !== 'all') params.payment_type = typeFilter;

            const response = await reportApi.payments(params);
            return response.data.data;
        },
    });

    // Fetch detailed payments for the selected row
    const { data: detailsData, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['payments-report-details', selectedRow],
        queryFn: async () => {
            if (!selectedRow) return [];
            const response = await reportApi.paymentsDetails({
                date: selectedRow.date,
                entity_name: selectedRow.entity_name,
                payment_type: selectedRow.payment_type,
                group_by: groupBy
            });
            return response.data.data;
        },
        enabled: !!selectedRow && isDetailsOpen,
    });

    const payments = reportData || [];

    const handleViewDetails = (row: any) => {
        setSelectedRow(row);
        setIsDetailsOpen(true);
    };

    const exportReport = () => {
        const headers = ['Date', 'Type', 'Entity Name', 'Payment Count', 'Total Amount'];
        const csvData = [
            headers.join(','),
            ...payments.map((p: any) => [
                p.date,
                p.payment_type,
                `"${p.entity_name}"`,
                p.payment_count,
                p.total_amount
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-report-${fromDate}-to-${toDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const totalCollected = payments.reduce((sum: number, p: any) => {
        const amountVal = Number(p.total_amount) || 0;
        const amount = p.payment_type === 'Received' ? amountVal : -amountVal;
        return sum + amount;
    }, 0);
    const totalCount = payments.reduce((sum: number, p: any) => sum + (Number(p.payment_count) || 0), 0);

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Failed to load payments report. Please try again.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Payments Report</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Detailed summary of Received, Payed and Expense transactions
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={exportReport} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">From Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">To Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Group By</label>
                            <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Daily</SelectItem>
                                    <SelectItem value="month">Monthly</SelectItem>
                                    <SelectItem value="year">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Type</label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Received">Received</SelectItem>
                                    <SelectItem value="Payed">Payed</SelectItem>
                                    <SelectItem value="Expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Entity Name</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search vendor or customer..."
                                    value={entityFilter}
                                    onChange={(e) => setEntityFilter(e.target.value)}
                                    className="pl-9"
                                />
                                {entityFilter && (
                                    <button
                                        onClick={() => setEntityFilter('')}
                                        className="absolute right-2.5 top-2.5"
                                    >
                                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Net Cash Flow</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className={`text-3xl font-bold ${totalCollected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(totalCollected)}
                            </p>
                            <DollarSign className={`h-10 w-10 opacity-20 ${totalCollected >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-600">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between text-sm">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                <p className="text-muted-foreground">Total Records:</p>
                                <p className="font-bold">{totalCount}</p>
                                <p className="text-muted-foreground">Avg per Group:</p>
                                <p className="font-bold">{formatCurrency(payments.length > 0 ? Math.abs(totalCollected) / payments.length : 0)}</p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-purple-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Entity Name</TableHead>
                                    <TableHead className="text-right">Payments</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-center w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                                            Loading report data...
                                        </TableCell>
                                    </TableRow>
                                ) : payments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                                            No payments found for the selected filters
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {payments.map((p: any, idx: number) => (
                                            <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {p.date ? p.date.split('T')[0] : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${p.payment_type === 'Received'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : p.payment_type === 'Expense'
                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {p.payment_type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="flex items-center gap-2 py-4">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        {p.payment_type === 'Received' ? <User className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                                                    </div>
                                                    <span className="font-medium">{p.entity_name}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{p.payment_count}</TableCell>
                                                <TableCell className="text-right font-bold">
                                                    <span className={p.payment_type === 'Received' ? 'text-green-600' : p.payment_type === 'Expense' ? 'text-orange-600' : 'text-red-600'}>
                                                        {p.payment_type === 'Received' ? '' : '-'}{formatCurrency(p.total_amount)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(p)}>
                                                        <Eye className="h-4 w-4 text-primary" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/30 font-bold border-t-2">
                                            <TableCell colSpan={3} className="text-right">TOTAL NET FLOW:</TableCell>
                                            <TableCell className="text-right font-mono">{totalCount}</TableCell>
                                            <TableCell className={`text-right ${totalCollected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(totalCollected)}
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed View Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Eye className="h-5 w-5 text-primary" />
                            Payment Details
                        </DialogTitle>
                        {selectedRow && (
                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground p-2 bg-muted/30 rounded-lg">
                                <div><span className="font-semibold text-foreground">Date:</span> {selectedRow.date?.split('T')[0]}</div>
                                <div><span className="font-semibold text-foreground">Entity:</span> {selectedRow.entity_name}</div>
                                <div>
                                    <span className="font-semibold text-foreground">Type:</span>
                                    <span className={selectedRow.payment_type === 'Received' ? 'text-green-600 ml-1' : selectedRow.payment_type === 'Expense' ? 'text-orange-600 ml-1 font-bold' : 'text-red-600 ml-1 font-bold'}>
                                        {selectedRow.payment_type}
                                    </span>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                        {isLoadingDetails ? (
                            <div className="flex items-center justify-center p-20 text-muted-foreground">
                                Loading individual transactions...
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailsData?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                                No individual payments found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        detailsData?.map((item: any) => (
                                            <TableRow key={item.id} className="hover:bg-muted/30">
                                                <TableCell className="font-mono text-xs">
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {item.invoice_type === 'expense' ? (
                                                        <span className="font-medium">{item.invoice_number}</span>
                                                    ) : item.invoice_id && item.invoice_id !== 0 ? (
                                                        <Link
                                                            to={`/invoices/${item.invoice_type}/${item.invoice_id}`}
                                                            className="text-primary hover:underline font-medium"
                                                        >
                                                            {item.invoice_number}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="capitalize">{item.payment_method?.replace('_', ' ')}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.reference_number || '-'}</TableCell>
                                                <TableCell className="text-xs max-w-[200px] truncate" title={item.notes}>{item.notes || '-'}</TableCell>
                                                <TableCell className="text-xs">{item.creator_name || '-'}</TableCell>
                                                <TableCell className="text-right font-bold">
                                                    <span className={item.type_label === 'Received' ? 'text-green-600' : item.type_label === 'Expense' ? 'text-orange-600' : 'text-red-600'}>
                                                        {item.type_label === 'Received' ? '' : '-'}{formatCurrency(item.amount)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button onClick={() => setIsDetailsOpen(false)} variant="secondary">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
