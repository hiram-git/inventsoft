import { useState } from 'react';
import { Button, Input, Textarea, Card, CardBody, CardHeader, Divider, Chip } from '@heroui/react';

export default function NuevaCotizacion() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: api.post('/api/v1/cotizaciones', formData)
    await new Promise(r => setTimeout(r, 800)); // simulación
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nueva Cotización</h1>
        {saved && <Chip color="success" variant="flat">Guardado ✓</Chip>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Cliente
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Nombre del cliente" placeholder="Buscar cliente..." isRequired />
            <Input label="Email" type="email" placeholder="cliente@email.com" />
          </CardBody>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-0 font-semibold text-sm text-default-500 uppercase">
            Productos / Servicios
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Buscar producto" placeholder="Nombre o código..." />
            <div className="bg-default-100 rounded-lg p-3 text-center text-default-400 text-sm">
              Los ítems agregados aparecerán aquí
            </div>
          </CardBody>
        </Card>

        {/* Notas */}
        <Card>
          <CardBody>
            <Textarea label="Notas / Observaciones" placeholder="Condiciones, vigencia, etc." minRows={2} />
          </CardBody>
        </Card>

        <Divider />

        <Button
          type="submit"
          color="primary"
          size="lg"
          fullWidth
          isLoading={loading}
        >
          Guardar Cotización
        </Button>
      </form>
    </div>
  );
}
