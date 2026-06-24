import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface Warehouse {
  id: string;
  nombre: string;
  direccion: string;
}

interface Product {
  id: string;
  nombre: string;
  sku: string;
}

export function AddProductToWarehouseModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    idAlmacen: "",
    idProducto: "",
    stock: "0",
    max: "",
    min: "",
    activo: true,
  });

  useEffect(() => {
    async function loadOptions() {
      const idEmpresa = user?.id_empresa || user?.idEmpresa || "";
      const providerId = user?.idProveedor || user?.id_proveedor || "";
      
      if (!idEmpresa) {
        setError("No se pudo identificar la empresa asociada al usuario.");
        setLoadingOptions(false);
        return;
      }

      try {
        setLoadingOptions(true);
        setError(null);

        // 1. Fetch Warehouses
        const warehousesRes = await api.get(`/api/v1/almacenes/mostrar?idEmpresa=${idEmpresa}`);
        if (warehousesRes && Array.isArray(warehousesRes)) {
          setWarehouses(warehousesRes);
          if (warehousesRes.length > 0) {
            const firstW = warehousesRes[0];
            const firstWId = firstW.id || firstW.idAlmacen || "";
            setForm(prev => ({ ...prev, idAlmacen: firstWId }));
          }
        }

        // 2. Fetch Products
        let productsList: Product[] = [];
        try {
          const productsRes = await api.get(`/api/v1/products/all?idEmpresa=${idEmpresa}&page=0&size=1000`);
          if (productsRes) {
            productsList = Array.isArray(productsRes) ? productsRes : productsRes.content || [];
          }
        } catch (e) {
          console.warn("Failing back to provider products endpoint", e);
        }

        if (productsList.length === 0 && providerId) {
          const providerProductsRes = await api.get(`/api/v1/proveedores/${providerId}/productos`);
          if (providerProductsRes && Array.isArray(providerProductsRes)) {
            productsList = providerProductsRes;
          }
        }

        setProducts(productsList);
        if (productsList.length > 0) {
          const firstP = productsList[0];
          const firstPId = firstP.id || (firstP as any).idProducto || "";
          setForm(prev => ({ ...prev, idProducto: firstPId }));
        }

        if (warehousesRes?.length === 0) {
          setError("No tienes almacenes registrados. Por favor registra uno primero.");
        } else if (productsList.length === 0) {
          setError("No tienes productos registrados. Por favor registra uno primero.");
        }
      } catch (err) {
        console.error("Error al cargar opciones del formulario:", err);
        setError("Error al cargar la lista de almacenes o productos.");
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.idAlmacen || !form.idProducto) {
      setError("Por favor selecciona un almacén y un producto.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        idAlmacen: form.idAlmacen,
        idProducto: form.idProducto,
        stock: parseInt(form.stock, 10) || 0,
        max: form.max ? parseFloat(form.max) : null,
        min: form.min ? parseFloat(form.min) : null,
        activo: form.activo,
      };

      await api.post("/api/v1/producto-almacen", payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error al asociar producto al almacén:", err);
      setError("Ocurrió un error al guardar. Verifica los datos ingresados.");
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
              Inventario y Stock
            </p>
            <h2 className="mt-1 text-xl font-semibold text-on-surface">
              Asociar Producto a Almacén
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

        {loadingOptions ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-xs text-on-surface-variant font-medium">Cargando opciones...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Almacén */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Seleccionar Almacén
              </label>
              <select
                value={form.idAlmacen}
                onChange={(e) => setForm({ ...form, idAlmacen: e.target.value })}
                className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-primary transition"
                required
              >
                {warehouses.map((w, idx) => {
                  const wId = w.id || w.idAlmacen || "";
                  return (
                    <option key={wId || idx} value={wId}>
                      {w.nombre} {w.direccion ? `(${w.direccion})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Producto */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Seleccionar Producto
              </label>
              <select
                value={form.idProducto}
                onChange={(e) => setForm({ ...form, idProducto: e.target.value })}
                className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-primary transition"
                required
              >
                {products.map((p, idx) => {
                  const pId = p.id || (p as any).idProducto || "";
                  return (
                    <option key={pId || idx} value={pId}>
                      {p.nombre} {p.sku ? `[${p.sku}]` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Stock */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Cantidad en Stock Inicial
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 50"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-primary transition"
                required
              />
            </div>

            {/* Min & Max */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Ej: 5"
                  value={form.min}
                  onChange={(e) => setForm({ ...form, min: e.target.value })}
                  className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Stock Máximo
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Ej: 500"
                  value={form.max}
                  onChange={(e) => setForm({ ...form, max: e.target.value })}
                  className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            {/* Activo Checkbox */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="activo"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="h-4.5 w-4.5 rounded border-outline/20 accent-primary text-primary"
              />
              <label htmlFor="activo" className="text-xs font-semibold text-on-surface select-none">
                Establecer como activo
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-outline/5 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-outline/10 px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || warehouses.length === 0 || products.length === 0}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-primary hover:brightness-115 transition disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm font-bold">
                  {loading ? "hourglass_empty" : "save"}
                </span>
                {loading ? "Guardando..." : "Asociar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
