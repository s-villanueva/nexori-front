import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { api } from "../api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperación de Cuenta | Nexori" },
      { name: "description", content: "Recupere su cuenta de Nexori." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      // Hit endpoint as RequestParam (query string)
      await api.post(`/api/v1/auth/password-reset/request?email=${encodeURIComponent(email.trim())}`, {});
      
      toast.success("Código enviado al correo");
      sessionStorage.setItem("reset_email", email.trim());
      
      // Redirect to confirmation screen
      navigate({ to: "/reset-password" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al solicitar la recuperación. Verifique su correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell maxWidth={480}>
      <BrandHeader />

      <div className="glass-panel relative w-full rounded-xl p-8 shadow-2xl text-left bg-white border border-[#CBD6D4]">
        <header className="mb-6">
          <h2 className="font-display text-2xl font-bold text-[#122A25]">Recuperar Contraseña</h2>
          <p className="mt-1.5 text-xs text-[#3B534E] leading-relaxed">
            Ingrese su correo electrónico institucional registrado para recibir un código de confirmación.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="ps-label font-bold text-xs uppercase tracking-wider text-[#3B534E]">Correo Electrónico</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#3B534E]">
                mail
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="ps-input pl-11 w-full"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="ps-btn-primary w-full flex items-center justify-center gap-2">
            <span>{loading ? "Enviando..." : "Enviar Código"}</span>
            <span className="material-symbols-outlined text-[20px]">
              mail_lock
            </span>
          </button>
        </form>

        <div className="mt-6 flex justify-center border-t border-neutral-100 pt-4">
          <Link to="/" search={{ login: "true" }} className="group flex items-center gap-1.5 text-[12px] text-[#3B534E] font-semibold hover:text-[#0F6E56] transition-colors">
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            Volver a Iniciar Sesión
          </Link>
        </div>
      </div>

      <SecurityFooter />
    </AuthShell>
  );
}
