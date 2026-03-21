import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearAuth, getUser } from '../api/client';

const nav = [
  { to: '/cotizacion', label: 'Cotización', icon: '📋' },
  { to: '/pedido',     label: 'Pedido',     icon: '🛒' },
  { to: '/factura',    label: 'Factura',    icon: '🧾' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 text-white px-4 py-3 flex items-center shadow-md">
        <span className="font-bold text-lg">Inventsoft</span>
        <span className="text-zinc-400 text-sm ml-auto">{user?.nombre ?? ''}</span>
        <button
          onClick={handleLogout}
          className="text-zinc-400 hover:text-white text-sm ml-3 transition-colors"
          title="Cerrar sesión"
        >
          ✕
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
