import { useState } from 'react';
import { Button, Input, Select, SelectItem, Card, CardBody, CardHeader, Chip } from '@heroui/react';

const estados = ['pendiente', 'confirmado', 'despachado'];

export default function NuevoPedido() {
  const [estado, setEstado] = useState('pendiente');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: api.post('/api/v1/pedidos', formData)
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nuevo Pedido</h1>
        {saved && <Chip color="success" variant="flat">Guardado ✓</Chip>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Cliente
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Nombre del cliente" placeholder="Buscar cliente..." isRequired />
            <Input label="Dirección de entrega" placeholder="Calle, número, ciudad..." />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Productos
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Buscar producto" placeholder="Nombre o código..." />
            <div className="bg-default-100 rounded-lg p-3 text-center text-default-400 text-sm">
              Los ítems del pedido aparecerán aquí
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Select
              label="Estado del pedido"
              selectedKeys={[estado]}
              onSelectionChange={keys => setEstado([...keys][0] as string)}
            >
              {estados.map(e => (
                <SelectItem key={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
              ))}
            </Select>
          </CardBody>
        </Card>

        <Button type="submit" color="primary" size="lg" fullWidth isLoading={loading}>
          Guardar Pedido
        </Button>
      </form>
    </div>
  );
}
