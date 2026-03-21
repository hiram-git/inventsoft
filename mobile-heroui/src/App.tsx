import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import NuevaCotizacion from './pages/NuevaCotizacion';
import NuevoPedido from './pages/NuevoPedido';
import NuevaFactura from './pages/NuevaFactura';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/cotizacion" replace />} />
        <Route path="cotizacion" element={<NuevaCotizacion />} />
        <Route path="pedido"     element={<NuevoPedido />} />
        <Route path="factura"    element={<NuevaFactura />} />
      </Route>
    </Routes>
  );
}
