import { useState, useEffect, type MouseEventHandler } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { CreateOrderModal } from "./CreateOrderModal";
import { StereumPayModal } from "./StereumPayModal"; 
import { CreateContractModal } from "./CreateContractModal"; 
import { toast } from "sonner"; 

type NavKey = "dashboard" | "orders" | "invoices" | "contracts" |  "suppliers" | "account";

const NAV_ITEMS: { key: NavKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "orders", label: "Mis órdenes", icon: "receipt_long" },
  { key: "invoices", label: "Facturas", icon: "receipt" },
  { key: "contracts", label: "Contratos", icon: "description" },
  { key: "suppliers", label: "Proveedores", icon: "groups" },
  { key: "account", label: "Mi cuenta", icon: "account_circle" },
];

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

export function BuyerDashboard({ userEmail, onSignOut }: { userEmail: string; onSignOut: MouseEventHandler<HTMLButtonElement> }) {
  const { user } = useAuth();
  const [active, setActive] = useState<NavKey>("dashboard");
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrderIdForPay, setSelectedOrderIdForPay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado para controlar la visibilidad del modal de contratos
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  // Estado para controlar la visibilidad del modal de órdenes
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // API Stats
  const [orderStats, setOrderStats] = useState({ ordenesTotales: 0, pendientes: 0, gastoMensual: 0 });
  const [invoiceStats, setInvoiceStats] = useState({ faltaPago: 0, pagadoHoy: 0 });
  const [contractStats, setContractStats] = useState({ contratosTotales: 0, descuentoPromedio: 0, vencimientosCercanos: 0 });

  // API Lists
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbContracts, setDbContracts] = useState<any[]>([]);
  const [dbSuppliers, setDbSuppliers] = useState<any[]>([]);

  // 2FA & Supplier Conversion state variables
  const [showBecomeSupplierModal, setShowBecomeSupplierModal] = useState(false);

  // 2FA state variables
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpVerifying, setTotpVerifying] = useState(false);
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);

  const companyId = user?.id_empresa || "";

  useEffect(() => {
    async function fetchStatsAndData() {
      if (!companyId) return;
      setLoading(true);
      try {
        if (active === "dashboard" || active === "orders") {
          try {
            const stats = await api.get(`/api/v1/ordenes-compra/stats?idEmpresa=${companyId}`);
            if (stats) setOrderStats({ ordenesTotales: stats.ordenesTotales ?? 0, pendientes: stats.pendientes ?? 0, gastoMensual: stats.gastoMensual ?? 0 });
          } catch (e) { console.error(e); }

          try {
            const res = await api.get(`/api/v1/ordenes-compra/buyer?idEmpresa=${companyId}&size=10&page=0`);
            if (res?.content) setDbOrders(res.content);
          } catch (e) { console.error(e); }
        }

        if (active === "dashboard" || active === "invoices") {
          try {
            const stats = await api.get(`/api/v1/facturas/stats?idEmpresa=${companyId}`);
            if (stats) setInvoiceStats({ faltaPago: stats.faltaPago ?? 0, pagadoHoy: stats.pagadoHoy ?? 0 });
          } catch (e) { console.error(e); }

          try {
            const res = await api.get(`/api/v1/facturas?idEmpresa=${companyId}&size=10&page=0`);
            if (res?.content) setDbInvoices(res.content);
          } catch (e) { console.error(e); }
        }

        if (active === "contracts" || active === "dashboard") {
          try {
            const stats = await api.get(`/api/v1/contratos-detalle/stats?idEmpresa=${companyId}`);
            if (stats) setContractStats({ contratosTotales: stats.contratosTotales ?? 0, descuentoPromedio: stats.descuentoPromedio ?? 0, vencimientosCercanos: stats.vencimientosCercanos ?? 0 });
          } catch (e) { console.error(e); }

          try {
            const res = await api.get(`/api/v1/contratos-detalle?idEmpresa=${companyId}&page=0&size=10`);
            if (res?.content) setDbContracts(res.content);
          } catch (e) { console.error(e); }
        }

        // Cargamos proveedores si estamos en la pestaña o si abrimos el modal de contratos
        if (active === "suppliers" || active === "contracts") {
          try {
            const res = await api.get(`/api/v1/proveedores?page=0&size=50`);
            if (res?.content) setDbSuppliers(res.content);
          } catch (e) { console.error(e); }
        }
      } catch (err) {
        console.error("Error loading buyer dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatsAndData();
  }, [active, companyId]);

  const handleContractSubmit = async (formData: any) => {
    try {
      // Inyección a la API estructurada según el formulario enviado por el modal
      const payload = {
        idEmpresa: companyId,
        idProveedor: formData.idProveedor,
        vigenteDesde: formData.vigenteDesde,
        vigenteHasta: formData.vigenteHasta,
        detalles: [
          {
            idRegla: formData.idRegla,
            porcentajeDescuento: formData.porcentajeDescuento,
            idProducto: formData.idProducto
          }
        ]
      };

      await api.post("/api/v1/contratos-detalle", payload);
      alert("Contrato firmado e inyectado con éxito.");
      setIsContractModalOpen(false);
      
      // Forzar recarga de la lista de contratos
      const res = await api.get(`/api/v1/contratos-detalle?idEmpresa=${companyId}&page=0&size=10`);
      if (res?.content) setDbContracts(res.content);
    } catch (error) {
      console.error("Error al crear el contrato:", error);
      alert("Ocurrió un error al guardar el contrato B2B.");
    }
  };

  const handleOrderSubmit = async (formData: any) => {
  try {
    const payload = {
      idEmpresa: companyId,
      idProveedor: formData.idProveedor,
      fecha: formData.fecha,
      detalles: formData.detalles, // ajusta según el shape que espera tu API
    };

    //total
    //fecha
    //proveedor
    //empresaCompradora
    //sucursal
    //usuario

    await api.post("/api/v1/ordenes-compra", payload);
    alert("Orden creada con éxito.");
    setIsOrderModalOpen(false);

    // Refrescar lista
    const res = await api.get(`/api/v1/ordenes-compra/buyer?idEmpresa=${companyId}&size=10&page=0`);
    if (res?.content) setDbOrders(res.content);
  } catch (error) {
    console.error("Error al crear la orden:", error);
    alert("Ocurrió un error al guardar la orden.");
  }
};

  const handle2FASetup = async () => {
    if (!user?.id) return;
    setTotpLoading(true);
    setTotpError(null);
    try {
      const res = await api.get(`/api/v1/usuarios/auth-code/${user.id}`);
      setTotpQr(typeof res === "string" ? res : res?.qrCode ?? res?.base64 ?? null);
    } catch (e: any) {
      toast.error("No se pudo obtener el código QR.");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!user?.id || totpCode.length !== 6) return;
    setTotpVerifying(true);
    setTotpError(null);
    try {
      await api.post(`/api/v1/usuarios/verify/${user.id}?code=${totpCode}`, {});
      setTotpVerified(true);
      setTotpQr(null);
      setTotpCode("");
      toast.success("Autenticación en 2 pasos activada correctamente.");
    } catch (e: any) {
      setTotpError("Código incorrecto. Intenta de nuevo.");
    } finally {
      setTotpVerifying(false);
    }
  };

  const ordersList = dbOrders.map(o => ({
    id: o.id,
    initials: (o.nombreProveedor || "P").substring(0,2).toUpperCase(),
    supplier: o.nombreProveedor || "Proveedor Demo SRL",
    date: o.fecha ? new Date(o.fecha).toLocaleDateString() : "N/A",
    amount: `Bs ${o.total}`,
    status: (o.idEstado || "pendiente").toUpperCase()
  }));

  const invoicesList = dbInvoices.map(i => ({
    id: i.id,
    date: i.fecha ? new Date(i.fecha).toLocaleDateString() : "N/A",
    initials: (i.idOrden?.idProveedor?.idEmpresa?.nombre || i.idOrden?.nombreProveedor || "P").substring(0,2).toUpperCase(),
    supplier: i.idOrden?.idProveedor?.idEmpresa?.nombre || i.idOrden?.nombreProveedor || "Proveedor Demo SRL",
    buyer: i.idOrden?.idEmpresaCompradora?.nombre || i.idOrden?.nombreEmpresaCompradora || "Empresa Compradora Demo SA",
    total: `Bs ${i.total}`,
    status: i.idEstado === "pendiente" ? "Pendiente" : "Pagada"
  }));

  const contractsList = dbContracts.map(c => {
    const sName = c.nombreProveedor || c.nombreEmpresa || c.idProveedor?.nombreEmpresa || c.idProveedor?.nombre || "Proveedor Demo SRL";
    return {
      id: c.idContrato || "CTR-DEMO",
      initials: sName.substring(0, 2).toUpperCase(),
      supplier: sName,
      category: c.nombreCategoria || "Suministros",
      period: c.validez || "Vigente",
      discount: `${c.descuento || 0}%`,
      status: c.estado || "Activo",
      periods: null,
      alert: null,
      note: null
    };
  });

  const suppliersList = dbSuppliers.map(s => ({
    id: s.id,
    initials: (s.nombreEmpresa || "P").substring(0,2).toUpperCase(),
    name: s.nombreEmpresa || "Proveedor SRL",
    tags: s.tags || ["Proveedor"],
    metric: "Confianza del Comprador",
    score: s.score || 95,
    online: s.activo ?? true,
    icon: "store"
  }));

  const contractStatsList = [
    { label: "Contratos Totales", value: contractStats.contratosTotales.toString(), note: "Activos", icon: "description", tone: "text-on-surface" },
    { label: "Tasa de Descuento Promedio", value: contractStats.descuentoPromedio > 0 ? `${contractStats.descuentoPromedio}%` : "0%", note: "Cumplimiento B2B", icon: "verified", tone: "text-primary" },
    { label: "Próximos Vencimientos", value: contractStats.vencimientosCercanos ? contractStats.vencimientosCercanos.toString() : "0", note: contractStats.vencimientosCercanos > 0 ? "Urgente" : "Estable", icon: "warning", tone: contractStats.vencimientosCercanos > 0 ? "text-error" : "text-secondary" },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-[#0A4A3A]/20 bg-[#0F6E56] p-5 text-white flex flex-col justify-between">
          <div>
            <div className="mb-8 flex flex-col items-center gap-2 rounded-3xl bg-white p-4">
              <img src="/logo.png" alt="Logo" className="max-h-12 max-w-full object-contain" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#0F6E56] font-bold">Buyer Portal</span>
            </div>

            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={`flex w-full items-center gap-3 rounded-3xl border px-4 py-3 text-left text-sm transition ${
                    active === item.key
                      ? "border-[#BA7517] bg-[#BA7517]/25 text-white font-semibold shadow-sm"
                      : "border-transparent bg-[#0A4A3A]/30 text-white/80 hover:bg-[#0A4A3A]/50 hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} filled={active === item.key} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-[#0A4A3A]/40 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Cuenta</p>
            <p className="mt-3 text-sm font-semibold text-white truncate">{userEmail}</p>
            <button onClick={onSignOut} className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0A4A3A] py-3 text-sm font-semibold text-white transition hover:bg-[#BA7517] hover:border-[#BA7517] hover:text-white">
              <span className="material-symbols-outlined mr-2 align-middle">logout</span>
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 h-16 bg-surface/65 backdrop-blur-md border-b border-white/10 flex items-center px-4 md:px-8 lg:px-14 gap-4 md:gap-6">
            <div className="relative w-full max-w-md group">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
              <input
                className="w-full bg-black/30 border border-white/10 rounded-full py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                placeholder="Buscar órdenes, facturas..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4 md:gap-6 ml-auto">
              <button className="relative text-on-surface-variant hover:text-primary transition-colors" aria-label="Notifications">
                <Icon name="notifications" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </button>
              <button className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Help">
                <Icon name="help_outline" />
              </button>
              <div className="h-6 w-px bg-white/10" />
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-right">
                  <p className="font-label-sm text-label-sm text-on-surface">Comprador</p>
                  <p className="font-label-sm text-[10px] text-primary/70 uppercase">Operaciones de compra</p>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 bg-surface flex items-center justify-center text-primary font-bold">C</div>
              </div>
            </div>
          </header>

            <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-14 py-6 md:py-8">

            {active === "dashboard" && (
              <section className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Buyer console</p>
                  <h1 className="mt-2 text-4xl font-bold text-on-surface">
                    Buyer <span className="text-primary">Dashboard</span>
                  </h1>
                  <p className="mt-2 text-sm text-on-surface-variant">Vista general de tu actividad de compras en tiempo real.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Gasto Total", value: orderStats.gastoMensual > 0 ? `Bs ${orderStats.gastoMensual}` : "Bs 0.00", note: "+0% este mes", icon: "payments", tone: "text-primary", accent: true },
                    { label: "Ordenes Activas", value: orderStats.ordenesTotales.toString(), note: `${orderStats.pendientes} pendientes`, icon: "receipt_long", tone: "text-on-surface", accent: false },
                    { label: "Facturas Pendientes", value: dbInvoices.length.toString(), note: `Bs ${invoiceStats.faltaPago} por pagar`, icon: "receipt", tone: "text-secondary", accent: false },
                    { label: "Proveedores Activos", value: suppliersList.length.toString(), note: "Todos verificados", icon: "groups", tone: "text-tertiary", accent: false },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`rounded-xl border p-5 ${kpi.accent ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface-container-low"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{kpi.label}</p>
                        <Icon name={kpi.icon} className={`text-base ${kpi.tone}`} />
                      </div>
                      <p className={`text-3xl font-bold ${kpi.accent ? "text-primary" : "text-on-surface"}`}>{kpi.value}</p>
                      <p className="mt-1.5 text-[11px] font-semibold text-on-surface-variant">{kpi.note}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                  <div className="rounded-xl border border-white/10 bg-surface-container-low overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <h3 className="font-bold text-on-surface text-sm">Ordenes Recientes</h3>
                      <button onClick={() => setActive("orders")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                        Ver todas <Icon name="arrow_forward" className="text-xs" />
                      </button>
                    </div>
                    <table className="w-full text-left">
                      <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-white/5">
                        <tr>
                          <th className="px-5 py-3">Proveedor</th>
                          <th className="px-5 py-3">Monto</th>
                          <th className="px-5 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {ordersList.slice(0, 5).map((row) => {
                          const displayStatus = row.status.toUpperCase();
                          const isPaidOrComplete = displayStatus === "COMPLETADA" || displayStatus === "ENTREGADO";
                          const tone = isPaidOrComplete ? "text-tertiary" : displayStatus === "RECHAZADA" ? "text-error" : "text-primary";
                          const dot = isPaidOrComplete ? "bg-tertiary" : displayStatus === "RECHAZADA" ? "bg-error" : "bg-primary";
                          return (
                            <tr key={row.id || row.supplier}>
                              <td className="px-5 py-3 font-bold text-on-surface text-xs">{row.supplier}</td>
                              <td className="px-5 py-3 font-bold text-primary text-xs">{row.amount}</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${tone}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                  {displayStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-white/10 bg-surface-container-low p-5 flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-on-surface text-sm">Facturas</h3>
                        <button onClick={() => setActive("invoices")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                          Ver <Icon name="arrow_forward" className="text-xs" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Por pagar", value: "Bs 12.450", tone: "text-primary" },
                          { label: "Pagadas hoy", value: "Bs 4.800", tone: "text-tertiary" },
                          { label: "Vencidas", value: "Bs 1.100", tone: "text-error" },
                          { label: "Tiempo medio", value: "4.2 dias", tone: "text-secondary" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg bg-surface p-3">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">{s.label}</p>
                            <p className={`mt-1 text-sm font-bold ${s.tone}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-surface-container-low p-5 flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-on-surface text-sm">Contratos</h3>
                        <button onClick={() => setActive("contracts")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                          Ver <Icon name="arrow_forward" className="text-xs" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: "Global Logistics Corp", status: "Activo", discount: "12.5%", dot: "bg-tertiary", tone: "text-tertiary" },
                          { name: "NexGen Tech Supplies", status: "Activo", discount: "5.0%", dot: "bg-tertiary", tone: "text-tertiary" },
                          { name: "EcoPrime Energy", status: "Pend. Firma", discount: "15.2%", dot: "bg-secondary", tone: "text-secondary" },
                          { name: "Shield Solutions S.A.", status: "Expirado", discount: "10.0%", dot: "bg-error", tone: "text-error" },
                        ].map((c) => (
                          <div key={c.name} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                            <p className="text-xs font-bold text-on-surface truncate max-w-[120px]">{c.name}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-primary">{c.discount}</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${c.tone}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                                {c.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
                  <div className="rounded-xl border border-white/10 bg-surface-container-low p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-on-surface text-sm">Proveedores Destacados</h3>
                      <button onClick={() => setActive("suppliers")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                        Ver todos <Icon name="arrow_forward" className="text-xs" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { initials: "CF", name: "CyberFlow Systems", tags: ["SaaS"], metric: 98, icon: "memory", online: true },
                        { initials: "AE", name: "Aether Energy", tags: ["Renewable"], metric: 99, icon: "bolt", online: false },
                        { initials: "ZM", name: "Zenith Mfg.", tags: ["Industrial"], metric: 92, icon: "factory", online: true },
                        { initials: "NV", name: "Nova Systems Corp", tags: ["Cloud"], metric: 96, icon: "cloud", online: true },
                      ].map((s) => (
                        <div key={s.name} className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                              <Icon name={s.icon} className="text-primary text-base" />
                            </div>
                            {s.online && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-tertiary border-2 border-surface-container-low" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-on-surface truncate">{s.name}</p>
                              <span className="text-[10px] font-bold text-primary ml-2 shrink-0">{s.metric}%</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/10">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${s.metric}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === "orders" && (
              <section className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-display text-4xl font-bold text-on-surface">Mis ordenes</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
                      Gestione y rastree sus ordenes de compra en tiempo real a traves de nuestra red de suministros orquestada.
                    </p>
                  </div>
                  <button onClick={() => setShowCreateOrder(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold text-on-primary transition hover:brightness-110">
                    <Icon name="add" className="text-base" />
                    Nueva Orden
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Ordenes Totales", value: orderStats.ordenesTotales.toString(), note: "", icon: "receipt_long", tone: "text-on-surface" },
                    { label: "Pendientes", value: orderStats.pendientes.toString(), note: "", icon: "pending_actions", tone: "text-secondary" },
                    { label: "Gasto Mensual", value: `Bs ${orderStats.gastoMensual}`, note: "Este mes", icon: "payments", tone: "text-primary" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-white/10 bg-surface-container-low p-5">
                      <p className="text-xs font-bold text-on-surface-variant">{stat.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className={`text-3xl font-bold ${stat.tone}`}>{stat.value}</p>
                        <div className="flex items-center gap-2">
                          {stat.note && <span className="text-xs font-bold text-tertiary">{stat.note}</span>}
                          <Icon name={stat.icon} className={`text-base ${stat.tone === "text-on-surface" ? "text-primary" : stat.tone}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-surface-container-low p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_1.8fr_auto_auto] lg:items-end">
                    <label className="space-y-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Estado</span>
                      <select className="w-full rounded-lg border border-white/10 bg-surface px-3 py-3 text-xs font-bold text-on-surface-variant outline-none transition focus:border-primary">
                        <option>Todos los estados</option>
                        <option>Enviado</option>
                        <option>Pendiente</option>
                        <option>Entregado</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Rango de fecha</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className="rounded-lg border border-white/10 bg-surface px-3 py-3 text-xs font-bold text-on-surface-variant outline-none transition focus:border-primary" type="date" />
                        <input className="rounded-lg border border-white/10 bg-surface px-3 py-3 text-xs font-bold text-on-surface-variant outline-none transition focus:border-primary" type="date" />
                      </div>
                    </label>
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface px-5 py-3 text-xs font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary">
                      <Icon name="filter_list" className="text-base" />
                      Filtros Avanzados
                    </button>
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface px-5 py-3 text-xs font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-primary">
                      <Icon name="download" className="text-base" />
                      Exportar CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-container-low">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left">
                      <thead className="bg-surface-container-high text-xs uppercase tracking-wide text-on-surface-variant">
                        <tr>
                          <th className="px-6 py-5 font-bold">Order ID</th>
                          <th className="px-6 py-5 font-bold">Proveedor</th>
                          <th className="px-6 py-5 font-bold">Fecha</th>
                          <th className="px-6 py-5 font-bold">Monto</th>
                          <th className="px-6 py-5 font-bold">Estado</th>
                          <th className="px-6 py-5 text-right font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {ordersList.map((order) => {
                          const statusTone = order.status === "Entregado" ? "text-tertiary" : order.status === "Pendiente" ? "text-secondary" : "text-primary";
                          return (
                            <tr key={order.id} className="text-sm text-on-surface">
                              <td className={`px-6 py-5 font-bold ${statusTone}`}>{order.id}</td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-xs font-bold text-on-surface-variant">
                                    {order.initials}
                                  </div>
                                  <p className="max-w-[150px] font-bold leading-5">{order.supplier}</p>
                                </div>
                              </td>
                              <td className="px-6 py-5 font-bold text-on-surface-variant">{order.date}</td>
                              <td className="px-6 py-5 font-bold">{order.amount}</td>
                              <td className="px-6 py-5">
                                <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${statusTone}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusTone.replace("text-", "bg-")}`} />
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface hover:text-primary" aria-label={`Ver ${order.id}`}>
                                  <Icon name="visibility" className="text-base" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-4 border-t border-white/5 bg-surface-container-high px-6 py-4 text-xs font-semibold text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
                    <p>Mostrando 1-4 de 1,284 ordenes</p>
                    <div className="flex items-center gap-2">
                      {["chevron_left", "1", "2", "3", "...", "32", "chevron_right"].map((item) => (
                        <button
                          key={item}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 ${item === "1" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-primary"}`}
                        >
                          {item.startsWith("chevron") ? <Icon name={item} className="text-base" /> : item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === "invoices" && (
  <section className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-display text-4xl font-bold text-on-surface">Facturas</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
          Consulta tus facturas pendientes, pagadas o anuladas. Gestiona el flujo de caja con precision quirurgica.
        </p>
      </div>
      <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface-container-high px-5 py-3 text-xs font-bold uppercase tracking-wide text-on-surface transition hover:border-primary/40 hover:text-primary">
        <Icon name="sync" className="text-base text-primary" />
        Actualizar
      </button>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Falta Pagar", value: `Bs ${invoiceStats.faltaPago}`, note: "Pendiente de pago", icon: "pending", tone: "text-secondary" },
        { label: "Pagado Hoy", value: `Bs ${invoiceStats.pagadoHoy}`, note: "Hoy", icon: "check_circle", tone: "text-tertiary" },
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl border border-white/10 bg-surface-container-low p-5">
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-wide ${stat.tone}`}>{stat.label}</p>
            <Icon name={stat.icon} className={`text-base ${stat.tone}`} />
          </div>
          <p className="mt-5 text-3xl font-bold text-on-surface">{stat.value}</p>
          <p className={`mt-2 text-xs font-semibold ${stat.tone}`}>{stat.note}</p>
        </div>
      ))}
    </div>

    <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-container-low">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="border-b border-white/5 text-xs uppercase tracking-wide text-primary/70">
            <tr>
              <th className="px-6 py-5 font-bold">ID</th>
              <th className="px-6 py-5 font-bold">Fecha</th>
              <th className="px-6 py-5 font-bold">Proveedor</th>
              <th className="px-6 py-5 font-bold">Empresa Compradora</th>
              <th className="px-6 py-5 font-bold">Total</th>
              <th className="px-6 py-5 font-bold">Estado</th>
              <th className="px-6 py-5 text-right font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoicesList.map((invoice) => {
              const isPaid = invoice.status === "Pagada";
              return (
                <tr key={invoice.id} className="text-sm text-on-surface">
                  <td className="max-w-[150px] px-6 py-6 text-xs font-semibold leading-6 text-on-surface-variant">
                    <span className="line-clamp-3 break-all">{invoice.id}</span>
                  </td>
                  <td className="px-6 py-6 font-bold">{invoice.date}</td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
                        {invoice.initials}
                      </div>
                      <p className="max-w-[130px] font-bold leading-5">{invoice.supplier}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6 max-w-[160px] font-semibold leading-6 text-on-surface-variant">{invoice.buyer}</td>
                  <td className="px-6 py-6 font-bold">{invoice.total}</td>
                  <td className="px-6 py-6">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        isPaid ? "bg-tertiary/15 text-tertiary" : "bg-primary/15 text-primary"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-tertiary" : "bg-primary"}`} />
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <button
                      className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                        isPaid
                          ? "cursor-not-allowed bg-surface-container-high text-on-surface-variant/40"
                          : "bg-primary text-on-primary hover:brightness-110"
                      }`}
                      disabled={isPaid}
                      onClick={() => {
                        // Buscamos la referencia original del objeto de base de datos dbInvoices
                        const originalInvoice = dbInvoices.find(i => i.id === invoice.id);
                        // Extraemos el id de la orden asociada (idOrden.id) o el id de la factura como fallback
                        const orderId = originalInvoice?.idOrden?.id || originalInvoice?.id || invoice.id;
                        setSelectedOrderIdForPay(orderId);
                      }}
                    >
                      Pagar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4 border-t border-white/5 px-6 py-4 text-xs font-semibold text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
        <p>Mostrando 1 - 4 de 42 facturas</p>
        <div className="flex items-center gap-2">
          {["chevron_left", "1", "2", "3", "chevron_right"].map((item) => (
            <button
              key={item}
              className={`flex h-8 min-w-8 items-center justify-center rounded-md border border-white/5 px-2 ${
                item === "1" ? "bg-primary text-on-primary" : "bg-surface text-on-surface-variant hover:text-primary"
              }`}
            >
              {item.startsWith("chevron") ? <Icon name={item} className="text-base" /> : item}
            </button>
          ))}
        </div>
      </div>
    </div>
  </section>
)}
            {active === "contracts" && (
              <section className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-display text-4xl font-bold text-on-surface">Contratos Vigentes</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
                      Administre sus acuerdos B2B activos, supervise tasas de descuento y revise términos contractuales con su red global de proveedores en tiempo real.
                    </p>
                  </div>
                  {/* Botón interactivo conectado con el estado para abrir el modal */}
                  <button 
                    onClick={() => setIsContractModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold text-on-primary transition hover:brightness-110"
                  >
                    <Icon name="add" className="text-base" />
                    Nuevo Contrato
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {contractStatsList.map((stat) => {
                    const isUrgent = stat.note === "Urgente";
                    return (
                      <div
                        key={stat.label}
                        className={`rounded-xl border p-5 ${
                          isUrgent
                            ? "border-error/30 bg-error/5"
                            : "border-white/10 bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant leading-4">{stat.label}</p>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isUrgent && (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-error">Urgente</span>
                            )}
                            {!isUrgent && stat.note && (
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${stat.tone}`}>{stat.note}</span>
                            )}
                            <Icon name={stat.icon} className={`text-base ${isUrgent ? "text-error" : stat.tone}`} />
                          </div>
                        </div>
                        <p className={`mt-4 text-3xl font-bold ${isUrgent ? "text-error" : "text-on-surface"}`}>{stat.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-container-low">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="border-b border-white/5 text-xs uppercase tracking-wide text-on-surface-variant">
                        <tr>
                          <th className="px-6 py-5 font-bold">Proveedor</th>
                          <th className="px-6 py-5 font-bold">ID de Contrato</th>
                          <th className="px-6 py-5 font-bold">Periodo de Validez</th>
                          <th className="px-6 py-5 font-bold">Tasa de Descuento</th>
                          <th className="px-6 py-5 font-bold">Estado</th>
                          <th className="px-6 py-5 text-right font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {contractsList.map((contract) => {
                          const isActive = contract.status === "Activo";
                          const isPending = contract.status === "Pendiente Firma";
                          const isExpired = contract.status === "Expirado";

                          const statusClasses = isActive
                            ? "bg-tertiary/10 text-tertiary"
                            : isPending
                            ? "bg-secondary/10 text-secondary"
                            : "bg-error/10 text-error";

                          const dotClasses = isActive
                            ? "bg-tertiary"
                            : isPending
                            ? "bg-secondary"
                            : "bg-error";

                          return (
                            <tr key={contract.id} className="text-sm text-on-surface">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                                    {contract.initials}
                                  </div>
                                  <div>
                                    <p className="font-bold leading-5">{contract.supplier}</p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">{contract.category}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-5">
                                <span className="text-xs font-bold text-primary">{contract.id}</span>
                              </td>

                              <td className="px-6 py-5">
                                <p className="text-sm font-semibold text-on-surface leading-5">{contract.period}</p>
                                {contract.periods && (
                                  <div className="flex gap-1 mt-1.5">
                                    {contract.periods.map((p) => (
                                      <span key={p} className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {contract.alert && (
                                  <p className="text-[11px] font-bold text-secondary mt-1">{contract.alert}</p>
                                )}
                                {contract.note && (
                                  <p className="text-[11px] font-semibold text-on-surface-variant mt-1">{contract.note}</p>
                                )}
                              </td>

                              <td className="px-6 py-5">
                                <span className="text-lg font-bold text-on-surface">{contract.discount}</span>
                              </td>

                              <td className="px-6 py-5">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
                                  {contract.status}
                                </span>
                              </td>

                              <td className="px-6 py-5 text-right">
                                {isExpired ? (
                                  <button className="rounded-lg border border-white/10 bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant transition hover:border-primary/40 hover:text-primary">
                                    Renovar
                                  </button>
                                ) : (
                                  <button className="rounded-lg border border-white/10 bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wide text-on-surface transition hover:border-primary/40 hover:text-primary">
                                    Ver Detalles
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-white/5 px-6 py-4 text-xs font-semibold text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
                    <p>Mostrando 1 a 4 de 42 contratos</p>
                    <div className="flex items-center gap-2">
                      {["chevron_left", "1", "2", "3", "chevron_right"].map((item) => (
                        <button
                          key={item}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-md border border-white/5 px-2 ${
                            item === "1" ? "bg-primary text-on-primary" : "bg-surface text-on-surface-variant hover:text-primary"
                          }`}
                        >
                          {item.startsWith("chevron") ? <Icon name={item} className="text-base" /> : item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === "suppliers" && (
              <section className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-display text-4xl font-bold text-on-surface">Directorio de Proveedores</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
                      Descubre y gestiona socios estrategicos en nuestra red global de alta fidelidad. Utiliza filtros avanzados para encontrar proveedores certificados por capacidad tecnica y cumplimiento normativo.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-surface-container-low px-5 py-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                    <Icon name="filter_list" className="text-sm" />
                    Filtrar por:
                  </div>
                  <select className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs font-bold text-on-surface outline-none transition focus:border-primary">
                    <option>Todas las Categorias</option>
                    <option>Electronica</option>
                    <option>Logistica</option>
                    <option>Industrial</option>
                    <option>Energy</option>
                    <option>Cloud</option>
                  </select>
                  <select className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs font-bold text-on-surface outline-none transition focus:border-primary">
                    <option>Estado: Todos</option>
                    <option>En linea</option>
                    <option>Fuera de linea</option>
                  </select>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                      <Icon name="grid_view" className="text-sm" />
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-surface text-on-surface-variant hover:text-primary transition">
                      <Icon name="view_list" className="text-sm" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {suppliersList.map((s) => {
                    const scoreColor = s.score >= 95 ? "text-tertiary" : s.score >= 80 ? "text-primary" : "text-secondary";
                    const barColor = s.score >= 95 ? "bg-tertiary" : s.score >= 80 ? "bg-primary" : "bg-secondary";
                    return (
                      <div key={s.id} className="flex flex-col rounded-xl border border-white/10 bg-surface-container-low p-5 transition hover:border-primary/30">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="relative shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                              <Icon name={s.icon} className="text-primary text-xl" />
                            </div>
                            {s.online && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-tertiary border-2 border-surface-container-low" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface leading-tight">{s.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {s.tags.map((tag) => (
                                <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-on-surface-variant">{s.metric}</span>
                            <span className={`text-xs font-bold ${scoreColor}`}>{s.score}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${s.score}%` }} />
                          </div>
                        </div>

                        <div className="mt-auto">
                          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-2.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-on-primary">
                            <Icon name="menu_book" className="text-sm" />
                            Catalog
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-surface-container-low/50 p-8 text-center transition hover:border-primary/40">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 mb-4">
                      <Icon name="add" className="text-on-surface-variant text-xl" />
                    </div>
                    <p className="font-bold text-on-surface text-sm mb-1">Registrar Nuevo Proveedor</p>
                    <p className="text-xs text-on-surface-variant leading-5">Agrega un nuevo socio estrategico para iniciar el proceso de verificación.</p>
                  </div>
                </div>
              </section>
            )}

            {active === "account" && (
              <section className="space-y-6">
                {/* Header */}
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400/20 to-primary/20 border border-white/10">
                      <span className="material-symbols-outlined text-4xl text-cyan-400 font-bold">account_circle</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Perfil de usuario</p>
                      <h1 className="mt-1 text-3xl font-semibold text-on-surface">{user?.nombre || "—"}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <Icon name="verified_user" className="text-sm" />
                          {user?.role || "Comprador"}
                        </span>
                        {user?.activo !== undefined && (
                          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            user.activo ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {user.activo ? "Cuenta activa" : "Cuenta inactiva"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: "mail", label: "Correo electrónico", value: user?.email || userEmail },
                    { icon: "business", label: "Empresa", value: user?.nombreEmpresa || "Empresa B2B SA" },
                    { icon: "badge", label: "Rol asignado", value: user?.role || "COMPRADOR" },
                    { icon: "fingerprint", label: "ID de usuario", value: user?.id ? user.id.toString().slice(0, 8) + "…" : "—" },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-surface-container-low p-5 flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <span className="material-symbols-outlined text-lg text-on-surface-variant">{icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-on-surface truncate" title={value ?? "—"}>
                          {value || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2FA Section */}
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
                        <span className="material-symbols-outlined text-xl text-amber-400">security</span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-on-surface">Autenticación en 2 pasos</h3>
                        <p className="text-xs text-on-surface-variant">Protege tu cuenta con TOTP (Google Authenticator, Authy, etc.)</p>
                      </div>
                    </div>
                    {totpVerified && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Activado
                      </span>
                    )}
                  </div>

                  {!totpQr && !totpVerified && (
                    <button
                      onClick={handle2FASetup}
                      disabled={totpLoading}
                      className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 px-5 py-3 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {totpLoading ? "hourglass_empty" : "qr_code_2"}
                      </span>
                      {totpLoading ? "Generando código QR…" : "Activar autenticación en 2 pasos"}
                    </button>
                  )}

                  {totpQr && (
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                      {/* QR */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white p-3">
                          <img
                            src={totpQr}
                            alt="QR Code 2FA"
                            className="h-44 w-44 object-contain"
                          />
                        </div>
                        <p className="text-xs text-on-surface-variant text-center max-w-[180px]">
                          Escanea con tu app de autenticación
                        </p>
                      </div>

                      {/* Verificación */}
                      <div className="flex-1 space-y-4">
                        <div className="rounded-2xl border border-white/5 bg-surface-container-high/30 p-4 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Pasos</p>
                          {["Abre Google Authenticator, Authy u otra app TOTP.", "Escanea el código QR de la izquierda.", "Ingresa el código de 6 dígitos generado."].map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-on-surface mt-0.5">
                                {i + 1}
                              </span>
                              {step}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
                            Código de verificación
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={totpCode}
                            onChange={(e) => {
                              setTotpError(null);
                              setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                            }}
                            className="w-full rounded-xl bg-white px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] text-neutral-900 placeholder:text-neutral-300 focus:outline-none"
                          />
                          {totpError && (
                            <p className="text-xs text-red-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">error</span>
                              {totpError}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleVerify2FA}
                            disabled={totpVerifying || totpCode.length !== 6}
                            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 transition hover:bg-cyan-300 disabled:opacity-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {totpVerifying ? "hourglass_empty" : "verified"}
                            </span>
                            {totpVerifying ? "Verificando…" : "Verificar y activar"}
                          </button>
                          <button
                            onClick={() => { setTotpQr(null); setTotpCode(""); setTotpError(null); }}
                            className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-on-surface-variant transition hover:text-on-surface cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {totpVerified && (
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                      <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                      <p className="text-sm text-emerald-400">La autenticación en 2 pasos está activa en tu cuenta.</p>
                    </div>
                  )}
                </div>

                {/* B2B Supplier Conversion Section */}
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <span className="material-symbols-outlined text-xl text-primary font-bold">store</span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-on-surface">Habilitar canal de venta</h3>
                        <p className="text-xs text-on-surface-variant">Convierte tu empresa en proveedora para publicar productos y firmar contratos.</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBecomeSupplierModal(true)}
                    className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 cursor-pointer"
                  >
                    <Icon name="local_mall" className="text-lg" />
                    Convertirse en Proveedor
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* RENDERIZADO DEL MODAL IMPORTADO */}
      {isContractModalOpen && (
        <CreateContractModal
          onClose={() => setIsContractModalOpen(false)}
          onSuccess={() => {
            setIsContractModalOpen(false);
            if (companyId) {
              api.get(`/api/v1/contratos-detalle?idEmpresa=${companyId}&page=0&size=10`)
                .then((res) => { if (res?.content) setDbContracts(res.content); })
                .catch(console.error);
            }
          }}
        />
      )}
      <CreateOrderModal
        open={showCreateOrder}
        onClose={() => setShowCreateOrder(false)}
        onCreated={() => { setShowCreateOrder(false); /* refetch orders */ }}
        />
      {showBecomeSupplierModal && (
        <BecomeSupplierModal
          onClose={() => setShowBecomeSupplierModal(false)}
          onSuccess={() => {
            setShowBecomeSupplierModal(false);
          }}
          user={user}
        />
      )}
      {/* <StereumPayModal
        isOpen={selectedOrderIdForPay !== null}
        onClose={() => setSelectedOrderIdForPay(null)}
        orderId={selectedOrderIdForPay || ""}
      /> */}
    </div>
  );
}

function BecomeSupplierModal({ onClose, onSuccess, user }: { onClose: () => void; onSuccess: () => void; user: any }) {
  const [loading, setLoading] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState(user?.nombreEmpresa || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEmpresa) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        nombreEmpresa: nombreEmpresa,
        activo: true,
        idEmpresa: user?.id_empresa ? { id: user.id_empresa } : null
      };
      await api.post("/api/v1/proveedores", payload);
      toast.success("Registro de proveedor completado con éxito.");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al registrar como proveedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F6E56] p-6 text-white shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Registrar Proveedor
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Convertirse en Proveedor
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-white/70 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-white/80 leading-relaxed">
            Al convertir tu empresa en proveedora, podrás publicar productos, gestionar almacenes de stock, definir reglas de comisión y firmar contratos de tarifas B2B con otras empresas de la red.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70 block">
              Nombre de la Empresa Proveedora
            </label>
            <input
              type="text"
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              placeholder="Nombre comercial de proveedor"
              className="w-full rounded-xl bg-white px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#BA7517]"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#BA7517] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">
                {loading ? "hourglass_empty" : "store"}
              </span>
              {loading ? "Registrando…" : "Confirmar registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}