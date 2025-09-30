import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { stockApi } from '@/lib/api';

export default function Stock() {
  const { t } = useTranslation();

  const { data: warehouseStock, isLoading } = useQuery({
    queryKey: ['warehouse-stock'],
    queryFn: async () => {
      const response = await stockApi.getWarehouse();
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('stock.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('stock.warehouse')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.name')}</TableHead>
                  <TableHead>{t('products.category')}</TableHead>
                  <TableHead>{t('common.quantity')}</TableHead>
                  <TableHead>{t('products.minStock')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseStock?.map((item: any) => (
                  <TableRow key={item.id} className={item.quantity <= item.min_stock_level ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name_en}</TableCell>
                    <TableCell>{item.category_name_en || '-'}</TableCell>
                    <TableCell>
                      <span className={item.quantity <= item.min_stock_level ? 'text-red-600 font-bold' : ''}>
                        {item.quantity} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>{item.min_stock_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
