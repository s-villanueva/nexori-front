import { useState } from "react";
import { api } from "../api/client";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCategoryModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      };

      await api.post("/api/v1/categorias", payload);
      toast.success("Categoría creada con éxito.");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error al crear la categoría:", err);
      setError(err.message || "Ocurrió un error al intentar crear la categoría.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Catálogo de Productos
            </p>
            <h2 className="mt-1 text-xl font-semibold text-on-surface">
              Crear Nueva Categoría
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-on-surface-variant hover:text-on-surface transition">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/25 p-3.5 text-xs text-error font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Nombre de la categoría
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Electrónica, Oficina, etc."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Descripción (Opcional)
            </label>
            <textarea
              placeholder="Escribe una breve descripción de la categoría..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm font-bold">
                {loading ? "hourglass_empty" : "save"}
              </span>
              {loading ? "Guardando..." : "Crear"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
