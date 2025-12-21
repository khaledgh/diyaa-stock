import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft, 
  Printer, 
  Package,
  TrendingUp,
  Download,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportApi } from '@/lib/api';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { exportInventoryValuation } from '@/lib/exportExcel';
import { exportInventoryValuationPDF } from '@/lib/exportPDF';

export default function InventoryValuation() {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: async () => {
      const response = await reportApi.inventoryValuation();
      return response.data.data || response.data;
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Inventory_Valuation_${new Date().toISOString().split('T')[0]}`,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Package className="h-6 w-6 text-purple-600" />
              Inventory Valuation
            </h1>
            <p className="text-muted-foreground">Total stock value by product</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportInventoryValuation(report?.products || [])} 
            className="gap-2"
            disabled={!report?.products?.length}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => await exportInventoryValuationPDF(report?.products || [])} 
            className="gap-2"
            disabled={!report?.products?.length}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Report */}
      <div ref={printRef} className="bg-white dark:bg-card rounded-lg">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Inventory Valuation Report</h2>
              <p className="text-muted-foreground mt-1">
                As of {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(report?.summary?.total_cost_value || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Stock Value</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Products</p>
              <p className="text-lg font-bold">
                {report?.summary?.total_items || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Total Quantity</p>
              <p className="text-lg font-bold text-blue-600">
                {formatQuantity(report?.summary?.total_quantity || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Cost Value</p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(report?.summary?.total_cost_value || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Retail Value</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(report?.summary?.total_retail_value || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Potential Profit</p>
              <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {formatCurrency(report?.summary?.potential_profit || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Product Table */}
        <div className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Retail Price</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-right">Retail Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report?.products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    No products with stock
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {report?.products?.map((product: any) => (
                    <TableRow key={product.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {product.name_en || product.name_ar}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {product.sku}
                      </TableCell>
                      <TableCell>{product.category_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatQuantity(product.total_quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.cost_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(product.stock_value)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(product.retail_value)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(report?.summary?.total_quantity || 0)}
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right text-purple-600 text-lg">
                      {formatCurrency(report?.summary?.total_cost_value || 0)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 text-lg">
                      {formatCurrency(report?.summary?.total_retail_value || 0)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t text-center text-sm text-muted-foreground">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
