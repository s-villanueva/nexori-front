// CreateWarehouseModal.tsx
import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateWarehouseModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    latitud: "",
    longitud: "",
  });

  async function handleSubmit() {
    if (!form.nombre || !form.direccion || !form.latitud || !form.longitud) return;

    setLoading(true);
    try {
      await api.post("/api/v1/almacenes", {
        nombre: form.nombre,
        direccion: form.direccion,
        coordenadas: `${form.latitud},${form.longitud}`, // o { x, y } según tu backend
        activo: true,
        id_empresa: user?.id_empresa,
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-5">
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Gestión de almacenes
            </p>
            <h2 className="mt-1 text-xl font-semibold text-on-surface">
              Registrar nuevo almacén
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Nombre del almacén
          </label>
          <input
            type="text"
            placeholder="Ej: Almacén Central Norte"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>

        {/* Dirección */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Dirección
          </label>
          <input
            type="text"
            placeholder="Ej: Av. Blanco Galindo km 5, Cochabamba"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>

        {/* Coordenadas */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Coordenadas
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              placeholder="Latitud"
              value={form.latitud}
              onChange={(e) => setForm({ ...form, latitud: e.target.value })}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitud"
              value={form.longitud}
              onChange={(e) => setForm({ ...form, longitud: e.target.value })}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Info */}
        <p className="rounded-xl border border-white/5 bg-surface-container-high/40 px-4 py-3 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined mr-1 align-middle text-sm">info</span>
          <code className="text-primary font-semibold">id_empresa</code> y <code className="text-primary font-semibold">activo: true</code> se adjuntan automáticamente desde la sesión.
        </p>

        {/* Acciones */}
        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {loading ? "hourglass_empty" : "warehouse"}
            </span>
            {loading ? "Guardando..." : "Crear almacén"}
          </button>
        </div>

      </div>
    </div>
  );
}