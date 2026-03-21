import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardBody, CardHeader, CardSection } from '@/components/ui/card';

export default function NuevoPedido() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Nuevo Pedido</h1>
        {saved && (
          <span className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full font-medium">
            Guardado ✓
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardSection>Cliente</CardSection></CardHeader>
          <CardBody>
            <div><Label htmlFor="cliente">Nombre del cliente *</Label><Input id="cliente" placeholder="Buscar cliente..." required /></div>
            <div><Label htmlFor="direccion">Dirección de entrega</Label><Input id="direccion" placeholder="Calle, número, ciudad..." /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardSection>Productos</CardSection></CardHeader>
          <CardBody>
            <div><Label htmlFor="producto">Buscar producto</Label><Input id="producto" placeholder="Nombre o código..." /></div>
            <div className="bg-zinc-50 rounded-md border border-dashed border-zinc-200 p-4 text-center text-zinc-400 text-sm">
              Los ítems del pedido aparecerán aquí
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Select label="Estado del pedido" id="estado">
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="despachado">Despachado</option>
            </Select>
          </CardBody>
        </Card>

        <Button type="submit" size="lg" isLoading={loading}>
          Guardar Pedido
        </Button>
      </form>
    </div>
  );
}
