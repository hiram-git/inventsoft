import { useState } from 'react';
import { Button, Label, TextInput, Textarea } from 'flowbite-react';
import ClienteSearch from '../components/ClienteSearch';

export default function NuevaCotizacion() {
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [clienteEmail, setClienteEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: api.post('/api/cotizaciones', formData)
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Nueva Cotización</h1>
        {saved && (
          <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
            Guardado ✓
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</p>
          <ClienteSearch onSelect={c => setClienteEmail(c.email)} />
          <div>
            <Label htmlFor="email" value="Email" />
            <TextInput id="email" type="email" placeholder="cliente@email.com" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Productos / Servicios</p>
          <div>
            <Label htmlFor="producto" value="Buscar producto" />
            <TextInput id="producto" placeholder="Nombre o código..." />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-400 text-sm">
            Los ítems agregados aparecerán aquí
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <Label htmlFor="notas" value="Notas / Observaciones" />
          <Textarea id="notas" placeholder="Condiciones, vigencia, etc." rows={2} />
        </div>

        <Button type="submit" color="blue" size="lg" fullSized isProcessing={loading}>
          Guardar Cotización
        </Button>
      </form>
    </div>
  );
}
