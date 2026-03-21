import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import NuevaCotizacion from './pages/NuevaCotizacion';
import NuevoPedido from './pages/NuevoPedido';
import NuevaFactura from './pages/NuevaFactura';
import Login from './pages/Login';
import { getToken } from './api/client';

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/cotizacion" replace />} />
        <Route path="cotizacion" element={<NuevaCotizacion />} />
        <Route path="pedido"     element={<NuevoPedido />} />
        <Route path="factura"    element={<NuevaFactura />} />
      </Route>
    </Routes>
  );
}
