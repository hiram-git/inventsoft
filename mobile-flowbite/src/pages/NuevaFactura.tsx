import { useState } from 'react';
import { Button, Label, TextInput, Select } from 'flowbite-react';
import ClienteSearch from '../components/ClienteSearch';

export default function NuevaFactura() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [rucRfc, setRucRfc]   = useState('');

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
        <h1 className="text-xl font-bold text-gray-900">Nueva Factura</h1>
        {saved && (
          <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
            Guardado ✓
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</p>
          <ClienteSearch onSelect={c => setRucRfc(c.ruc || c.rfc)} />
          <div>
            <Label htmlFor="ruc" value="RUC / RFC" />
            <TextInput id="ruc" placeholder="Identificación fiscal" value={rucRfc} onChange={e => setRucRfc(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Productos / Servicios</p>
          <div>
            <Label htmlFor="producto" value="Buscar producto o servicio" />
            <TextInput id="producto" placeholder="Nombre o código..." />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-400 text-sm">
            Los ítems facturados aparecerán aquí
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pago</p>
          <div>
            <Label htmlFor="metodo" value="Método de pago" />
            <Select id="metodo">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ref" value="Referencia / Número de operación" />
            <TextInput id="ref" placeholder="Opcional" />
          </div>
        </div>

        {/* Totales */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>$0.00</span></div>
          <div className="flex justify-between text-gray-500"><span>IVA</span><span>$0.00</span></div>
          <hr className="border-blue-200 my-1" />
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>$0.00</span></div>
        </div>

        <Button type="submit" color="blue" size="lg" fullSized isProcessing={loading}>
          Emitir Factura
        </Button>
      </form>
    </div>
  );
}
