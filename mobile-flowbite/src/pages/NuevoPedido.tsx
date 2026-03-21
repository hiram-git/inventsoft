import { useState } from 'react';
import { Button, Label, TextInput, Select } from 'flowbite-react';
import ClienteSearch from '../components/ClienteSearch';

export default function NuevoPedido() {
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [direccion, setDireccion]   = useState('');

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
        <h1 className="text-xl font-bold text-gray-900">Nuevo Pedido</h1>
        {saved && (
          <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
            Guardado ✓
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</p>
          <ClienteSearch onSelect={c => setDireccion(c.direccion)} />
          <div>
            <Label htmlFor="direccion" value="Dirección de entrega" />
            <TextInput id="direccion" placeholder="Calle, número, ciudad..." value={direccion} onChange={e => setDireccion(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Productos</p>
          <div>
            <Label htmlFor="producto" value="Buscar producto" />
            <TextInput id="producto" placeholder="Nombre o código..." />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-400 text-sm">
            Los ítems del pedido aparecerán aquí
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <Label htmlFor="estado" value="Estado del pedido" />
          <Select id="estado">
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="despachado">Despachado</option>
          </Select>
        </div>

        <Button type="submit" color="blue" size="lg" fullSized isProcessing={loading}>
          Guardar Pedido
        </Button>
      </form>
    </div>
  );
}
