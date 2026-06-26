import { useState, useEffect, type MouseEventHandler } from "react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { StereumPayModal } from "./StereumPayModal"; 
import { CreateContractModal } from "./CreateContractModal"; 
import { toast } from "sonner"; 

type NavKey = "dashboard" | "catalog" | "orders" | "invoices" | "contracts" |  "suppliers" | "account";

const NAV_ITEMS: { key: NavKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "catalog", label: "Catálogo / Compras", icon: "shopping_cart" },
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
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Cart & Catalog States
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [catalogProductsAll, setCatalogProductsAll] = useState<any[]>([]);
  const [loadingAllProducts, setLoadingAllProducts] = useState(false);
  const [configuringCartProduct, setConfiguringCartProduct] = useState<any | null>(null);
  const [loadingConfigProduct, setLoadingConfigProduct] = useState(false);
  const [configProductDetails, setConfigProductDetails] = useState<any | null>(null);
  const [selectedConfigWarehouse, setSelectedConfigWarehouse] = useState<any | null>(null);
  const [configCantidad, setConfigCantidad] = useState(1);
  const [fechaOrden, setFechaOrden] = useState(() => new Date().toISOString().split("T")[0]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSupplierFilter, setCatalogSupplierFilter] = useState("all");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");

  const fetchAllCatalogProducts = async (suppliers: any[]) => {
    setLoadingAllProducts(true);
    try {
      const allProducts: any[] = [];
      await Promise.all(
        suppliers.map(async (supplier) => {
          try {
            const res = await api.get(`/api/v1/products/proveedor/${supplier.id}`);
            if (res && Array.isArray(res)) {
              res.forEach((prod: any) => {
                allProducts.push({
                  ...prod,
                  supplierId: supplier.id,
                  supplierName: supplier.nombreEmpresa || supplier.nombre || "Proveedor SRL",
                });
              });
            }
          } catch (e) {
            console.error(`Error loading catalog for supplier ${supplier.id}:`, e);
          }
        })
      );
      setCatalogProductsAll(allProducts);
    } catch (e) {
      console.error("Error fetching all catalog products:", e);
    } finally {
      setLoadingAllProducts(false);
    }
  };

  const handleStartAddToCart = async (product: any) => {
    setConfiguringCartProduct(product);
    setLoadingConfigProduct(true);
    setConfigProductDetails(null);
    setSelectedConfigWarehouse(null);
    setConfigCantidad(1);
    try {
      const res = await api.get(`/api/v1/producto-almacen/buscar?sku=${encodeURIComponent(product.sku)}`);
      if (!res) throw new Error("Producto no encontrado en almacenes.");
      
      let normalized: any;
      if (Array.isArray(res)) {
        const first = res[0] ?? {};
        normalized = {
          idProducto: (first.idProducto?.id || first.idProducto || first.id || "") as string,
          sku: product.sku,
          nombre: first.nombreProducto ?? product.nombre ?? "Producto",
          almacenes: res.map((item: any, index: number) => ({
            id: item.idAlmacen?.id ?? item.idAlmacen ?? `almacen-${index}`,
            nombre: item.nombreAlmacen ?? `Almacén ${index + 1}`,
            idProveedor: item.idProveedor ?? product.supplierId ?? "",
            nombreProveedor: item.nombreProveedor ?? product.supplierName ?? "",
            stock: item.stock ?? 0,
            precio: item.precioBase ?? item.precio ?? 0,
            cantidadMinima: item.min ?? 1,
            cantidadMaxima: item.max ?? 9999,
          })),
        };
      } else {
        normalized = {
          idProducto: (res.idProducto?.id || res.idProducto || res.id || "") as string,
          sku: res.sku ?? res.codigoSku ?? product.sku,
          nombre: res.nombreProducto ?? res.nombre ?? product.nombre ?? "Producto",
          almacenes: Array.isArray(res.almacenes) ? res.almacenes.map((item: any) => ({
            id: item.idSucursal ?? item.id,
            nombre: item.nombreSucursal ?? item.nombreAlmacen ?? item.nombre ?? "Almacén",
            idProveedor: item.idProveedor ?? item.proveedor?.id ?? product.supplierId ?? "",
            nombreProveedor: item.nombreProveedor ?? item.proveedor?.nombre ?? product.supplierName ?? "",
            stock: item.stock ?? item.cantidad ?? 0,
            precio: item.precio ?? item.precioUnitario ?? 0,
            cantidadMinima: item.cantidadMinima ?? item.minimo ?? 1,
            cantidadMaxima: item.cantidadMaxima ?? item.maximo ?? 9999,
          })) : [],
        };
      }
      
      setConfigProductDetails(normalized);
      if (normalized.almacenes && normalized.almacenes.length > 0) {
        const initialWarehouse = normalized.almacenes.find((w: any) => w.stock > 0) || normalized.almacenes[0];
        setSelectedConfigWarehouse(initialWarehouse);
        setConfigCantidad(initialWarehouse.cantidadMinima || 1);
      } else {
        toast.error("Este producto no tiene almacenes o inventario asociado.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "No se pudo obtener la información de inventario para este producto.");
      setConfiguringCartProduct(null);
    } finally {
      setLoadingConfigProduct(false);
    }
  };

  const handleConfirmAddToCart = () => {
    if (!configuringCartProduct || !selectedConfigWarehouse || !configProductDetails) return;

    const existingIndex = cartItems.findIndex(
      (item) => item.idProducto === configProductDetails.idProducto && item.idAlmacen === selectedConfigWarehouse.id
    );

    const subtotal = selectedConfigWarehouse.precio * configCantidad;

    if (existingIndex > -1) {
      const updated = [...cartItems];
      const current = updated[existingIndex];
      const newQty = current.cantidad + configCantidad;
      if (newQty > Math.min(selectedConfigWarehouse.cantidadMaxima, selectedConfigWarehouse.stock)) {
        toast.error(`La cantidad excede el stock o límite máximo del almacén para ${configProductDetails.nombre}`);
        return;
      }
      current.cantidad = newQty;
      current.subtotal = current.cantidad * current.precioUnitario;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          idProducto: configProductDetails.idProducto,
          nombreProducto: configProductDetails.nombre,
          sku: configProductDetails.sku,
          idAlmacen: selectedConfigWarehouse.id,
          nombreAlmacen: selectedConfigWarehouse.nombre,
          cantidad: configCantidad,
          precioUnitario: selectedConfigWarehouse.precio,
          subtotal,
          stock: selectedConfigWarehouse.stock,
          min: selectedConfigWarehouse.cantidadMinima,
          max: selectedConfigWarehouse.cantidadMaxima,
          idProveedor: selectedConfigWarehouse.idProveedor || configuringCartProduct.supplierId,
          nombreProveedor: selectedConfigWarehouse.nombreProveedor || configuringCartProduct.supplierName,
        },
      ]);
    }

    toast.success(`${configProductDetails.nombre} agregado al carrito.`);
    setConfiguringCartProduct(null);
    setConfigProductDetails(null);
    setSelectedConfigWarehouse(null);
  };

  const handlePlaceOrderForSupplier = async (supplierId: string, items: any[]) => {
    if (!user) return;
    const totalGeneral = items.reduce((acc, curr) => acc + curr.subtotal, 0);
    const now = new Date();
    const payload = {
      total: totalGeneral,
      fecha: now.toISOString(),
      fechaOrden,
      idEstado: "pendiente",
      idProveedor: supplierId,
      idUsuario: user.id,
      idEmpresaCompradora: user.id_empresa,
      idSucursal: user.id_sucursal,
      detalles: items.map((d) => ({
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        subtotal: d.subtotal,
        idProducto: d.idProducto,
        idAlmacen: d.idAlmacen,
      })),
      version: 0,
    };

    try {
      await api.post("/api/v1/ordenes-compra", payload);
      toast.success(`Orden creada con éxito para ${items[0].nombreProveedor}`);
      setCartItems(prev => prev.filter(item => item.idProveedor !== supplierId));
      
      // Refresh order stats and lists
      const stats = await api.get(`/api/v1/ordenes-compra/stats?idEmpresa=${companyId}`);
      if (stats) setOrderStats({ ordenesTotales: stats.ordenesTotales ?? 0, pendientes: stats.pendientes ?? 0, gastoMensual: stats.gastoMensual ?? 0 });
      const res = await api.get(`/api/v1/ordenes-compra/buyer?idEmpresa=${companyId}&size=${ordersSize}&page=${ordersPage}`);
      if (res?.content) setDbOrders(res.content);
    } catch (e: any) {
      toast.error(e?.message || "Error al crear la orden.");
    }
  };

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

  // Estado para controlar la visibilidad del modal de contratos
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  // Estado para controlar la visibilidad del modal de órdenes
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Pagination and API States
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotalElements, setOrdersTotalElements] = useState(0);
  const ordersSize = 10;

  const [invoicesPage, setInvoicesPage] = useState(0);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [invoicesTotalElements, setInvoicesTotalElements] = useState(0);
  const invoicesSize = 10;

  const [contractsPage, setContractsPage] = useState(0);
  const [contractsTotalPages, setContractsTotalPages] = useState(1);
  const [contractsTotalElements, setContractsTotalElements] = useState(0);
  const contractsSize = 10;

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
  const [selectedViewOrder, setSelectedViewOrder] = useState<any | null>(null);
  const [selectedCatalogProvider, setSelectedCatalogProvider] = useState<{ id: string; name: string } | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

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
            const res = await api.get(`/api/v1/ordenes-compra/buyer?idEmpresa=${companyId}&size=${ordersSize}&page=${ordersPage}`);
            if (res) {
              setDbOrders(Array.isArray(res) ? res : res.content || []);
              setOrdersTotalPages(res.totalPages ?? 1);
              setOrdersTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
            }
          } catch (e) { console.error(e); }
        }

        if (active === "dashboard" || active === "invoices") {
          try {
            const stats = await api.get(`/api/v1/facturas/stats?idEmpresa=${companyId}`);
            if (stats) setInvoiceStats({ faltaPago: stats.faltaPago ?? 0, pagadoHoy: stats.pagadoHoy ?? 0 });
          } catch (e) { console.error(e); }

          try {
            const res = await api.get(`/api/v1/facturas?idEmpresa=${companyId}&size=${invoicesSize}&page=${invoicesPage}`);
            if (res) {
              setDbInvoices(Array.isArray(res) ? res : res.content || []);
              setInvoicesTotalPages(res.totalPages ?? 1);
              setInvoicesTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
            }
          } catch (e) { console.error(e); }
        }

        if (active === "contracts" || active === "dashboard") {
          try {
            const stats = await api.get(`/api/v1/contratos-detalle/stats?idEmpresa=${companyId}`);
            if (stats) setContractStats({ contratosTotales: stats.contratosTotales ?? 0, descuentoPromedio: stats.descuentoPromedio ?? 0, vencimientosCercanos: stats.vencimientosCercanos ?? 0 });
          } catch (e) { console.error(e); }

          try {
            const res = await api.get(`/api/v1/contratos-detalle?idEmpresa=${companyId}&page=${contractsPage}&size=${contractsSize}`);
            if (res) {
              setDbContracts(Array.isArray(res) ? res : res.content || []);
              setContractsTotalPages(res.totalPages ?? 1);
              setContractsTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
            }
          } catch (e) { console.error(e); }
        }

        // Cargamos proveedores si estamos en la pestaña o si abrimos el modal de contratos o catálogo
        if (active === "suppliers" || active === "contracts" || active === "catalog") {
          try {
            const res = await api.get(`/api/v1/proveedores?page=0&size=50`);
            const suppliers = res?.content || [];
            setDbSuppliers(suppliers);
            if (active === "catalog") {
              await fetchAllCatalogProducts(suppliers);
            }
          } catch (e) { console.error(e); }
        }
      } catch (err) {
        console.error("Error loading buyer dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatsAndData();
  }, [active, companyId, ordersPage, invoicesPage, contractsPage]);

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
      const res = await api.get(`/api/v1/contratos-detalle?idEmpresa=${companyId}&page=${contractsPage}&size=${contractsSize}`);
      if (res) {
        setDbContracts(Array.isArray(res) ? res : res.content || []);
        setContractsTotalPages(res.totalPages ?? 1);
        setContractsTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
      }
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
    const res = await api.get(`/api/v1/ordenes-compra/buyer?idEmpresa=${companyId}&size=${ordersSize}&page=${ordersPage}`);
    if (res) {
      setDbOrders(Array.isArray(res) ? res : res.content || []);
      setOrdersTotalPages(res.totalPages ?? 1);
      setOrdersTotalElements(res.totalElements ?? (Array.isArray(res) ? res.length : 0));
    }
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

  const handleFetchCatalog = async (providerId: string, providerName: string) => {
    setSelectedCatalogProvider({ id: providerId, name: providerName });
    setLoadingCatalog(true);
    setCatalogProducts([]);
    try {
      const res = await api.get(`/api/v1/products/proveedor/${providerId}`);
      if (res && Array.isArray(res)) {
        setCatalogProducts(res);
      } else {
        setCatalogProducts([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al obtener catálogo de productos.");
    } finally {
      setLoadingCatalog(false);
    }
  };

  const ordersList = dbOrders.map(o => ({
    id: o.id,
    initials: (o.nombreProveedor || "P").substring(0,2).toUpperCase(),
    supplier: o.nombreProveedor || "Proveedor Demo SRL",
    date: o.fecha ? new Date(o.fecha).toLocaleDateString() : "N/A",
    amount: `Bs ${o.total}`,
    status: (o.idEstado || "pendiente").toUpperCase(),
    raw: o
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
    const discountVal = c.porcentajeDescuento ?? c.descuento ?? 0;
    return {
      id: c.idContrato || c.id || "CTR-DEMO",
      initials: sName.substring(0, 2).toUpperCase(),
      supplier: sName,
      category: c.nombreProducto || c.nombreCategoria || "Suministros",
      period: c.validez || "Vigente",
      discount: `${discountVal}%`,
      status: c.estado || "Activo",
      periods: null,
      alert: null,
      note: null
    };
  });

  const suppliersList = dbSuppliers.map(s => {
    // Collect unique product categories from s.productos or similar if available, else standard tags
    const cats = Array.isArray(s.productos) 
      ? Array.from(new Set(s.productos.map((p: any) => p.nombreCategoria || p.categoria?.nombre).filter(Boolean)))
      : s.categorias || [];
    return {
      id: s.id,
      initials: (s.nombreEmpresa || "P").substring(0,2).toUpperCase(),
      name: s.nombreEmpresa || "Proveedor SRL",
      tags: s.tags || ["Proveedor"],
      categorias: cats.length > 0 ? cats : ["General"],
      online: s.activo ?? true,
      icon: "store",
      raw: s
    };
  });

  const contractStatsList = [
    { label: "Contratos Totales", value: contractStats.contratosTotales.toString(), note: "Activos", icon: "description", tone: "text-on-surface" },
    { label: "Tasa de Descuento Promedio", value: contractStats.descuentoPromedio > 0 ? `${contractStats.descuentoPromedio}%` : "0%", note: "Cumplimiento B2B", icon: "verified", tone: "text-primary" },
    { label: "Próximos Vencimientos", value: contractStats.vencimientosCercanos ? contractStats.vencimientosCercanos.toString() : "0", note: contractStats.vencimientosCercanos > 0 ? "Urgente" : "Estable", icon: "warning", tone: contractStats.vencimientosCercanos > 0 ? "text-error" : "text-secondary" },
  ];

  const filteredCatalogProducts = catalogProductsAll.filter((p) => {
    const matchesSearch =
      (p.nombre || "").toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesSupplier =
      catalogSupplierFilter === "all" || p.supplierId === catalogSupplierFilter;
    
    const catName = p.nombreCategoria || p.categoria?.nombre || "";
    const matchesCategory =
      catalogCategoryFilter === "all" || catName === catalogCategoryFilter;
      
    return matchesSearch && matchesSupplier && matchesCategory;
  });

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
                          { label: "Por pagar", value: `Bs ${invoiceStats.faltaPago.toLocaleString()}`, tone: "text-primary" },
                          { label: "Pagadas hoy", value: `Bs ${invoiceStats.pagadoHoy.toLocaleString()}`, tone: "text-tertiary" },
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
                        {contractsList.length === 0 ? (
                          <div className="text-xs text-on-surface-variant py-4 text-center">
                            No hay contratos registrados.
                          </div>
                        ) : (
                          contractsList.slice(0, 4).map((c) => {
                            const isVigente = c.status.toLowerCase().includes("vigente") || c.status.toLowerCase().includes("activo");
                            const isPendiente = c.status.toLowerCase().includes("pend") || c.status.toLowerCase().includes("firma");
                            const dot = isVigente ? "bg-tertiary" : isPendiente ? "bg-secondary" : "bg-error";
                            const tone = isVigente ? "text-tertiary" : isPendiente ? "text-secondary" : "text-error";
                            return (
                              <div key={c.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                                <p className="text-xs font-bold text-on-surface truncate max-w-[120px]" title={c.supplier}>{c.supplier}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-bold text-primary">{c.discount}</span>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${tone}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                    {c.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === "catalog" && (
              <section className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Suministros B2B</p>
                  <h1 className="mt-2 text-4xl font-bold text-on-surface">
                    Catálogo de <span className="text-primary">Productos</span>
                  </h1>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Consulte el inventario general de los proveedores asociados y orqueste sus órdenes de compra directamente en el carrito.
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
                  
                  {/* Left Column: Product Search and Catalog Grid */}
                  <div className="space-y-6">
                    {/* Filters bar */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-xl border border-white/10 bg-surface-container-low p-4">
                      <div className="relative flex-1 max-w-md">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
                        <input
                          type="text"
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          placeholder="Buscar por nombre o SKU..."
                          className="w-full bg-black/30 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50 text-on-surface"
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant">
                          <Icon name="filter_list" className="text-sm" />
                          Filtrar:
                        </div>
                        
                        <select
                          value={catalogSupplierFilter}
                          onChange={(e) => setCatalogSupplierFilter(e.target.value)}
                          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs font-bold text-on-surface outline-none transition focus:border-primary"
                        >
                          <option value="all">Todos los Proveedores</option>
                          {dbSuppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombreEmpresa || s.nombre || "Proveedor"}
                            </option>
                          ))}
                        </select>

                        <select
                          value={catalogCategoryFilter}
                          onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs font-bold text-on-surface outline-none transition focus:border-primary"
                        >
                          <option value="all">Todas las Categorías</option>
                          {Array.from(
                            new Set(
                              catalogProductsAll
                                .map((p) => p.nombreCategoria || p.categoria?.nombre)
                                .filter(Boolean)
                            )
                          ).map((catName: any) => (
                            <option key={catName} value={catName}>
                              {catName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Products Grid */}
                    {loadingAllProducts ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-on-surface-variant font-bold">Cargando catálogo completo...</p>
                      </div>
                    ) : filteredCatalogProducts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/15 bg-surface-container-low/40 p-12 text-center">
                        <Icon name="production_quantity_limits" className="text-on-surface-variant text-4xl mb-3" />
                        <p className="font-bold text-on-surface text-base">No se encontraron productos</p>
                        <p className="text-xs text-on-surface-variant mt-1">Intente ajustar sus criterios de búsqueda o filtros.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredCatalogProducts.map((p) => (
                          <div key={p.id} className="flex flex-col rounded-xl border border-white/10 bg-surface-container-low p-5 transition hover:border-primary/30 justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="font-bold text-base text-on-surface leading-tight">{p.nombre}</h3>
                                <span className="shrink-0 text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                  {p.sku}
                                </span>
                              </div>
                              
                              {p.descripcion && (
                                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">{p.descripcion}</p>
                              )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded bg-white/5 text-on-surface-variant text-[10px] px-2 py-1 font-bold border border-white/5">
                                  Categoría: {p.nombreCategoria || p.categoria?.nombre || "General"}
                                </span>
                                <span className="rounded bg-white/5 text-on-surface-variant text-[10px] px-2 py-1 font-bold border border-white/5">
                                  U.M.: {p.nombreUnidadMedida || "Unidad"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <Icon name="store" className="text-sm text-[#BA7517]" />
                                <span className="font-bold text-on-surface-variant truncate max-w-[150px]" title={p.supplierName}>
                                  {p.supplierName}
                                </span>
                              </div>

                              <button
                                onClick={() => handleStartAddToCart(p)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-on-primary transition hover:brightness-110"
                              >
                                <Icon name="add_shopping_cart" className="text-xs" />
                                Comprar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Shopping Cart Side Panel */}
                  <div className="sticky top-20 rounded-xl border border-white/10 bg-surface-container-low p-5 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="shopping_cart" className="text-primary text-lg" />
                        <h2 className="font-bold text-on-surface text-lg">Carrito de Compras</h2>
                      </div>
                      <span className="rounded-full bg-primary/15 text-primary text-[11px] font-bold px-2 py-0.5">
                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* Order Date Selection */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Fecha requerida de orden
                      </label>
                      <input
                        type="date"
                        value={fechaOrden}
                        onChange={(e) => setFechaOrden(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs font-bold text-on-surface outline-none transition focus:border-primary"
                      />
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="text-center py-10 space-y-2 border border-dashed border-white/5 rounded-xl bg-black/10">
                        <Icon name="shopping_basket" className="text-on-surface-variant/40 text-3xl" />
                        <p className="text-xs text-on-surface-variant font-bold">Carrito Vacío</p>
                        <p className="text-[10px] text-on-surface-variant/60 max-w-[200px] mx-auto leading-relaxed">
                          Haga clic en el botón "Comprar" de algún producto para agregarlo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
                        {Object.entries(
                          cartItems.reduce((acc: { [key: string]: { supplierName: string; items: any[] } }, item) => {
                            if (!acc[item.idProveedor]) {
                              acc[item.idProveedor] = {
                                supplierName: item.nombreProveedor,
                                items: []
                              };
                            }
                            acc[item.idProveedor].items.push(item);
                            return acc;
                          }, {})
                        ).map(([supplierId, group]) => {
                          const groupTotal = group.items.reduce((sum, item) => sum + item.subtotal, 0);
                          return (
                            <div key={supplierId} className="border border-white/10 rounded-xl overflow-hidden bg-surface-container-high/40">
                              {/* Supplier Header */}
                              <div className="px-3 py-2 bg-[#BA7517]/10 border-b border-white/10 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                                  <Icon name="store" className="text-xs text-[#BA7517]" />
                                  {group.supplierName}
                                </span>
                                <span className="text-[11px] font-bold text-primary">Bs {groupTotal.toFixed(2)}</span>
                              </div>
                              
                              {/* Items list */}
                              <div className="divide-y divide-white/5">
                                {group.items.map((item, idx) => {
                                  // Find item index in original flat list
                                  const globalIdx = cartItems.findIndex(
                                    (ci) => ci.idProducto === item.idProducto && ci.idAlmacen === item.idAlmacen
                                  );

                                  const updateQty = (newQty: number) => {
                                    const updated = [...cartItems];
                                    const current = updated[globalIdx];
                                    const validQty = Math.max(current.min, Math.min(current.max, current.stock, newQty));
                                    current.cantidad = validQty;
                                    current.subtotal = validQty * current.precioUnitario;
                                    setCartItems(updated);
                                  };

                                  return (
                                    <div key={idx} className="p-3 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-bold text-on-surface line-clamp-1">{item.nombreProducto}</p>
                                          <p className="text-[9px] text-on-surface-variant font-mono">{item.sku} • {item.nombreAlmacen}</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setCartItems(prev => prev.filter((_, i) => i !== globalIdx))}
                                          className="text-error hover:bg-error/10 p-0.5 rounded transition shrink-0"
                                        >
                                          <Icon name="close" className="text-xs" />
                                        </button>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-1 bg-surface border border-white/5 rounded px-1 py-0.5">
                                          <button
                                            type="button"
                                            onClick={() => updateQty(item.cantidad - 1)}
                                            className="h-4 w-4 rounded hover:bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition"
                                          >
                                            <Icon name="remove" className="text-[10px]" />
                                          </button>
                                          <span className="font-bold w-6 text-center text-xs">{item.cantidad}</span>
                                          <button
                                            type="button"
                                            onClick={() => updateQty(item.cantidad + 1)}
                                            className="h-4 w-4 rounded hover:bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition"
                                          >
                                            <Icon name="add" className="text-[10px]" />
                                          </button>
                                        </div>

                                        <div className="text-right">
                                          <span className="text-[10px] text-on-surface-variant block">Bs {item.precioUnitario.toFixed(2)} c/u</span>
                                          <span className="font-bold text-primary">Bs {item.subtotal.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Supplier Action */}
                              <div className="p-3 bg-surface-container-high border-t border-white/5">
                                <button
                                  type="button"
                                  onClick={() => handlePlaceOrderForSupplier(supplierId, group.items)}
                                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-on-primary transition hover:brightness-110"
                                >
                                  <Icon name="send" className="text-[10px]" />
                                  Realizar Orden (Bs {groupTotal.toFixed(2)})
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                      Gestione y rastree sus ordenes de compra en tiempo real a traves de nuestra red de suministros orquestada. Para crear una nueva orden, diríjase a la pestaña de <strong className="text-primary">Catálogo / Compras</strong>.
                    </p>
                  </div>
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
                                <button 
                                  onClick={() => setSelectedViewOrder(order.raw)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface hover:text-primary" 
                                  aria-label={`Ver ${order.id}`}
                                >
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
                    <p>
                      Mostrando {ordersPage * ordersSize + 1} - {Math.min((ordersPage + 1) * ordersSize, ordersTotalElements)} de {ordersTotalElements} órdenes
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={ordersPage === 0}
                        onClick={() => setOrdersPage(p => Math.max(0, p - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
                      >
                        <Icon name="chevron_left" className="text-base" />
                      </button>

                      {Array.from({ length: ordersTotalPages }).map((_, pageIdx) => (
                        <button 
                          key={pageIdx}
                          onClick={() => setOrdersPage(pageIdx)}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-lg text-xs font-bold transition px-2 ${
                            ordersPage === pageIdx 
                              ? "bg-primary text-on-primary" 
                              : "bg-surface-container-high/20 text-on-surface-variant hover:bg-white/5"
                          }`}
                        >
                          {pageIdx + 1}
                        </button>
                      ))}

                      <button 
                        disabled={ordersPage >= ordersTotalPages - 1}
                        onClick={() => setOrdersPage(p => Math.min(ordersTotalPages - 1, p + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
                      >
                        <Icon name="chevron_right" className="text-base" />
                      </button>
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
                        setSelectedInvoiceForPay(originalInvoice || invoice);
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
        <p>
          Mostrando {invoicesPage * invoicesSize + 1} - {Math.min((invoicesPage + 1) * invoicesSize, invoicesTotalElements)} de {invoicesTotalElements} facturas
        </p>
        <div className="flex items-center gap-2">
          <button 
            disabled={invoicesPage === 0}
            onClick={() => setInvoicesPage(p => Math.max(0, p - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
          >
            <Icon name="chevron_left" className="text-base" />
          </button>

          {Array.from({ length: invoicesTotalPages }).map((_, pageIdx) => (
            <button 
              key={pageIdx}
              onClick={() => setInvoicesPage(pageIdx)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg text-xs font-bold transition px-2 ${
                invoicesPage === pageIdx 
                  ? "bg-primary text-on-primary" 
                  : "bg-surface-container-high/20 text-on-surface-variant hover:bg-white/5"
              }`}
            >
              {pageIdx + 1}
            </button>
          ))}

          <button 
            disabled={invoicesPage >= invoicesTotalPages - 1}
            onClick={() => setInvoicesPage(p => Math.min(invoicesTotalPages - 1, p + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
          >
            <Icon name="chevron_right" className="text-base" />
          </button>
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
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 max-w-sm shrink-0">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Para establecer contratos con precios exclusivos, debe contactarse directamente con los proveedores.
                    </p>
                    <button 
                      onClick={() => setActive("suppliers")}
                      className="text-primary text-xs font-bold hover:underline flex items-center gap-1 mt-1.5"
                    >
                      Ver directorio de Proveedores <Icon name="arrow_forward" className="text-xs" />
                    </button>
                  </div>
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
                    <p>
                      Mostrando {contractsPage * contractsSize + 1} - {Math.min((contractsPage + 1) * contractsSize, contractsTotalElements)} de {contractsTotalElements} contratos
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={contractsPage === 0}
                        onClick={() => setContractsPage(p => Math.max(0, p - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
                      >
                        <Icon name="chevron_left" className="text-base" />
                      </button>

                      {Array.from({ length: contractsTotalPages }).map((_, pageIdx) => (
                        <button 
                          key={pageIdx}
                          onClick={() => setContractsPage(pageIdx)}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-lg text-xs font-bold transition px-2 ${
                            contractsPage === pageIdx 
                              ? "bg-primary text-on-primary" 
                              : "bg-surface-container-high/20 text-on-surface-variant hover:bg-white/5"
                          }`}
                        >
                          {pageIdx + 1}
                        </button>
                      ))}

                      <button 
                        disabled={contractsPage >= contractsTotalPages - 1}
                        onClick={() => setContractsPage(p => Math.min(contractsTotalPages - 1, p + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-surface-container-high/20 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
                      >
                        <Icon name="chevron_right" className="text-base" />
                      </button>
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
                          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Categorías de Producto</p>
                          <div className="flex flex-wrap gap-1.5">
                            {s.categorias.map((cat: string) => (
                              <span key={cat} className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-[#BA7517]/10 text-[#BA7517] border border-[#BA7517]/20">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-auto flex gap-2">
                          <button 
                            onClick={() => handleFetchCatalog(s.id, s.name)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-2.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-on-primary"
                          >
                            <Icon name="menu_book" className="text-sm" />
                            Catálogo
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              toast(`${s.name} - Info de Contacto`, {
                                description: `Email: ${s.raw?.email || s.raw?.idEmpresa?.email || 'contacto@' + s.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'}\nTeléfono: ${s.raw?.telefono || s.raw?.idEmpresa?.telefono || '+591 4 4567890'}`
                              });
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface-container-high text-on-surface-variant hover:text-primary transition shrink-0"
                            title="Ver información de contacto"
                          >
                            <Icon name="contact_mail" className="text-sm" />
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
                          <span className="material-symbols-outlined text-4xl text-primary font-bold">account_circle</span>
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
                            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
      {configuringCartProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-surface-container-high shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl font-semibold">add_shopping_cart</span>
                <span className="font-bold text-on-surface">Agregar al Carrito</span>
              </div>
              <button 
                onClick={() => setConfiguringCartProduct(null)} 
                className="p-1 rounded-lg hover:bg-white/5 text-on-surface-variant transition"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-base text-on-surface">{configuringCartProduct.nombre}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">SKU: {configuringCartProduct.sku} • Proveedor: {configuringCartProduct.supplierName}</p>
              </div>

              {loadingConfigProduct ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-xs text-on-surface-variant font-bold">Consultando inventario...</p>
                </div>
              ) : configProductDetails && configProductDetails.almacenes && configProductDetails.almacenes.length > 0 ? (
                <>
                  {/* Warehouse Selection */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Seleccionar Almacén / Sucursal
                    </label>
                    <select
                      value={selectedConfigWarehouse?.id || ""}
                      onChange={(e) => {
                        const warehouse = configProductDetails.almacenes.find((w: any) => w.id === e.target.value);
                        setSelectedConfigWarehouse(warehouse);
                        setConfigCantidad(warehouse?.cantidadMinima || 1);
                      }}
                      className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs font-bold text-on-surface outline-none transition focus:border-primary"
                    >
                      {configProductDetails.almacenes.map((w: any) => (
                        <option key={w.id} value={w.id}>
                          {w.nombre} (Stock: {w.stock} • Bs {w.precio.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity selector & limits */}
                  {selectedConfigWarehouse && (
                    <div className="grid grid-cols-2 gap-4 border border-white/5 rounded-xl p-3 bg-surface-container-low/40">
                      <div className="space-y-1">
                        <span className="block text-[9px] uppercase font-bold text-on-surface-variant">Límites de compra</span>
                        <p className="text-xs text-on-surface">Min: {selectedConfigWarehouse.cantidadMinima} • Max: {selectedConfigWarehouse.cantidadMaxima}</p>
                        <p className="text-xs text-on-surface">Disponible: {selectedConfigWarehouse.stock} unid.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Cantidad
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfigCantidad(prev => Math.max(selectedConfigWarehouse.cantidadMinima, prev - 1))}
                            className="h-7 w-7 rounded border border-white/10 bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary transition"
                          >
                            <Icon name="remove" className="text-xs" />
                          </button>
                          <input
                            type="number"
                            value={configCantidad}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setConfigCantidad(val);
                            }}
                            onBlur={() => {
                              const val = Math.max(selectedConfigWarehouse.cantidadMinima, Math.min(selectedConfigWarehouse.cantidadMaxima, selectedConfigWarehouse.stock, configCantidad));
                              setConfigCantidad(val);
                            }}
                            className="w-12 text-center text-xs font-bold bg-surface border border-white/10 rounded py-1 outline-none text-on-surface animate-none"
                          />
                          <button
                            type="button"
                            onClick={() => setConfigCantidad(prev => Math.min(selectedConfigWarehouse.stock, selectedConfigWarehouse.cantidadMaxima, prev + 1))}
                            className="h-7 w-7 rounded border border-white/10 bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary transition"
                          >
                            <Icon name="add" className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtotal summary */}
                  {selectedConfigWarehouse && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-on-surface-variant">Subtotal estimado:</span>
                      <span className="text-sm font-bold text-primary">Bs {(selectedConfigWarehouse.precio * configCantidad).toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Icon name="warning" className="text-secondary text-2xl mb-2" />
                  <p className="text-xs text-on-surface-variant font-bold">No hay almacenes ni stock disponible para este producto.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4 bg-surface-container-high shrink-0">
              <button 
                onClick={() => setConfiguringCartProduct(null)} 
                className="rounded-lg border border-white/10 bg-surface px-4 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button 
                disabled={loadingConfigProduct || !selectedConfigWarehouse || configCantidad <= 0}
                onClick={handleConfirmAddToCart} 
                className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-on-primary transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}
      {showBecomeSupplierModal && (
        <BecomeSupplierModal
          onClose={() => setShowBecomeSupplierModal(false)}
          onSuccess={() => {
            setShowBecomeSupplierModal(false);
          }}
          user={user}
        />
      )}
      <StereumPayModal
        isOpen={selectedInvoiceForPay !== null}
        onClose={() => setSelectedInvoiceForPay(null)}
        invoice={selectedInvoiceForPay}
      />
      {selectedViewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                <span className="font-bold text-on-surface">Detalle de la Orden: {selectedViewOrder.id}</span>
              </div>
              <button 
                onClick={() => setSelectedViewOrder(null)} 
                className="p-1 rounded-lg hover:bg-white/5 text-on-surface-variant transition"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Proveedor</p>
                  <p className="font-bold mt-1 text-on-surface">{selectedViewOrder.nombreProveedor || "Proveedor Demo"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Fecha</p>
                  <p className="font-semibold mt-1 text-on-surface">{selectedViewOrder.fecha ? new Date(selectedViewOrder.fecha).toLocaleString() : "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Estado</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary mt-1">
                    {selectedViewOrder.idEstado || selectedViewOrder.status || "pendiente"}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Total General</p>
                  <p className="font-bold text-lg text-primary mt-0.5">Bs {selectedViewOrder.total != null ? Number(selectedViewOrder.total).toFixed(2) : "0.00"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-on-surface-variant mb-2">Productos en esta Orden</p>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-high text-on-surface-variant">
                      <tr>
                        <th className="px-4 py-2 font-bold">Producto</th>
                        <th className="px-4 py-2 font-bold">Cantidad</th>
                        <th className="px-4 py-2 font-bold">Precio Unit.</th>
                        <th className="px-4 py-2 font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-on-surface">
                      {Array.isArray(selectedViewOrder.detalles) && selectedViewOrder.detalles.length > 0 ? (
                        selectedViewOrder.detalles.map((d: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <p className="font-bold">{d.idProducto?.nombre || d.nombreProducto || "Producto ID: " + d.idProducto}</p>
                              {d.idProducto?.sku && <p className="text-[10px] text-on-surface-variant font-mono">{d.idProducto.sku}</p>}
                            </td>
                            <td className="px-4 py-3 font-semibold">{d.cantidad}</td>
                            <td className="px-4 py-3">Bs {Number(d.precioUnitario).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-primary">Bs {Number(d.subtotal).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">
                            No se encontraron detalles para esta orden (o se agregaron usando el formato anterior).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4 bg-surface-container-high">
              <button 
                onClick={() => setSelectedViewOrder(null)} 
                className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition hover:brightness-110"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedCatalogProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-surface-container-high shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl font-semibold">menu_book</span>
                <span className="font-bold text-on-surface">Catálogo de Productos: {selectedCatalogProvider.name}</span>
              </div>
              <button 
                onClick={() => setSelectedCatalogProvider(null)} 
                className="p-1 rounded-lg hover:bg-white/5 text-on-surface-variant transition"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingCatalog ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-on-surface-variant font-bold">Cargando catálogo...</p>
                </div>
              ) : catalogProducts.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2">production_quantity_limits</span>
                  <p className="text-sm text-on-surface-variant font-bold">Este proveedor aún no tiene productos registrados en su catálogo.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    catalogProducts.reduce((groups: { [key: string]: any[] }, product) => {
                      const category = product.nombreCategoria || "Otros";
                      if (!groups[category]) groups[category] = [];
                      groups[category].push(product);
                      return groups;
                    }, {})
                  ).map(([categoryName, products]) => (
                    <div key={categoryName} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <span className="h-2 w-2 rounded-full bg-[#BA7517]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#BA7517]">{categoryName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-on-surface-variant font-bold">{products.length} productos</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {products.map((p: any) => (
                          <div key={p.id} className="p-4 rounded-xl border border-white/5 bg-surface-container-low flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-sm text-on-surface leading-tight">{p.nombre}</p>
                                <span className="shrink-0 text-[9px] font-mono font-bold bg-white/5 text-primary border border-white/10 px-1.5 py-0.5 rounded">
                                  {p.sku}
                                </span>
                              </div>
                              {p.descripcion && (
                                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">{p.descripcion}</p>
                              )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-on-surface-variant">
                              <span className="font-semibold">U. Medida: {p.nombreUnidadMedida || "Unidad"}</span>
                              <span className={`h-1.5 w-1.5 rounded-full ${p.activo ? "bg-tertiary" : "bg-neutral-500"}`} title={p.activo ? "Activo" : "Inactivo"} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4 bg-surface-container-high shrink-0">
              <button 
                onClick={() => setSelectedCatalogProvider(null)} 
                className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition hover:brightness-110"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
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