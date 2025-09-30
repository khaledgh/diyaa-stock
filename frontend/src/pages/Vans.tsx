import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { vanApi } from '@/lib/api';

export default function Vans() {
  const { t } = useTranslation();

  const { data: vans, isLoading } = useQuery({
    queryKey: ['vans'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('vans.title')}</h1>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('vans.name')}</TableHead>
                  <TableHead>{t('vans.plateNumber')}</TableHead>
                  <TableHead>{t('vans.salesRep')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vans?.map((van: any) => (
                  <TableRow key={van.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {van.name}
                      </div>
                    </TableCell>
                    <TableCell>{van.plate_number}</TableCell>
                    <TableCell>{van.sales_rep_name || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${van.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {van.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </TableCell>
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
