import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  ruc: string;
  rfc: string;
  telefono: string;
  direccion: string;
}

interface Props {
  onSelect: (cliente: Cliente) => void;
}

export default function ClienteSearch({ onSelect }: Props) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Cliente[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState('');
  const containerRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<Cliente[]>(`/api/clientes?q=${encodeURIComponent(query)}`);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(c: Cliente) {
    setSelected(c.nombre);
    setQuery(c.nombre);
    setOpen(false);
    onSelect(c);
  }

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor="cliente">Nombre del cliente *</Label>
      <div className="relative">
        <Input
          id="cliente"
          placeholder="Buscar cliente..."
          value={selected || query}
          onChange={e => { setSelected(''); setQuery(e.target.value); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          required
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            ⏳
          </span>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map(c => (
            <li
              key={c.id}
              className="px-3 py-2 hover:bg-zinc-50 cursor-pointer"
              onMouseDown={() => handleSelect(c)}
            >
              <p className="text-sm font-medium text-zinc-900">{c.nombre}</p>
              {(c.ruc || c.rfc) && (
                <p className="text-xs text-zinc-400">{c.ruc || c.rfc}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
