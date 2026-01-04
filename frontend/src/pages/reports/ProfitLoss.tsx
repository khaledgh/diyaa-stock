import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils'; // Assuming this utility exists

export default function ProfitLoss() {
    const [dateRange, setDateRange] = useState({
        from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['profit-loss', dateRange],
        queryFn: async () => {
            const response = await reportApi.profitLoss({
                from_date: dateRange.from,
                to_date: dateRange.to,
            });
            return response.data.data;
        },
    });

    if (isLoading) {
        return <div className="p-6">Loading report...</div>;
    }

    const {
        total_sales,
        sales_returns,
        net_sales,
        cogs,
        net_cogs,
        gross_profit,
        expenses_breakdown,
        total_expenses,
        net_profit
    } = reportData || {};

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
                    <p className="text-muted-foreground mt-1">
                        Financial performance from {dateRange.from} to {dateRange.to}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="w-auto"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="w-auto"
                        />
                    </div>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Key Metrics Cards */}
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Net Sales</p>
                            <h3 className="text-2xl font-bold mt-2">{formatCurrency(net_sales || 0)}</h3>
                        </div>
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                            <h3 className="text-2xl font-bold mt-2">{formatCurrency(gross_profit || 0)}</h3>
                        </div>
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                            <h3 className={`text-2xl font-bold mt-2 ${net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(net_profit || 0)}
                            </h3>
                        </div>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {net_profit >= 0 ? (
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            ) : (
                                <TrendingDown className="h-6 w-6 text-red-600" />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Statement Detailed View */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Detailed Statement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Revenue Section */}
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Revenue</h3>
                                <div className="space-y-2 pl-4 border-l-2 border-green-500">
                                    <div className="flex justify-between">
                                        <span>Total Sales</span>
                                        <span>{formatCurrency(total_sales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-500">
                                        <span>Less: Sales Returns</span>
                                        <span>({formatCurrency(sales_returns || 0)})</span>
                                    </div>
                                    <div className="flex justify-between font-bold border-t pt-2 mt-2">
                                        <span>Net Sales</span>
                                        <span>{formatCurrency(net_sales || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* COGS Section */}
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Cost of Goods Sold</h3>
                                <div className="space-y-2 pl-4 border-l-2 border-orange-500">
                                    <div className="flex justify-between">
                                        <span>Cost of Sales</span>
                                        <span>{formatCurrency(cogs || 0)}</span>
                                    </div>
                                    {/* If we had returns for cost, display here if needed, usually net_cogs is what matters */}
                                    <div className="flex justify-between font-bold border-t pt-2 mt-2">
                                        <span>Net Cost of Sales</span>
                                        <span>{formatCurrency(net_cogs || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Gross Profit Line */}
                            <div className="flex justify-between font-bold text-lg bg-muted/30 p-3 rounded">
                                <span>Gross Profit</span>
                                <span>{formatCurrency(gross_profit || 0)}</span>
                            </div>

                            {/* Expenses Section */}
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Operating Expenses</h3>
                                <div className="space-y-2 pl-4 border-l-2 border-red-500">
                                    {expenses_breakdown && expenses_breakdown.length > 0 ? (
                                        expenses_breakdown.map((exp: any, index: number) => (
                                            <div key={index} className="flex justify-between">
                                                <span>{exp.category_name}</span>
                                                <span>{formatCurrency(exp.amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-sm italic">No operating expenses recorded.</p>
                                    )}
                                    <div className="flex justify-between font-bold border-t pt-2 mt-2">
                                        <span>Total Expenses</span>
                                        <span>{formatCurrency(total_expenses || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Profit Line */}
                            <div className={`flex justify-between font-bold text-xl p-4 rounded ${net_profit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                <span>Net Profit / (Loss)</span>
                                <span>{formatCurrency(net_profit || 0)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
