import { db } from '../db';
import * as schema from '../db/schema';

// Cached in memory: once the app confirms setup is done, skip the DB check on every request.
// Reset to null when setup completes so the next request re-validates.
let _complete: boolean | null = null;

export async function isSetupComplete(): Promise<boolean> {
  if (_complete === true) return true;
  try {
    const rows = await db.select({ id: schema.empresa.id }).from(schema.empresa).limit(1);
    _complete = rows.length > 0;
  } catch {
    // Table doesn't exist yet → setup needed
    _complete = false;
  }
  return _complete;
}

export function markSetupComplete(): void {
  _complete = true;
}

export function invalidateSetupCache(): void {
  _complete = null;
}
