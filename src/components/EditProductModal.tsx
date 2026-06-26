import { useState, useEffect } from "react";
import { api } from "../api/client";
import { toast } from "sonner";

interface Categoria {
  id: string;
  nombre: string;
}

interface Props {
  product: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProductModal({ product, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState({
    sku: product?.sku || "",
    nombre: product?.nombre || "",
    descripcion: product?.descripcion || "",
    unidadMedida: product?.unidadMedida || "",
    precioBase: product?.precioBase?.toString() || "0",
    activo: product?.activo ?? true,
    idCategoria: product?.idCategoria || product?.categoria?.id || "",
  });

  useEffect(() => {
    api.get("/api/v1/categorias")
      .then((res) => { 
        if (res && Array.isArray(res)) {
          setCategorias(res);
        } 
      })
      .catch(console.error);
  }, []);

  async function handleSubmit() {
    if (!form.sku || !form.nombre || !form.idCategoria) {
      toast.error("Por favor completa los campos obligatorios: SKU, Nombre y Categoría.");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/api/v1/products/${product.id}`, {
        ...form,
        precioBase: form.precioBase ? parseFloat(form.precioBase) : 0,
      });
      toast.success("Producto modificado correctamente.");
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Error al actualizar el producto.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none";
  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-5 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Modificar Producto
            </p>
            <h2 className="mt-1 text-xl font-semibold text-on-surface">
              Editar propiedades del producto
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* SKU + Nombre */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SKU *</label>
            <input
              type="text"
              placeholder="Ej: CC-V2-8809"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              type="text"
              placeholder="Ej: Cryo-Cell Core V2"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            placeholder="Descripción del producto..."
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={3}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none resize-none"
          />
        </div>

        {/* Unidad de Medida + Precio Unitario */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Unidad de medida</label>
            <input
              type="text"
              placeholder="Ej: kg, unidad, litro"
              value={form.unidadMedida}
              onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Precio unitario</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 150.00"
              value={form.precioBase}
              onChange={(e) => setForm({ ...form, precioBase: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className={labelClass}>Categoría *</label>
          <select
            value={form.idCategoria}
            onChange={(e) => setForm({ ...form, idCategoria: e.target.value })}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none"
          >
            <option value="" disabled>Seleccionar...</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Activo toggle */}
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-container-high/40 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-on-surface">Producto activo</p>
            <p className="text-xs text-on-surface-variant">Visible para compradores en la plataforma</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, activo: !form.activo })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              form.activo ? "bg-primary" : "bg-white/20"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              form.activo ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.sku || !form.nombre || !form.idCategoria}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {loading ? "hourglass_empty" : "save"}
            </span>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}
