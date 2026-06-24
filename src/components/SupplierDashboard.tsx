import { useState, useEffect, type MouseEventHandler } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { CreateProductModal } from "./CreateProductModal";
import { BulkUploadProductsModal } from "./BulkUploadProductsModal";
import { CreateWarehouseModal } from "./CreateWarehouseModal";
import { CreateContractModal } from "./CreateContractModal";
import { AddProductToWarehouseModal } from "./AddProductToWarehouseModal";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { toast } from "sonner";


type NavItem = { key: string; label: string; icon: string };
const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "orders", label: "Mis órdenes", icon: "receipt_long" },
  { key: "stock", label: "Stock", icon: "inventory_2" },
  { key: "contracts", label: "Contratos", icon: "description" },
  { key: "products", label: "Productos", icon: "shopping_bag" },
  { key: "rules", label: "Reglas de Comisión", icon: "rule" },
//   { key: "pricing", label: "Precios", icon: "payments" },
  { key: "account", label: "Mi cuenta", icon: "account_circle" },
];

function NavIcon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

export function SupplierDashboard({ userEmail, onSignOut }: { userEmail: string; onSignOut: MouseEventHandler<HTMLButtonElement> }) {
  const { user } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [showAddProductToWarehouse, setShowAddProductToWarehouse] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const [loading, setLoading] = useState(false);

  // States for updating account profile
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nombre: "",
    email: "",
    password: "",
    activo: true,
    idEmpresa: "",
    idSucursal: "",
    idRol: ""
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [skuCount, setSkuCount] = useState(0);

  const startEditing = async () => {
    try {
      if (!user?.id) return;
      const params = new URLSearchParams({ uId: user.id }).toString();
      const rawUser = await api.get(`/api/v1/usuarios/user-info?${params}`);
      if (rawUser) {
        setProfileForm({
          nombre: rawUser.nombre || "",
          email: rawUser.email || "",
          password: "",
          activo: rawUser.activo ?? true,
          idEmpresa: rawUser.idEmpresa?.id || null,
          idSucursal: rawUser.idSucursal?.id || null,
          idRol: rawUser.idRol?.id || null
        });
        setEditing(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la información detallada del usuario.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setUpdatingProfile(true);
    try {
      const payload: any = {
        nombre: profileForm.nombre,
        email: profileForm.email,
        activo: profileForm.activo,
        idEmpresa: profileForm.idEmpresa,
        idSucursal: profileForm.idSucursal,
        idRol: profileForm.idRol
      };
      if (profileForm.password) {
        payload.password = profileForm.password;
      }
      
      await api.put(`/api/v1/usuarios/${user.id}`, payload);
      toast.success("¡Perfil actualizado con éxito! Recargando sesión...");
      setEditing(false);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al actualizar la información del perfil.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // API states
  const [stats, setStats] = useState({ activeOrders: 0, availableStock: 0, openContracts: 0 });
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [dbStock, setDbStock] = useState<any[]>([]);
  const [dbContracts, setDbContracts] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showCreateContract, setShowCreateContract] = useState(false);


  const [totpQr, setTotpQr] = useState<string | null>(null);
const [totpCode, setTotpCode] = useState("");
const [totpLoading, setTotpLoading] = useState(false);
const [totpVerifying, setTotpVerifying] = useState(false);
const [totpVerified, setTotpVerified] = useState(false);
const [totpError, setTotpError] = useState<string | null>(null);

  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersSize] = useState(10);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotalElements, setOrdersTotalElements] = useState(0);
  // Parámetros de paginación para contratos
  const [contractsPage, setContractsPage] = useState(0);
  const [contractsSize, setContractsSize] = useState(10);
  const [productsPage, setProductsPage] = useState(0);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [productsTotalElements, setProductsTotalElements] = useState(0);

  const [dbPricing, setDbPricing] = useState<any[]>([]);
  const [pricingPage, setPricingPage] = useState(0);
  const [pricingSize] = useState(10);
  const [pricingTotalPages, setPricingTotalPages] = useState(1);
  const [pricingTotalElements, setPricingTotalElements] = useState(0);

  // States for commission rules (Reglas de Comisión)
  const [dbRules, setDbRules] = useState<any[]>([]);
  const [rulesPage, setRulesPage] = useState(0);
  const [rulesSize] = useState(5);
  const [rulesTotalPages, setRulesTotalPages] = useState(1);
  const [rulesTotalElements, setRulesTotalElements] = useState(0);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ nombre: "", descripcion: "" });
  const [ruleTramos, setRuleTramos] = useState<any[]>([
    { tipo: "Volumen", cantidadMinima: "", cantidadMaxima: "", descuento: "" }
  ]);
  const [savingRule, setSavingRule] = useState(false);

  const providerId = user?.idProveedor || "";
  const idEmpresa = user?.id_empresa;

  useEffect(() => {
    async function fetchSupplierData() {
      setLoading(true);
      try {
        if (active === "dashboard") {
          try {
            const data = await api.get(`/api/v1/ordenes-compra/stats?idEmpresa=${idEmpresa}`);
            if (data) setStats({ activeOrders: data.activeOrders ?? 0, availableStock: data.availableStock ?? 0, openContracts: data.openContracts ?? 0 });
          } catch (e) { console.error(e); }
        }

        if (active === "dashboard" || active === "orders") {
          try {
            const res = await api.get(
              `/api/v1/ordenes-compra/supplier?idEmpresa=${idEmpresa}&page=${ordersPage}&size=${ordersSize}`
            );
            if (res) {
              setDbOrders(Array.isArray(res) ? res : res.content || []);
              setOrdersTotalPages(res.totalPages ?? 1);
              setOrdersTotalElements(res.totalElements ?? 0);
            }
          } catch (e) { console.error(e); }
        }

        if (active === "stock") {
          try {
            const res = await api.get(`/api/v1/almacenes/mostrar?idEmpresa=${idEmpresa}`);
            if (res) setDbStock(res);

            // Cargar el conteo de SKUs/productos del proveedor
            const prodRes = await api.get(`/api/v1/products/all?idEmpresa=${idEmpresa}&page=0&size=1`);
            if (prodRes && prodRes.totalElements !== undefined) {
              setSkuCount(prodRes.totalElements);
            } else if (Array.isArray(prodRes)) {
              setSkuCount(prodRes.length);
            }
          } catch (e) { console.error(e); }
        }

        if (active === "contracts") {
          try {
            if (idEmpresa) {
              const res = await api.get(`/api/v1/contratos-detalle?idEmpresa=${idEmpresa}&page=${contractsPage}&size=${contractsSize}`);
              if (res) setDbContracts(Array.isArray(res) ? res : res.content || []);
            }
          } catch (e) { console.error(e); }
        }

        if (active === "products") {
          console.log("INTO PRODUCTOS API CALL");
          try {
            // CORREGIDO: Ahora usa la variable dinámica productsPage en lugar de page=0
            const res = await api.get(`/api/v1/products/all?idEmpresa=${idEmpresa}&page=${productsPage}&size=10`);
            console.log(res);
            if (res) {
              setDbProducts(Array.isArray(res) ? res : res.content || []);
              setProductsTotalPages(res.totalPages ?? 1);
              setProductsTotalElements(res.totalElements ?? 0);
            }
          } catch (e) { 
            console.error("Error cargando productos desde la API", e); 
          }
        }
        if (active === "rules") {
          try {
            const res = await api.get(`/api/v1/tarifas-reglas?page=${rulesPage}&size=${rulesSize}`);
            if (res) {
              setDbRules(Array.isArray(res) ? res : res.content || []);
              setRulesTotalPages(res.totalPages ?? 1);
              setRulesTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
            }
          } catch (e) { console.error("Error loading rules", e); }
        }
      } catch (err) {
        console.error("Error loading supplier dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSupplierData();
  }, [active, providerId, idEmpresa, contractsPage, contractsSize, ordersPage, pricingPage, productsPage, rulesPage, rulesSize]); 

  const handleAddTramo = () => {
    setRuleTramos([...ruleTramos, { tipo: "Volumen", cantidadMinima: "", cantidadMaxima: "", descuento: "" }]);
  };

  const handle2FASetup = async () => {
  if (!user?.id) return;
  setTotpLoading(true);
  setTotpError(null);
  try {
    const res = await api.get(`/api/v1/usuarios/auth-code/${user.id}`);
    console.log("2FA response:", res);
    console.log("type:", typeof res);
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

  const handleRemoveTramo = (idx: number) => {
    if (ruleTramos.length <= 1) {
      toast.error("Debe tener al menos un tramo.");
      return;
    }
    setRuleTramos(ruleTramos.filter((_, i) => i !== idx));
  };

  const handleTramoChange = (idx: number, key: string, val: string) => {
    setRuleTramos(ruleTramos.map((t, i) => i === idx ? { ...t, [key]: val } : t));
  };

  const handleSaveRule = async () => {
    if (!ruleForm.nombre) {
      toast.error("El nombre de la regla es obligatorio.");
      return;
    }
    setSavingRule(true);
    try {
      const payload = {
        nombre: ruleForm.nombre,
        descripcion: ruleForm.descripcion,
        idEmpresa: idEmpresa,
        activo: true,
        tramos: ruleTramos.map(t => ({
          tipo: t.tipo,
          minimo: parseFloat(t.cantidadMinima) || 0,
          maximo: t.cantidadMaxima ? parseFloat(t.cantidadMaxima) : null,
          porcentaje: parseFloat(t.descuento) || 0
        }))
      };
      await api.post("/api/v1/tarifas-reglas", payload);
      toast.success("Regla creada exitosamente.");
      setRuleForm({ nombre: "", descripcion: "" });
      setRuleTramos([{ tipo: "Volumen", cantidadMinima: "", cantidadMaxima: "", descuento: "" }]);
      setShowCreateRule(false);
      
      // Reload rules list
      const res = await api.get(`/api/v1/tarifas-reglas?page=0&size=${rulesSize}`);
      if (res) {
        setDbRules(Array.isArray(res) ? res : res.content || []);
        setRulesTotalPages(res.totalPages ?? 1);
        setRulesTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
        setRulesPage(0);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al crear la regla.");
    } finally {
      setSavingRule(false);
    }
  };

  const handleUpdateOrderStatus = async (order: any, newStatus: string) => {
    try {
      const payload = {
        id: order.id,
        idEstado: newStatus
      };
      await api.post("/api/v1/ordenes-compra/update-status", payload);
      toast.success(`Orden marcada como ${newStatus === "aprobado" ? "aprobada" : "rechazada"} exitosamente.`);
      
      // Reload orders list
      const res = await api.get(
        `/api/v1/ordenes-compra/supplier?idEmpresa=${idEmpresa}&page=${ordersPage}&size=${ordersSize}`
      );
      if (res) {
        setDbOrders(Array.isArray(res) ? res : res.content || []);
        setOrdersTotalPages(res.totalPages ?? 1);
        setOrdersTotalElements(res.totalElements ?? 0);
      }
    } catch (e: any) {
      console.error("Error updating order status", e);
      toast.error(e.message || "Error al actualizar la orden.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-[#0A4A3A]/20 bg-[#0F6E56] p-5 text-white flex flex-col justify-between">
          <div>
            <div className="mb-8 flex flex-col items-center gap-2 rounded-3xl bg-white p-4">
              <img src="/logo.png" alt="Logo" className="max-h-12 max-w-full object-contain" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#0F6E56] font-bold">Supplier Portal</span>
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
                  <NavIcon name={item.icon} />
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

        <main className="p-6 lg:p-10">
          <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-surface-container-high p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Supplier Command Center</p>
              <h1 className="mt-3 text-3xl font-semibold text-on-surface">Bienvenido de nuevo</h1>
            </div>
            <div className="rounded-3xl bg-surface p-4 text-sm text-on-surface-variant">Rol actual: <span className="font-semibold text-primary">Proveedor</span></div>
          </div>

          {active === "dashboard" && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-5 flex flex-col justify-between min-h-[130px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Stock Disponible</p>
                    <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <p className="text-2xl font-bold text-on-surface">{stats.availableStock.toLocaleString()} unidades</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-5 flex flex-col justify-between min-h-[130px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Órdenes Activas</p>
                    <span className="material-symbols-outlined text-purple-400 text-xl">shopping_cart</span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <p className="text-2xl font-bold text-on-surface">{stats.activeOrders}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-5 flex flex-col justify-between min-h-[130px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Contratos Abiertos</p>
                    <span className="material-symbols-outlined text-orange-400 text-xl">description</span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <p className="text-2xl font-bold text-on-surface">{stats.openContracts}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-xl text-on-surface-variant">history</span>
                      <h3 className="text-base font-semibold">Recent Activity</h3>
                    </div>
                    <button className="text-xs font-bold text-primary uppercase tracking-wider hover:underline">
                      View Full Log
                    </button>
                  </div>

                  <div className="relative border-l-2 border-white/5 pl-6 ml-3 space-y-6">
                    <div className="relative">
                      <span className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-4 ring-surface-container-low">
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      </span>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">Order #PS-9842 Completed</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Payment of <span className="text-primary font-medium">$12,400.00</span> processed via Smart Contract.
                          </p>
                          <span className="inline-block font-mono text-[10px] bg-neutral-900 border border-white/5 text-emerald-400 px-2 py-0.5 rounded mt-2">
                            TX_HASH: 0x4f...e92a
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">2m ago</span>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 ring-4 ring-surface-container-low">
                        <span className="material-symbols-outlined text-sm">assignment_late</span>
                      </span>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">Contract Revision Requested</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Client <span className="text-on-surface font-medium">"NeoCorp Global"</span> requested a change in delivery timeline for SKU-442.
                          </p>
                        </div>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">1h ago</span>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-surface-container-low">
                        <span className="material-symbols-outlined text-sm">local_shipping</span>
                      </span>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">Logistics Hub Check-in</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Batch-Z has reached the orbital distribution center.
                          </p>
                        </div>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">4h ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-4">
                  <h3 className="text-base font-semibold text-on-surface">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-surface-container-high/40 hover:bg-surface-container-high transition group text-center gap-2">
                      <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-105 transition">
                        add_box
                      </span>
                      <span className="text-xs font-semibold text-on-surface">Nuevo SKU</span>
                    </button>

                    <button className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-surface-container-high/40 hover:bg-surface-container-high transition group text-center gap-2">
                      <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-105 transition">
                        layers
                      </span>
                      <span className="text-xs font-semibold text-on-surface">Nueva Regla</span>
                    </button>

                    <button className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-surface-container-high/40 hover:bg-surface-container-high transition group text-center gap-2">
                      <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-105 transition">
                        history_edu
                      </span>
                      <span className="text-xs font-semibold text-on-surface">Nuevo Contrato</span>
                    </button>

                    <button className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-surface-container-high/40 hover:bg-surface-container-high transition group text-center gap-2">
                      <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-105 transition">
                        upload_file
                      </span>
                      <span className="text-xs font-semibold text-on-surface">Cargar Tarifas</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {active === "orders" && (
            <section className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total órdenes", value: ordersTotalElements.toString(), accent: "Actualizado", accentColor: "text-emerald-400" },
                  { label: "Pendientes", value: dbOrders.filter(o => (o.status || o.idEstado)?.toLowerCase() === 'pendiente' || (o.status || o.idEstado)?.toLowerCase() === 'en preparación').length.toString(), accent: "Requiere atención", accentColor: "text-amber-400" },
                  { label: "Completadas", value: dbOrders.filter(o => (o.status || o.idEstado)?.toLowerCase() !== 'pendiente' && (o.status || o.idEstado)?.toLowerCase() !== 'en preparación').length.toString(), accent: "Finalizado", accentColor: "text-emerald-400" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/10 bg-surface-container-low p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">{stat.label}</p>
                    <p className="mt-4 text-4xl font-semibold text-on-surface">{stat.value}</p>
                    <p className={`mt-2 text-sm ${stat.accentColor}`}>{stat.accent}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {["ID de Orden", "Empresa Compradora", "Total", "Estado", "Acciones"].map((h) => (
                          <th key={h} className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant last:pr-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                            Cargando órdenes...
                          </td>
                        </tr>
                      ) : dbOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                            No se encontraron órdenes registradas.
                          </td>
                        </tr>
                      ) : (
                        dbOrders.map((order, i) => {
                          const status = (order.idEstado || order.status || order.estado || "").toLowerCase();
                          const isPending = status === "pendiente" || status === "en preparación";
                          const isSuccess = status === "aceptado" || status === "aprobado" || status === "completado" || status === "activo";
                          
                          return (
                            <tr key={order.id || i} className="group">
                              <td className="py-4 pr-6 text-on-surface font-semibold truncate max-w-[120px]" title={order.id}>{order.id}</td>
                              <td className="py-4 pr-6 text-on-surface-variant">{order.nombreEmpresaCompradora || "—"}</td>
                              <td className="py-4 pr-6 text-on-surface font-bold">
                                {order.total != null ? `Bs ${Number(order.total).toFixed(2)}` : "—"}
                              </td>
                              <td className="py-4 pr-6">
                                <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                                  isPending
                                    ? "bg-amber-400/10 text-amber-400"
                                    : isSuccess
                                    ? "bg-emerald-400/10 text-emerald-400"
                                    : "bg-red-400/10 text-red-400"
                                }`}>
                                  {order.idEstado || order.status || order.estado || "—"}
                                </span>
                              </td>
                              <td className="py-4">
                                {isPending ? (
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order, "aprobado")}
                                      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 cursor-pointer"
                                    >
                                      Aceptar
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order, "rechazado")}
                                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                                    >
                                      Rechazar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-on-surface-variant">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-on-surface-variant">
                    Mostrando {dbOrders.length} de {ordersTotalElements} órdenes
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={ordersPage === 0}
                      onClick={() => setOrdersPage(p => Math.max(0, p - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>

                    {Array.from({ length: ordersTotalPages }).map((_, pageIdx) => (
                      <button
                        key={pageIdx}
                        onClick={() => setOrdersPage(pageIdx)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                          ordersPage === pageIdx
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-white/5 bg-surface-container-high/20 text-on-surface-variant hover:bg-white/5"
                        }`}
                      >
                        {pageIdx + 1}
                      </button>
                    ))}

                    <button
                      disabled={ordersPage >= ordersTotalPages - 1}
                      onClick={() => setOrdersPage(p => Math.min(ordersTotalPages - 1, p + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {active === "stock" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-on-surface">Gestión de Almacenes</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Monitorea stock y alertas por almacén</p>
                </div>
                 <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddProductToWarehouse(true)}
                    className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 font-semibold text-primary transition hover:bg-primary/20 text-sm"
                  >
                    + Asociar producto a almacén
                  </button>
                  <button
                    onClick={() => setShowCreateWarehouse(true)}
                    className="rounded-2xl bg-primary px-5 py-3 font-semibold text-on-primary transition hover:opacity-90 text-sm"
                  >
                    + Registrar nuevo almacén
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: "Total de Almacenes", value: dbStock.length.toString(), accent: "Activos" },
                  { title: "Total de Productos (SKUs)", value: skuCount.toString(), accent: "En catálogo" },
                  { title: "Alertas de Stock Bajo", value: "0", accent: "Correcto" },
                ].map((card) => (
                  <div key={card.title} className="rounded-3xl border border-white/10 bg-surface-container-low p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">{card.title}</p>
                    <p className="mt-4 text-4xl font-semibold text-on-surface">{card.value}</p>
                    <p className="mt-2 text-sm text-primary">{card.accent}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-on-surface">Resumen de Stock</h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">LIVE</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {["Nombre", "Dirección", "Coordenadas", "Estado"].map((h) => (
                          <th key={h} className="pb-3 pr-6 text-left text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {dbStock.map((item, i) => (
                        <tr key={i}>
                          <td className="py-4 pr-6 font-medium text-on-surface">{item.nombre}</td>
                          <td className="py-4 pr-6 text-on-surface-variant">{item.direccion}</td>
                          <td className="py-4 pr-6 text-on-surface-variant">
                            {item.coordenadas ? `${item.coordenadas.y}, ${item.coordenadas.x}` : "—"}
                          </td>
                          <td className="py-4">
                            <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                              item.activo ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                            }`}>
                              {item.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="text-xs text-on-surface-variant">Mostrando {dbStock.length} ubicaciones</p>
                </div>
              </div>
              {showCreateWarehouse && (
                <CreateWarehouseModal
                  onClose={() => setShowCreateWarehouse(false)}
                  onSuccess={() => {
                    setShowCreateWarehouse(false);
                    api.get(`/api/v1/proveedores/${providerId}/stock`)
                      .then((res) => { if (res) setDbStock(res); })
                      .catch(console.error);
                  }}
                />
              )}
              {showAddProductToWarehouse && (
                <AddProductToWarehouseModal
                  onClose={() => setShowAddProductToWarehouse(false)}
                  onSuccess={() => {
                    toast.success("Producto asociado al almacén correctamente.");
                    api.get(`/api/v1/proveedores/${providerId}/stock`)
                      .then((res) => { if (res) setDbStock(res); })
                      .catch(console.error);
                  }}
                />
              )}
            </section>
          )}

          {active === "contracts" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-on-surface">Gestión de Contratos</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">Crea y administra tus acuerdos comerciales exclusivos.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-surface-container-high px-5 py-2.5">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Contratos Activos</p>
                      <p className="text-xl font-bold text-primary">12</p>
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tasa de Descuento Prom.</p>
                      <p className="text-xl font-bold text-emerald-400">14.5%</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCreateContract(true)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90">
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                    Registrar nuevo contrato
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">handshake</span>
                    <h3 className="text-lg font-semibold text-on-surface">Resumen de Contratos</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-container-high text-on-surface-variant transition hover:text-on-surface">
                      <span className="material-symbols-outlined text-lg">filter_list</span>
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-container-high text-on-surface-variant transition hover:text-on-surface">
                      <span className="material-symbols-outlined text-lg">download</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {["ID del Contrato", "Proveedor", "Vigencia", "Descuento", "Estado", ""].map((h, i) => (
                          <th key={i} className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant last:pr-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {dbContracts.map((contract, index) => (
                        <tr key={index} className="group hover:bg-white/[0.01]">
                          <td className="py-4 pr-6 text-on-surface font-semibold">{contract.idContrato || contract.id}</td>
                          <td className="py-4 pr-6 text-on-surface-variant">{contract.nombreProveedor || "Proveedor"}</td>
                          <td className="py-4 pr-6 text-on-surface-variant">
                            {contract.vigenteDesde ? (
                              `${new Date(contract.vigenteDesde).toLocaleDateString()} - ${contract.vigenteHasta ? new Date(contract.vigenteHasta).toLocaleDateString() : "Indefinido"}`
                            ) : (
                              contract.validez || "—"
                            )}
                          </td>
                          <td className="py-4 pr-6 text-emerald-400 font-bold">
                            {(() => {
                              const descVal = contract.porcentajeDescuento !== undefined && contract.porcentajeDescuento !== null
                                ? contract.porcentajeDescuento
                                : contract.descuento;
                              return descVal !== undefined && descVal !== null ? `${descVal}%` : "—";
                            })()}
                          </td>
                          <td className="py-4 pr-6">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {contract.estado || contract.status || "Activo"}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button className="text-on-surface-variant transition hover:text-on-surface">
                              <span className="material-symbols-outlined align-middle">more_vert</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-on-surface-variant">Página actual: {contractsPage + 1}</p>
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={contractsPage === 0}
                      onClick={() => setContractsPage(p => Math.max(0, p - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                      {contractsPage + 1}
                    </button>
                    <button 
                      onClick={() => setContractsPage(p => p + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
              {showCreateContract && (
                <CreateContractModal
                  onClose={() => setShowCreateContract(false)}
                  onSuccess={() => {
                    setShowCreateContract(false);
                    if (idEmpresa) {
                      api.get(`/api/v1/contratos-detalle?idEmpresa=${idEmpresa}&page=${contractsPage}&size=${contractsSize}`)
                        .then((res) => { if (res) setDbContracts(Array.isArray(res) ? res : res.content || []); })
                        .catch(console.error);
                    }
                  }}
                />
              )}
            </section>
          )}

{active === "account" && (
  <section className="space-y-6">
    {editing ? (
      <div className="rounded-3xl border border-white/10 bg-surface-container-low p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Editar Información de Cuenta</h2>
          <p className="text-sm text-on-surface-variant mt-1">Actualiza tus datos personales de acceso.</p>
        </div>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Nombre Completo</label>
            <input
              type="text"
              required
              value={profileForm.nombre}
              onChange={(e) => setProfileForm({ ...profileForm, nombre: e.target.value })}
              className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-primary transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Correo Electrónico</label>
            <input
              type="email"
              required
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-primary transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Nueva Contraseña</label>
            <input
              type="password"
              placeholder="Dejar en blanco para no modificar"
              value={profileForm.password}
              onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
              className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-outline/20 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-primary transition"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-outline/10 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updatingProfile}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-on-primary hover:brightness-110 transition disabled:opacity-50"
            >
              {updatingProfile ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    ) : (
      <>
        {/* Header */}
        <div className="rounded-3xl border border-white/10 bg-surface-container-low p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-secondary/20 to-primary/20 border border-white/10">
              <span className="material-symbols-outlined text-4xl text-primary">account_circle</span>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Perfil de usuario</p>
              <h1 className="mt-1 text-3xl font-semibold text-on-surface">{user?.nombre ?? "—"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  {user?.role ?? "Sin rol"}
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
            <button
              onClick={startEditing}
              className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 font-semibold text-primary transition hover:bg-primary/20 text-xs uppercase tracking-wider"
            >
              Editar Datos
            </button>
          </div>
        </div>
      </>
    )}

    {/* Info grid */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[
        { icon: "mail", label: "Correo electrónico", value: user?.email },
        { icon: "business", label: "Empresa", value: user?.nombreEmpresa },
        // { icon: "store", label: "Sucursal", value: user?.id_sucursal?.direccion },
        { icon: "badge", label: "Rol asignado", value: user?.role },
        { icon: "fingerprint", label: "ID de usuario", value: user?.id?.toString().slice(0, 8) + "…" },
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
          className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 px-5 py-3 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10 disabled:opacity-50"
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
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">
                  {totpVerifying ? "hourglass_empty" : "verified"}
                </span>
                {totpVerifying ? "Verificando…" : "Verificar y activar"}
              </button>
              <button
                onClick={() => { setTotpQr(null); setTotpCode(""); setTotpError(null); }}
                className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-on-surface-variant transition hover:text-on-surface"
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
  </section>
)}

          {active === "rules" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-on-surface">Reglas de Comisión</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Defina estructuras de precios dinámicas basadas en el volumen de transacciones.</p>
                </div>
                {!showCreateRule && (
                  <button
                    onClick={() => setShowCreateRule(true)}
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>Crear nueva regla
                  </button>
                )}
              </div>

              {!showCreateRule ? (
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                          <th className="pb-3 pr-6 text-left">Nombre</th>
                          <th className="pb-3 pr-6 text-left">Descripción</th>
                          <th className="pb-3 pr-6 text-left">Tramos</th>
                          <th className="pb-3 pr-6 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {dbRules.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-xs text-on-surface-variant">
                              No hay reglas de comisión registradas.
                            </td>
                          </tr>
                        ) : (
                          dbRules.map((rule, idx) => (
                            <tr key={rule.id || idx} className="group hover:bg-white/[0.01]">
                              <td className="py-4 pr-6 text-on-surface font-semibold">{rule.nombre}</td>
                              <td className="py-4 pr-6 text-on-surface-variant">{rule.descripcion || "—"}</td>
                              <td className="py-4 pr-6 text-xs text-cyan-400 font-mono">{(rule.tramos || rule.detalles || []).length} tramos</td>
                              <td className="py-4 pr-6">
                                <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                                  rule.activo !== false ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                                }`}>
                                  {rule.activo !== false ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {rulesTotalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                      <p className="text-xs text-on-surface-variant">Mostrando {dbRules.length} de {rulesTotalElements} reglas</p>
                      <div className="flex gap-1.5">
                        <button
                          disabled={rulesPage === 0}
                          onClick={() => setRulesPage(p => Math.max(0, p - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-base">chevron_left</span>
                        </button>
                        {Array.from({ length: rulesTotalPages }).map((_, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => setRulesPage(pIdx)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                              rulesPage === pIdx
                                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
                                : "border-white/5 bg-surface-container-high/20 text-on-surface-variant hover:bg-white/5"
                            }`}
                          >
                            {pIdx + 1}
                          </button>
                        ))}
                        <button
                          disabled={rulesPage >= rulesTotalPages - 1}
                          onClick={() => setRulesPage(p => Math.min(rulesTotalPages - 1, p + 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-base">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">Nombre de la regla</label>
                      <input
                        type="text"
                        placeholder="Ej: Descuento por volumen"
                        value={ruleForm.nombre}
                        onChange={(e) => setRuleForm({ ...ruleForm, nombre: e.target.value })}
                        className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">Descripción (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej: Aplica a pedidos grandes"
                        value={ruleForm.descripcion}
                        onChange={(e) => setRuleForm({ ...ruleForm, descripcion: e.target.value })}
                        className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined font-bold">layers</span>
                        <h3 className="text-lg font-semibold text-on-surface">Tramos</h3>
                      </div>
                      <button
                        onClick={handleAddTramo}
                        className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/10"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">add</span>Agregar tramo
                      </button>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-surface-container-high/40 p-4 space-y-3">
                      <div className="grid grid-cols-[120px_1fr_1fr_1fr_auto] gap-4 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        <div>Tipo</div>
                        <div>Cantidad Mínima</div>
                        <div>Cantidad Máxima</div>
                        <div>Descuento %</div>
                        <div className="w-[80px]"></div>
                      </div>

                      {ruleTramos.map((t, idx) => (
                        <div key={idx} className="grid grid-cols-[120px_1fr_1fr_1fr_auto] gap-4 items-center">
                          <div>
                            <select
                              value={t.tipo}
                              onChange={(e) => handleTramoChange(idx, "tipo", e.target.value)}
                              className="w-full rounded-xl bg-neutral-900 border border-white/10 px-3 py-3 text-sm text-on-surface focus:outline-none"
                            >
                              <option value="Volumen">Volumen</option>
                              <option value="Monto">Monto</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              placeholder="Ej: 1"
                              value={t.cantidadMinima}
                              onChange={(e) => handleTramoChange(idx, "cantidadMinima", e.target.value)}
                              className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              placeholder="Vacío = sin límite"
                              value={t.cantidadMaxima}
                              onChange={(e) => handleTramoChange(idx, "cantidadMaxima", e.target.value)}
                              className="w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Ej: 10"
                              value={t.descuento}
                              onChange={(e) => handleTramoChange(idx, "descuento", e.target.value)}
                              className="w-full rounded-xl bg-white pl-4 pr-8 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium">%</span>
                          </div>
                          <div>
                            <button
                              onClick={() => handleRemoveTramo(idx)}
                              className="flex items-center gap-1.5 px-2 py-3 text-xs font-semibold text-red-400/80 transition hover:text-red-400"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-6 pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setShowCreateRule(false);
                        setRuleForm({ nombre: "", descripcion: "" });
                        setRuleTramos([{ tipo: "Volumen", cantidadMinima: "", cantidadMaxima: "", descuento: "" }]);
                      }}
                      className="text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRule}
                      disabled={savingRule}
                      className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">
                        {savingRule ? "hourglass_empty" : "save"}
                      </span>
                      {savingRule ? "Creando..." : "Crear regla"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {active === "products" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-on-surface">Visualizador de Productos</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Mantén control de los productos que ofreces a tus clientes.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCreateCategory(true)}
                    className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/20"
                  >
                    <span className="material-symbols-outlined text-sm">folder</span>Crear Categoría
                  </button>
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/20"
                  >
                    <span className="material-symbols-outlined text-sm">upload_file</span>Carga masiva
                  </button>
                  <button
                    onClick={() => setShowCreateProduct(true)}
                    className="rounded-2xl bg-primary px-5 py-3 font-semibold text-on-primary transition hover:opacity-90 text-sm"
                  >
                    Crear Producto
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-surface-container-low p-5 flex flex-col justify-between min-h-[140px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total SKU</p>
                    <span className="material-symbols-outlined text-primary text-xl">archive</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-on-surface">{productsTotalElements}</p>
                    <p className="mt-1 text-xs font-medium text-emerald-400">Sincronizado con empresa</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-surface-container-low p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        <th className="pb-4 pr-6 text-left">SKU</th>
                        <th className="pb-4 pr-6 text-left">Nombre de Producto</th>
                        <th className="pb-4 pr-6 text-left">Descripción</th>
                        <th className="pb-4 pr-6 text-left">U. Medida</th>
                        <th className="pb-4 pr-6 text-left">Precio Base (USD)</th>
                        <th className="pb-4 text-center w-[60px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                            Cargando productos de la base de datos...
                          </td>
                        </tr>
                      ) : dbProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                            No se encontraron productos registrados.
                          </td>
                        </tr>
                      ) : (
                        dbProducts.map((product, idx) => (
                          <tr key={product.id || idx} className="group hover:bg-white/[0.01]">
                            <td className="py-5 pr-6 font-mono text-xs text-primary font-semibold">{product.sku || "—"}</td>
                            <td className="py-5 pr-6">
                              <div className="flex items-center gap-3">
                                <span className="w-1.5 h-2.5 rounded-sm shrink-0 bg-primary" />
                                <span className="font-semibold text-on-surface">{product.nombre || "—"}</span>
                              </div>
                            </td>
                            <td className="py-5 pr-6 text-on-surface-variant max-w-[220px] truncate" title={product.descripcion}>
                              {product.descripcion || "Sin descripción"}
                            </td>
                            <td className="py-5 pr-6 text-on-surface-variant">
                              <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-medium">
                                {product.unidadMedida || "U"}
                              </span>
                            </td>
                            <td className="py-5 pr-6 font-semibold text-emerald-400">
                              {product.precioBase !== undefined && product.precioBase !== null
                                ? `$${Number(product.precioBase).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "$0.00"}
                            </td>
                            <td className="py-5 text-center">
                              <div className="flex items-center justify-center gap-3 text-on-surface-variant">
                                <button className="transition hover:text-primary">
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button className="transition hover:text-red-400">
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-on-surface-variant">Mostrando {dbProducts.length} de {productsTotalElements} productos</p>
                  <div className="flex items-center gap-1.5">
                    <button 
                      disabled={productsPage === 0}
                      onClick={() => setProductsPage(prev => Math.max(0, prev - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                    
                    {Array.from({ length: productsTotalPages }).map((_, pageIdx) => (
                      <button
                        key={pageIdx}
                        onClick={() => setProductsPage(pageIdx)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                          productsPage === pageIdx
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-white/5 bg-surface-container-high/20 text-on-surface-variant hover:bg-white/5"
                        }`}
                      >
                        {pageIdx + 1}
                      </button>
                    ))}

                    <button 
                      disabled={productsPage >= productsTotalPages - 1}
                      onClick={() => setProductsPage(prev => Math.min(productsTotalPages - 1, prev + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
              {showCreateProduct && (
                <CreateProductModal
                  onClose={() => setShowCreateProduct(false)}
                  onSuccess={() => {
                    api.get(`/api/v1/proveedores/${providerId}/productos`)
                      .then((res) => { if (res) setDbProducts(res); })
                      .catch(console.error);
                  }}
                />
              )}
              {showBulkUpload && (
                <BulkUploadProductsModal
                  idEmpresa={idEmpresa ?? ""}
                  onClose={() => setShowBulkUpload(false)}
                  onSuccess={() => {
                    setShowBulkUpload(false);
                    api.get(`/api/v1/products/all?idEmpresa=${idEmpresa}&page=0&size=10`)
                      .then((res) => {
                        if (res) {
                          setDbProducts(Array.isArray(res) ? res : res.content || []);
                          setProductsTotalPages(res.totalPages ?? 1);
                          setProductsTotalElements(res.totalElements ?? 0);
                        }
                      })
                      .catch(console.error);
                  }}
                />
              )}
              {showCreateCategory && (
                <CreateCategoryModal
                  onClose={() => setShowCreateCategory(false)}
                  onSuccess={() => {
                    // Refrescar categorías si fuera necesario
                  }}
                />
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}