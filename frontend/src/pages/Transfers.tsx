import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { transferApi, vanApi, productApi, stockApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export default function Transfers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVan, setSelectedVan] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const response = await transferApi.getAll();
      return response.data.data;
    },
  });

  const { data: vans } = useQuery({
    queryKey: ['vans'],
    queryFn: async () => {
      const response = await vanApi.getAll();
      return response.data.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      return response.data.data;
    },
  });

  const { data: warehouseStock } = useQuery({
    queryKey: ['warehouse-stock'],
    queryFn: async () => {
      const response = await stockApi.getWarehouse();
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: transferApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      toast.success(t('transfers.transferComplete'));
      setIsDialogOpen(false);
      setItems([]);
      setSelectedVan('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create transfer');
    },
  });

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) {
      toast.error('Please select product and quantity');
      return;
    }

    const product = products?.find((p: any) => p.id === Number(selectedProduct));
    const stock = warehouseStock?.find((s: any) => s.product_id === Number(selectedProduct));

    if (!stock || stock.quantity < Number(quantity)) {
      toast.error('Insufficient warehouse stock');
      return;
    }

    setItems([...items, {
      product_id: Number(selectedProduct),
      product_name: product?.name_en,
      quantity: Number(quantity),
    }]);

    setSelectedProduct('');
    setQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedVan || items.length === 0) {
      toast.error('Please select van and add items');
      return;
    }

    createMutation.mutate({
      to_location_type: 'van',
      to_location_id: Number(selectedVan),
      items,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('transfers.title')}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('transfers.newTransfer')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('transfers.toVan')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers?.map((transfer: any) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
                    <TableCell>{transfer.to_van_name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        transfer.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transfer.status}
                      </span>
                    </TableCell>
                    <TableCell>{transfer.created_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('transfers.newTransfer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('transfers.selectVan')} *</Label>
              <select
                value={selectedVan}
                onChange={(e) => setSelectedVan(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select van</option>
                {vans?.filter((v: any) => v.is_active).map((van: any) => (
                  <option key={van.id} value={van.id}>{van.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">{t('transfers.addItem')}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>{t('transfers.selectProduct')}</Label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select product</option>
                    {products?.map((product: any) => {
                      const stock = warehouseStock?.find((s: any) => s.product_id === product.id);
                      return (
                        <option key={product.id} value={product.id}>
                          {product.name_en} (Stock: {stock?.quantity || 0})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <Label>{t('common.quantity')}</Label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      min="1"
                    />
                    <Button type="button" onClick={handleAddItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
