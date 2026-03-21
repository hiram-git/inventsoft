import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardBody, CardHeader, CardSection } from '@/components/ui/card';

export default function NuevaCotizacion() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: api.post('/api/v1/cotizaciones', formData)
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Nueva Cotización</h1>
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
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="cliente@email.com" /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardSection>Productos / Servicios</CardSection></CardHeader>
          <CardBody>
            <div><Label htmlFor="producto">Buscar producto</Label><Input id="producto" placeholder="Nombre o código..." /></div>
            <div className="bg-zinc-50 rounded-md border border-dashed border-zinc-200 p-4 text-center text-zinc-400 text-sm">
              Los ítems agregados aparecerán aquí
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Label htmlFor="notas">Notas / Observaciones</Label>
            <textarea
              id="notas"
              rows={2}
              placeholder="Condiciones, vigencia, etc."
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 resize-none"
            />
          </CardBody>
        </Card>

        <Button type="submit" size="lg" isLoading={loading}>
          Guardar Cotización
        </Button>
      </form>
    </div>
  );
}
