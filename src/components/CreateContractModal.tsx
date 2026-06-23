// CreateContractModal.tsx
import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}
export function CreateContractModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Catalogs
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [reglas, setReglas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  // Search terms
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [reglaSearch, setReglaSearch] = useState("");
  const [productoSearch, setProductoSearch] = useState("");

  // Form Fields
  const [idEmpresa, setIdEmpresa] = useState("");
  const [idProveedor, setIdProveedor] = useState(user?.idProveedor || "");
  const [idRegla, setIdRegla] = useState("");
  const [vigenteDesde, setVigenteDesde] = useState("");
  const [vigenteHasta, setVigenteHasta] = useState("");
  const [activo, setActivo] = useState(true);

  // Detail Subform fields
  const [selectedProduct, setSelectedProduct] = useState("");
  const [porcentajeDescuento, setPorcentajeDescuento] = useState("");
  const [detalles, setDetalles] = useState<any[]>([]);

  // Load catalogs on mount
  useEffect(() => {
    async function loadCatalogs() {
      // 1. Fetch Empresas
      try {
        const res = await api.get("/api/v1/empresas");
        setEmpresas(Array.isArray(res) ? res : res?.content || []);
      } catch {
        // Fallback paged
        try {
          const res = await api.get("/api/v1/empresas/paged");
          setEmpresas(Array.isArray(res) ? res : res?.content || []);
        } catch (e) {
          console.error("Error loading empresas", e);
        }
      }

      // 2. Fetch Proveedores
      try {
        const res = await api.get("/api/v1/proveedores/all");
        setProveedores(Array.isArray(res) ? res : res?.content || []);
      } catch (e) {
        console.error("Error loading proveedores", e);
      }

      // 3. Fetch Reglas de Tarifas
      try {
        const res = await api.get("/api/v1/tarifas-reglas");
        setReglas(Array.isArray(res) ? res : res?.content || []);
      } catch (e) {
        console.error("Error loading tarifas-reglas", e);
      }

      // 4. Fetch Productos
      const provId = user?.idProveedor;
      if (provId) {
        try {
          const res = await api.get(`/api/v1/proveedores/${provId}/productos`);
          // Format from [name, price] array or regular objects
          if (Array.isArray(res)) {
            setProductos(res.map((p, idx) => ({
              id: p.id || `prod-index-${idx}`,
              nombre: Array.isArray(p) ? p[0] : p.nombre || p,
              sku: Array.isArray(p) ? p[0] : p.sku || p.nombre || p
            })));
          }
        } catch {
          // fallback to general products
          try {
            const res = await api.get("/api/v1/products");
            setProductos(Array.isArray(res) ? res : res?.content || []);
          } catch (e) {
            console.error("Error loading products", e);
          }
        }
      } else {
        try {
          const res = await api.get("/api/v1/products");
          setProductos(Array.isArray(res) ? res : res?.content || []);
        } catch (e) {
          console.error("Error loading products", e);
        }
      }
    }
    loadCatalogs();
  }, [user]);

  // Filtering lists
  const filteredEmpresas = empresas.filter(e =>
    (e.nombre || "").toLowerCase().includes(empresaSearch.toLowerCase())
  );
  const filteredProveedores = proveedores.filter(p =>
    (p.nombreEmpresa || p.nombre || "").toLowerCase().includes(proveedorSearch.toLowerCase())
  );
  const filteredReglas = reglas.filter(r =>
    (r.nombre || r.descripcion || "").toLowerCase().includes(reglaSearch.toLowerCase())
  );
  const filteredProductos = productos.filter(p =>
    (p.nombre || p.sku || "").toLowerCase().includes(productoSearch.toLowerCase())
  );

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast.error("Por favor selecciona un producto.");
      return;
    }
    const discountNum = parseFloat(porcentajeDescuento);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
      toast.error("El descuento debe ser mayor a 0% y menor o igual a 100%.");
      return;
    }

    // Check duplicate
    if (detalles.some(d => d.idProducto === selectedProduct)) {
      toast.error("Este producto ya ha sido agregado al contrato.");
      return;
    }

    const prodObj = productos.find(p => p.id === selectedProduct);
    setDetalles([
      ...detalles,
      {
        idProducto: selectedProduct,
        porcentajeDescuento: discountNum,
        nombre: prodObj?.nombre || prodObj?.sku || "Producto seleccionado"
      }
    ]);
    setSelectedProduct("");
    setPorcentajeDescuento("");
  };

  const handleRemoveProduct = (idProd: string) => {
    setDetalles(detalles.filter(d => d.idProducto !== idProd));
  };

  const handleSubmit = async () => {
    if (!idEmpresa) {
      toast.error("Seleccione una empresa obligatoria.");
      return;
    }
    if (!idProveedor) {
      toast.error("Seleccione un proveedor obligatorio.");
      return;
    }
    if (!idRegla) {
      toast.error("Seleccione una regla de tarifa obligatoria.");
      return;
    }
    if (!vigenteDesde) {
      toast.error("Seleccione la fecha inicial (Vigente Desde).");
      return;
    }
    if (vigenteHasta && new Date(vigenteHasta) < new Date(vigenteDesde)) {
      toast.error("La fecha 'Vigente Hasta' no puede ser anterior a 'Vigente Desde'.");
      return;
    }
    if (detalles.length === 0) {
      toast.error("Agregue al menos un producto al contrato.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        idEmpresa,
        idProveedor,
        idRegla,
        vigenteDesde: new Date(vigenteDesde).toISOString(),
        vigenteHasta: vigenteHasta ? new Date(vigenteHasta).toISOString() : null,
        activo,
        detalles: detalles.map(d => ({
          idProducto: d.idProducto,
          porcentajeDescuento: d.porcentajeDescuento
        }))
      };

      await api.post("/api/v1/contratos-tarifa", payload);
      toast.success("Contrato creado exitosamente.");
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al crear el contrato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-6 my-8">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Gestión de Contratos / Maestro-Detalle
            </p>
            <h2 className="mt-1 text-2xl font-bold text-on-surface">
              Registrar nuevo contrato
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Maestro Section */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Empresa Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Empresa Cliente *
            </label>
            <input
              type="text"
              placeholder="🔍 Filtrar empresas..."
              value={empresaSearch}
              onChange={(e) => setEmpresaSearch(e.target.value)}
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
            />
            <select
              value={idEmpresa}
              onChange={(e) => setIdEmpresa(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            >
              <option value="">Seleccione Empresa</option>
              {filteredEmpresas.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre || e.razonSocial || e.id}
                </option>
              ))}
            </select>
          </div>

          {/* Proveedor Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Proveedor *
            </label>
            <input
              type="text"
              placeholder="🔍 Filtrar proveedores..."
              value={proveedorSearch}
              onChange={(e) => setProveedorSearch(e.target.value)}
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
            />
            <select
              value={idProveedor}
              onChange={(e) => setIdProveedor(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            >
              <option value="">Seleccione Proveedor</option>
              {filteredProveedores.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombreEmpresa || p.nombre || p.id}
                </option>
              ))}
            </select>
          </div>

          {/* Regla de Tarifa Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Regla de Tarifa *
            </label>
            <input
              type="text"
              placeholder="🔍 Filtrar reglas..."
              value={reglaSearch}
              onChange={(e) => setReglaSearch(e.target.value)}
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
            />
            <select
              value={idRegla}
              onChange={(e) => setIdRegla(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            >
              <option value="">Seleccione Regla</option>
              {filteredReglas.map(r => (
                <option key={r.id} value={r.id}>
                  {r.nombre || r.descripcion || r.id}
                </option>
              ))}
            </select>
          </div>

          {/* Vigente Desde */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Vigente Desde *
            </label>
            <input
              type="date"
              value={vigenteDesde}
              onChange={(e) => setVigenteDesde(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            />
          </div>

          {/* Vigente Hasta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Vigente Hasta
            </label>
            <input
              type="date"
              value={vigenteHasta}
              onChange={(e) => setVigenteHasta(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
            />
          </div>

          {/* Activo Switch */}
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="modal-activo-contract"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-surface-variant text-primary focus:ring-primary"
            />
            <label htmlFor="modal-activo-contract" className="text-sm font-semibold text-on-surface">
              Contrato Activo
            </label>
          </div>
        </div>

        {/* Detalle Section (Add item subform) */}
        <div className="border-t border-white/5 pt-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
            Detalle de Productos
          </h3>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] items-end bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            {/* Producto Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Seleccionar Producto
              </label>
              <input
                type="text"
                placeholder="🔍 Filtrar productos..."
                value={productoSearch}
                onChange={(e) => setProductoSearch(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
              />
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
              >
                <option value="">Seleccione Producto</option>
                {filteredProductos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre || p.sku}
                  </option>
                ))}
              </select>
            </div>

            {/* % Descuento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                % Descuento
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100.00"
                  placeholder="0.00"
                  value={porcentajeDescuento}
                  onChange={(e) => setPorcentajeDescuento(e.target.value)}
                  className="w-full rounded-xl bg-white pl-4 pr-8 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-semibold">%</span>
              </div>
            </div>

            {/* Add Button */}
            <button
              type="button"
              onClick={handleAddProduct}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition hover:bg-cyan-300"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              Agregar
            </button>
          </div>

          {/* Detalles Table */}
          <div className="rounded-2xl border border-white/10 bg-surface/40 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">% Descuento</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {detalles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-xs text-on-surface-variant">
                      Sin productos agregados al detalle del contrato.
                    </td>
                  </tr>
                ) : (
                  detalles.map(d => (
                    <tr key={d.idProducto}>
                      <td className="px-4 py-3 font-semibold text-on-surface text-xs">{d.nombre}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold text-xs">{d.porcentajeDescuento}%</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(d.idProducto)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {loading ? "hourglass_empty" : "description"}
            </span>
            {loading ? "Guardando..." : "Guardar contrato"}
          </button>
        </div>

      </div>
    </div>
  );
}