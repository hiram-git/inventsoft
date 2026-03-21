import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react';
import { loginUser } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="flex flex-col items-center gap-1 pt-8 pb-2">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Inventsoft</h1>
          <p className="text-sm text-default-500">Ingrese sus credenciales</p>
        </CardHeader>

        <CardBody className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onValueChange={setEmail}
              isRequired
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onValueChange={setPassword}
              isRequired
              autoComplete="current-password"
            />

            <Button
              type="submit"
              color="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              className="mt-2"
            >
              Iniciar Sesión
            </Button>
          </form>

          <p className="text-center text-xs text-default-400 mt-4">
            Demo: admin@portal.com / admin123
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
