/**
 * In-memory API token store para autenticación de aplicaciones móviles.
 * Los tokens expiran en 8 horas (igual que la sesión web).
 */

interface TokenEntry {
  userId:     string;
  sucursalId: string | null;
  expiresAt:  number;
}

const store = new Map<string, TokenEntry>();

export function createToken(userId: string, sucursalId: string | null = null): string {
  const token = crypto.randomUUID();
  store.set(token, { userId, sucursalId, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
  return token;
}

export function verifyToken(token: string): { userId: string; sucursalId: string | null } | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  return { userId: entry.userId, sucursalId: entry.sucursalId };
}

export function revokeToken(token: string) {
  store.delete(token);
}
