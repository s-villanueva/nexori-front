import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexori — Enterprise B2B Procurement Orchestration" },
      { name: "description", content: "Smart B2B procurement platform with automated tariff contracts and real-time order tracking." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [showLogin, setShowLogin] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("login") === "true";
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-[#EAEFEF] text-[#122A25] font-sans selection:bg-[#BA7517] selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-[#EAEFEF]/80 backdrop-blur-md border-b border-[#CBD6D4] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-[#CBD6D4]/50">
            <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F6E56] font-bold border-l border-[#CBD6D4] pl-2">Portal</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#3B534E]">
            <a href="#caracteristicas" className="hover:text-[#0F6E56] transition-colors">Características</a>
            <a href="#compradores" className="hover:text-[#0F6E56] transition-colors">Para Compradores</a>
            <a href="#proveedores" className="hover:text-[#0F6E56] transition-colors">Para Proveedores</a>
          </nav>

          <button
            onClick={() => setShowLogin(true)}
            className="rounded-full bg-[#0F6E56] hover:bg-[#0A4A3A] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:scale-105 cursor-pointer shadow-sm"
          >
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <span className="inline-block text-[10px] uppercase tracking-[0.25em] bg-[#E6F3F0] text-[#0F6E56] border border-[#0F6E56]/20 px-3 py-1 rounded-full font-bold">
              B2B Enterprise Procurement
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#122A25] font-display leading-[1.1]">
              Orquestación de Compras B2B <span className="text-[#0F6E56]">Inteligentes</span>
            </h1>
            <p className="text-base md:text-lg text-[#3B534E] leading-relaxed max-w-xl">
              Firme contratos de tarifas corporativas, defina tramos y reglas de comisión dinámicas, y autorice órdenes de compra en tiempo real mediante tecnología segura de grado financiero.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setShowLogin(true)}
                className="rounded-xl bg-[#BA7517] hover:bg-[#A36310] px-8 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:scale-105 cursor-pointer shadow-md"
              >
                Comenzar ahora
              </button>
              <a
                href="#caracteristicas"
                className="rounded-xl border border-[#CBD6D4] hover:border-[#0F6E56] px-8 py-4 text-xs font-bold uppercase tracking-wider text-[#3B534E] hover:text-[#0F6E56] transition cursor-pointer text-center bg-white/40"
              >
                Ver características
              </a>
            </div>
          </div>

          {/* Visual Showcase */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#0F6E56]/10 to-[#BA7517]/10 rounded-3xl blur-2xl" />
            <div className="relative bg-white border border-[#CBD6D4] p-6 rounded-3xl shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3B534E]/60">CONTRATO DE TARIFA B2B</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#E6F3F0] p-4 rounded-2xl border border-[#0F6E56]/10">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F6E56]">Empresa Compradora</p>
                    <p className="text-sm font-bold text-[#122A25] mt-0.5">Empresa Retail SA</p>
                  </div>
                  <span className="material-symbols-outlined text-2xl text-[#0F6E56]">swap_horiz</span>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F6E56]">Proveedor de Red</p>
                    <p className="text-sm font-bold text-[#122A25] mt-0.5">Distribuidora Global SRL</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#EAEFEF] p-3 rounded-xl border border-[#CBD6D4]/50">
                    <p className="font-semibold text-[#3B534E]">Regla de Comisión</p>
                    <p className="text-[#122A25] font-bold mt-1">Tramo de Volumen A</p>
                  </div>
                  <div className="bg-[#EAEFEF] p-3 rounded-xl border border-[#CBD6D4]/50">
                    <p className="font-semibold text-[#3B534E]">Tasa de Descuento</p>
                    <p className="text-[#0F6E56] font-bold mt-1">15.0% Activo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="caracteristicas" className="py-20 px-6 bg-white border-t border-[#CBD6D4]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold font-display text-[#122A25]">
              Una consola empresarial unificada
            </h2>
            <p className="text-[#3B534E] text-sm md:text-base leading-relaxed">
              Nexori conecta de forma segura a compradores y vendedores de la industria B2B con herramientas optimizadas para la gestión y firma contractual.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "description", title: "Contratos de Tarifa B2B", desc: "Gestione acuerdos comerciales multivariantes, supervise vigencias y firme digitalmente con un solo clic." },
              { icon: "rule", title: "Reglas de Comisión", desc: "Defina tramos dinámicos de volumen de compra, aplicando porcentajes de descuento automáticos en tiempo real." },
              { icon: "security", title: "Autenticación 2FA TOTP", desc: "Asegure el acceso y la firma de contratos mediante códigos cifrados temporales en su aplicación preferida." },
              { icon: "receipt_long", title: "Órdenes de Compra", desc: "Emita, acepte o rechace solicitudes de compra al instante. Se integra con los límites definidos en sus contratos." },
              { icon: "inventory_2", title: "Stock y Almacenes", desc: "Los proveedores pueden coordinar la disponibilidad del stock directamente por sucursal o almacén logístico." },
              { icon: "payments", title: "Pagos de Tarifa Plana", desc: "Autorice transacciones y supervise la facturación con resúmenes claros de tasas de cumplimiento comercial." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-6 rounded-3xl border border-[#CBD6D4]/60 bg-[#EAEFEF]/30 hover:border-[#0F6E56]/40 transition text-left space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F6E56]/10 text-[#0F6E56]">
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <h3 className="text-lg font-bold text-[#122A25]">{title}</h3>
                <p className="text-[#3B534E] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-[#122A25] text-white py-16 px-6 text-center space-y-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold font-display">¿Listo para optimizar el canal de compras de tu empresa?</h2>
          <p className="text-white/70 max-w-xl mx-auto text-sm">Pruebe las herramientas integradas para firmar acuerdos, despachar órdenes de stock y aumentar la confianza de su red de distribución.</p>
        </div>
        <button
          onClick={() => setShowLogin(true)}
          className="rounded-xl bg-[#BA7517] hover:bg-[#A36310] px-8 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:scale-105 cursor-pointer shadow-md inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">login</span>
          Entrar al Command Center
        </button>
        <p className="text-xs text-white/40 pt-8 border-t border-white/10">© 2026 Nexori Inc. Todos los derechos reservados. Seguridad TLS y cifrado AES-256 activo.</p>
      </footer>

      {/* Floating Login Modal */}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
    </div>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("alex.vanguard@enterprise.com");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Successfully authenticated!");
      onClose();
      navigate({ to: "/app" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-[#CBD6D4] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3B534E]/60 hover:text-[#122A25] p-2 rounded-full hover:bg-neutral-100 transition cursor-pointer"
          aria-label="Cerrar modal"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="text-center space-y-4">
          <img src="/logo.png" alt="Logo" className="h-12 object-contain mx-auto" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#3B534E] ml-1">Correo Electrónico</label>
            <div className="relative flex items-center rounded-xl border border-[#CBD6D4] bg-[#EAEFEF]/50 transition-all focus-within:border-[#0F6E56] focus-within:ring-2 focus-within:ring-[#0F6E56]/20">
              <span className="material-symbols-outlined absolute left-3 text-[#3B534E]" style={{ fontVariationSettings: "'FILL' 1" }}>
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.vanguard@enterprise.com"
                className="w-full border-none bg-transparent py-3.5 pl-12 pr-4 text-sm text-[#122A25] placeholder:text-[#3B534E]/30 focus:outline-none focus:ring-0"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#3B534E] ml-1">Contraseña Segura</label>
            <div className="relative flex items-center rounded-xl border border-[#CBD6D4] bg-[#EAEFEF]/50 transition-all focus-within:border-[#0F6E56] focus-within:ring-2 focus-within:ring-[#0F6E56]/20">
              <span className="material-symbols-outlined absolute left-3 text-[#3B534E]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border-none bg-transparent py-3.5 pl-12 pr-12 text-sm text-[#122A25] placeholder:text-[#3B534E]/30 focus:outline-none focus:ring-0"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 text-[#3B534E] transition-colors hover:text-[#122A25]"
              >
                <span className="material-symbols-outlined">{showPw ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <Link to="/forgot-password" onClick={onClose} className="font-semibold text-[#0F6E56] hover:underline">
              ¿Olvidó su contraseña?
            </Link>
          </div>

          <button type="submit" disabled={submitting} className="rounded-xl bg-[#0F6E56] hover:bg-[#0A4A3A] py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md">
            <span>{submitting ? "Iniciando sesión…" : "Iniciar Sesión"}</span>
            {!submitting && <span className="material-symbols-outlined text-base">arrow_forward</span>}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-grow bg-[#CBD6D4]/60" />
            <span className="text-[9px] uppercase tracking-widest text-[#3B534E]">O preferencia de seguridad</span>
            <div className="h-px flex-grow bg-[#CBD6D4]/60" />
          </div>

          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("2fa_email", email);
              sessionStorage.setItem("2fa_password", password);
              onClose();
              navigate({ to: "/verify" });
            }}
            className="rounded-xl border border-[#CBD6D4] hover:border-[#0F6E56] py-3.5 text-xs font-semibold text-[#3B534E] hover:text-[#0F6E56] transition flex items-center justify-center gap-2 cursor-pointer bg-white"
          >
            <span className="material-symbols-outlined text-lg">passkey</span>
            <span>Clave de verificación (TOTP / SSO)</span>
          </button>

          <p className="text-center text-xs text-[#3B534E]/80">
            ¿Nuevo en Nexori?{" "}
            <Link to="/signup" onClick={onClose} className="font-semibold text-[#0F6E56] hover:underline">
              Solicitar Acceso
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
