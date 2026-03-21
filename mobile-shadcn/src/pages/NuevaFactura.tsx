import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardBody, CardHeader, CardSection } from '@/components/ui/card';
import ClienteSearch from '@/components/ClienteSearch';

export default function NuevaFactura() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [rucRfc, setRucRfc]   = useState('');

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
        <h1 className="text-xl font-bold text-zinc-900">Nueva Factura</h1>
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
            <ClienteSearch onSelect={c => setRucRfc(c.ruc || c.rfc)} />
            <div className="mt-3"><Label htmlFor="ruc">RUC / RFC</Label><Input id="ruc" placeholder="Identificación fiscal" value={rucRfc} onChange={e => setRucRfc(e.target.value)} /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardSection>Productos / Servicios</CardSection></CardHeader>
          <CardBody>
            <div><Label htmlFor="producto">Buscar producto o servicio</Label><Input id="producto" placeholder="Nombre o código..." /></div>
            <div className="bg-zinc-50 rounded-md border border-dashed border-zinc-200 p-4 text-center text-zinc-400 text-sm">
              Los ítems facturados aparecerán aquí
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardSection>Pago</CardSection></CardHeader>
          <CardBody>
            <Select label="Método de pago" id="metodo">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
            </Select>
            <div><Label htmlFor="ref">Referencia / Número de operación</Label><Input id="ref" placeholder="Opcional" /></div>
          </CardBody>
        </Card>

        {/* Totales */}
        <Card className="bg-zinc-50">
          <CardBody className="space-y-1 text-sm">
            <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>$0.00</span></div>
            <div className="flex justify-between text-zinc-500"><span>IVA</span><span>$0.00</span></div>
            <hr className="border-zinc-200" />
            <div className="flex justify-between font-bold text-base text-zinc-900"><span>Total</span><span>$0.00</span></div>
          </CardBody>
        </Card>

        <Button type="submit" size="lg" isLoading={loading}>
          Emitir Factura
        </Button>
      </form>
    </div>
  );
}
