import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  nombre: string;
  idProveedor: string;
  nombreProveedor: string;
  stock: number;
  precio: number;
  cantidadMinima: number;
  cantidadMaxima: number;
}

export interface ProductResult {
  sku: string;
  nombre: string;
  descripcion?: string;
  almacenes: Warehouse[];
}

interface CreateOrderPayload {
  total: number;
  fecha: string;        // Instant → ISO string
  fechaOrden: string;   // LocalDate → "YYYY-MM-DD"
  idEstado: string;
  idProveedor: string;  // UUID
  idUsuario: string;    // UUID
  version: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function Icon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
    >
      {name}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function CreateOrderModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();

  const [sku, setSku] = useState("");
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuError, setSkuError] = useState("");
  const [product, setProduct] = useState<ProductResult | null>(null);

  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const [cantidad, setCantidad] = useState(1);
  const [fechaOrden, setFechaOrden] = useState(() => new Date().toISOString().split("T")[0]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const skuInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSku("");
      setSkuError("");
      setProduct(null);
      setSelectedWarehouse(null);
      setCantidad(1);
      setFechaOrden(new Date().toISOString().split("T")[0]);
      setSubmitError("");
      setSuccess(false);
      setTimeout(() => skuInputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (selectedWarehouse) {
      setCantidad(selectedWarehouse.cantidadMinima || 1);
    }
  }, [selectedWarehouse]);

  if (!open) return null;

  async function handleSkuSearch() {
    const trimmed = sku.trim();
    if (!trimmed) return;
    setSkuLoading(true);
    setSkuError("");
    setProduct(null);
    setSelectedWarehouse(null);
    try {
      const res = await api.get(`/api/v1/producto-almacen/buscar?sku=${encodeURIComponent(trimmed)}`);
      if (!res) throw new Error("Producto no encontrado");

      // Log real response so we can see the actual shape
      console.log("[CreateOrderModal] SKU response:", JSON.stringify(res, null, 2));

      // Normalize: API may return an array directly, or wrap in { content, data, almacenes, etc. }
      let normalized: ProductResult;
      if (Array.isArray(res)) {
        const first = res[0] ?? {};
        normalized = {
          sku: trimmed,
          nombre: first.nombreProducto ?? "Producto",
          descripcion: undefined,
          almacenes: res.map((item: any, index: number) => ({
            id: item.idAlmacen ?? `almacen-${index}`,
            nombre: item.nombreAlmacen ?? `Almacén ${index + 1}`,
            idProveedor: item.idProveedor ?? "",
            nombreProveedor: item.nombreProveedor ?? item.nombreAlmacen ?? "",
            stock: item.stock ?? 0,
            precio: item.precioBase ?? item.precio ?? 0,
            cantidadMinima: item.min ?? 1,
            cantidadMaxima: item.max ?? 9999,
          })),
        };
      } else {
        // Object shape — ensure almacenes is always an array
        normalized = {
          sku: res.sku ?? res.codigoSku ?? trimmed,
          nombre: res.nombreProducto ?? res.nombre ?? "Producto",
          descripcion: res.descripcion ?? undefined,
          almacenes: Array.isArray(res.almacenes) ? res.almacenes.map((item: any) => ({
            id: item.idSucursal ?? item.id,
            nombre: item.nombreSucursal ?? item.nombreAlmacen ?? item.nombre ?? "Almacén",
            idProveedor: item.idProveedor ?? item.proveedor?.id ?? "",
            nombreProveedor: item.nombreProveedor ?? item.proveedor?.nombre ?? "",
            stock: item.stock ?? item.cantidad ?? 0,
            precio: item.precio ?? item.precioUnitario ?? 0,
            cantidadMinima: item.cantidadMinima ?? item.minimo ?? 1,
            cantidadMaxima: item.cantidadMaxima ?? item.maximo ?? 9999,
          })) : [],
        };
      }

      setProduct(normalized);
    } catch (e: any) {
      setSkuError(e?.message || "No se encontró ningún producto con ese SKU.");
    } finally {
      setSkuLoading(false);
    }
  }

  function handleSkuKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSkuSearch();
  }

  async function handleSubmit() {
    if (!selectedWarehouse || !product || !user) return;

    const total = selectedWarehouse.precio * cantidad;
    const now = new Date();

    const payload: CreateOrderPayload = {
      total,
      fecha: now.toISOString(),
      fechaOrden,
      idEstado: "pendiente",
      idProveedor: selectedWarehouse.idProveedor,
      idUsuario: user.id,
      version: 0
    };

    console.log("[CreateOrderModal] Submitting order payload:", payload);

    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/api/v1/ordenes-compra", payload);
      setSuccess(true);
      onCreated?.();
    } catch (e: any) {
      setSubmitError(e?.message || "Error al crear la orden. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const total = selectedWarehouse ? selectedWarehouse.precio * cantidad : 0;
  const cantidadValid =
    selectedWarehouse !== null &&
    cantidad >= selectedWarehouse.cantidadMinima &&
    cantidad <= selectedWarehouse.cantidadMaxima &&
    cantidad <= selectedWarehouse.stock;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label="Nueva orden de compra" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-surface shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Icon name="add_shopping_cart" className="text-primary text-base" />
              </div>
              <div>
                <p className="font-bold text-on-surface">Nueva Orden de Compra</p>
                <p className="text-[11px] text-on-surface-variant">Busca un producto por SKU y elige el almacén</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Cerrar"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 max-h-[70vh]">
            {success ? (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary/10 border border-tertiary/20">
                  <Icon name="check_circle" filled className="text-tertiary text-3xl" />
                </div>
                <div>
                  <p className="font-bold text-on-surface text-lg">¡Orden creada!</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    La orden fue registrada con estado <span className="text-primary font-bold">Pendiente</span>.
                  </p>
                </div>
                <button onClick={onClose} className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-110">
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                {/* Step 1: SKU */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Buscar producto por SKU
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Icon name="qr_code" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
                      <input
                        ref={skuInputRef}
                        type="text"
                        value={sku}
                        onChange={(e) => { setSku(e.target.value); setSkuError(""); setProduct(null); setSelectedWarehouse(null); }}
                        onKeyDown={handleSkuKeyDown}
                        placeholder="Ej. PROD-00123"
                        className="w-full rounded-lg border border-white/10 bg-surface-container-low pl-10 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={handleSkuSearch}
                      disabled={!sku.trim() || skuLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold text-on-primary transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {skuLoading
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                        : <Icon name="search" className="text-sm" />}
                      Buscar
                    </button>
                  </div>
                  {skuError && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-error">
                      <Icon name="error_outline" className="text-sm" />
                      {skuError}
                    </p>
                  )}
                </div>

                {/* Product info */}
                {product && (
                  <>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Icon name="inventory_2" className="text-primary text-base" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface">{product.nombre}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          SKU: <span className="font-mono text-primary">{product.sku}</span>
                        </p>
                        {product.descripcion && (
                          <p className="mt-1 text-xs text-on-surface-variant leading-5 line-clamp-2">{product.descripcion}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-tertiary/10 border border-tertiary/20 px-2.5 py-1 text-[10px] font-bold text-tertiary">
                        {product.almacenes.length} almacén{product.almacenes.length !== 1 ? "es" : ""}
                      </span>
                    </div>

                    {/* Step 2: Warehouse */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                        Seleccionar almacén
                      </label>
                      {product.almacenes.length === 0 ? (
                        <div className="rounded-xl border border-white/10 bg-surface-container-low px-5 py-6 text-center">
                          <Icon name="warehouse" className="text-on-surface-variant text-2xl mb-2" />
                          <p className="text-sm text-on-surface-variant">No hay almacenes disponibles para este producto.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {product.almacenes.map((w) => {
                            const isSelected = selectedWarehouse?.id === w.id;
                            const outOfStock = w.stock === 0;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                disabled={outOfStock}
                                onClick={() => setSelectedWarehouse(isSelected ? null : w)}
                                className={`w-full text-left rounded-xl border px-5 py-4 transition ${
                                  isSelected
                                    ? "border-primary bg-primary/[0.08]"
                                    : outOfStock
                                    ? "border-white/5 bg-surface-container-low/50 opacity-50 cursor-not-allowed"
                                    : "border-white/10 bg-surface-container-low hover:border-primary/30"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                      isSelected ? "border-primary bg-primary" : "border-white/20"
                                    }`}>
                                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm text-on-surface truncate">{w.nombre}</p>
                                      <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                                        <Icon name="store" className="text-xs" />
                                        {w.nombreProveedor}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="shrink-0 grid grid-cols-3 gap-4 text-right">
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Stock</p>
                                      <p className={`text-sm font-bold mt-0.5 ${outOfStock ? "text-error" : w.stock < 10 ? "text-secondary" : "text-tertiary"}`}>
                                        {outOfStock ? "Agotado" : w.stock}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Precio</p>
                                      <p className="text-sm font-bold text-on-surface mt-0.5">Bs {w.precio.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Min/Máx</p>
                                      <p className="text-sm font-bold text-on-surface-variant mt-0.5">{w.cantidadMinima}–{w.cantidadMaxima}</p>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Step 3: Quantity + date */}
                    {selectedWarehouse && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                            Cantidad
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCantidad((v) => Math.max(selectedWarehouse.cantidadMinima, v - 1))}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-surface-container-low text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
                            >
                              <Icon name="remove" className="text-sm" />
                            </button>
                            <input
                              type="number"
                              value={cantidad}
                              min={selectedWarehouse.cantidadMinima}
                              max={Math.min(selectedWarehouse.cantidadMaxima, selectedWarehouse.stock)}
                              onChange={(e) => setCantidad(Number(e.target.value))}
                              className="w-full rounded-lg border border-white/10 bg-surface-container-low px-3 py-2.5 text-center text-sm font-bold text-on-surface outline-none transition focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setCantidad((v) => Math.min(Math.min(selectedWarehouse.cantidadMaxima, selectedWarehouse.stock), v + 1))}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-surface-container-low text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
                            >
                              <Icon name="add" className="text-sm" />
                            </button>
                          </div>
                          {!cantidadValid && cantidad > 0 && (
                            <p className="mt-1.5 text-[11px] font-semibold text-secondary">
                              Rango válido: {selectedWarehouse.cantidadMinima}–{Math.min(selectedWarehouse.cantidadMaxima, selectedWarehouse.stock)}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                            Fecha de orden
                          </label>
                          <input
                            type="date"
                            value={fechaOrden}
                            onChange={(e) => setFechaOrden(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-surface-container-low px-3 py-2.5 text-sm font-bold text-on-surface outline-none transition focus:border-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* Total preview */}
                    {selectedWarehouse && cantidadValid && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <Icon name="calculate" className="text-primary text-base" />
                          <span className="font-bold">{cantidad} × Bs {selectedWarehouse.precio.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total</p>
                          <p className="text-2xl font-bold text-primary">Bs {total.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {submitError && (
                  <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-xs font-semibold text-error">
                    <Icon name="error_outline" className="mt-0.5 shrink-0 text-sm" />
                    {submitError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-surface px-5 py-2.5 text-xs font-bold text-on-surface-variant transition hover:border-primary/30 hover:text-on-surface"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedWarehouse || !cantidadValid || submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-on-primary transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  : <Icon name="send" className="text-sm" />}
                Crear Orden
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}