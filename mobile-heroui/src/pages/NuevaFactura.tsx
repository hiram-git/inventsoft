import { useState } from 'react';
import { Button, Input, Select, SelectItem, Card, CardBody, CardHeader, Divider, Chip } from '@heroui/react';

const metodosPago = ['efectivo', 'transferencia', 'tarjeta', 'cheque'];

export default function NuevaFactura() {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: api.post('/api/v1/facturas', formData)
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nueva Factura</h1>
        {saved && <Chip color="success" variant="flat">Guardado ✓</Chip>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Cliente
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Nombre del cliente" placeholder="Buscar cliente..." isRequired />
            <Input label="RUC / RFC" placeholder="Identificación fiscal" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Productos / Servicios
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Buscar producto o servicio" placeholder="Nombre o código..." />
            <div className="bg-default-100 rounded-lg p-3 text-center text-default-400 text-sm">
              Los ítems facturados aparecerán aquí
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Pago
          </CardHeader>
          <CardBody className="space-y-3">
            <Select
              label="Método de pago"
              selectedKeys={[metodoPago]}
              onSelectionChange={keys => setMetodoPago([...keys][0] as string)}
            >
              {metodosPago.map(m => (
                <SelectItem key={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
              ))}
            </Select>
            <Input label="Referencia / Número de operación" placeholder="Opcional" />
          </CardBody>
        </Card>

        {/* Totales */}
        <Card className="bg-primary-50 border border-primary-200">
          <CardBody className="space-y-1 text-sm">
            <div className="flex justify-between text-default-500">
              <span>Subtotal</span><span>$0.00</span>
            </div>
            <div className="flex justify-between text-default-500">
              <span>IVA</span><span>$0.00</span>
            </div>
            <Divider className="my-1" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span><span>$0.00</span>
            </div>
          </CardBody>
        </Card>

        <Button type="submit" color="primary" size="lg" fullWidth isLoading={loading}>
          Emitir Factura
        </Button>
      </form>
    </div>
  );
}
