import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { OtpInput } from "../components/otp-input";
import { Role, useAuth } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify Identity | Nexori" },
      { name: "description", content: "Two-factor verification for your Nexori account." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { signIn2FA } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? sessionStorage.getItem("2fa_email") || "" : ""
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || code.length !== 6) return;
    setSubmitting(true);
    try {
      const savedEmail = sessionStorage.getItem("2fa_email") || email.trim();
      
      await signIn2FA(savedEmail, code);
      toast.success("Successfully authenticated with 2FA!");
      navigate({ to: "/app" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to verify 2FA code. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell maxWidth={480}>
      <BrandHeader />

      <form onSubmit={onSubmit} className="glass-card flex w-full flex-col gap-6 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-surface-container-highest">
            <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_person
            </span>
          </div>
          <span className="text-on-surface font-semibold">Verificación Requerida</span>
        </div>

        {/* Email Input (Styled like login form) */}
        <div className="flex flex-col gap-2 text-left">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#3B534E] ml-1">Correo Electrónico</label>
          <div className="relative flex items-center rounded-xl border border-[#CBD6D4] bg-[#EAEFEF]/50 transition-all focus-within:border-[#0F6E56] focus-within:ring-2 focus-within:ring-[#0F6E56]/20">
            <span className="material-symbols-outlined absolute left-3 text-[#3B534E]" style={{ fontVariationSettings: "'FILL' 1" }}>
              mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                sessionStorage.setItem("2fa_email", e.target.value);
              }}
              placeholder="alex.vanguard@enterprise.com"
              className="w-full border-none bg-transparent py-3.5 pl-12 pr-4 text-sm text-[#122A25] placeholder:text-[#3B534E]/30 focus:outline-none focus:ring-0"
              required
            />
          </div>
        </div>

        {/* Authentication Code (Restored custom boxes) */}
        <div className="flex flex-col gap-3">
          <label className="ps-label ml-1">Código de Autenticación</label>
          <OtpInput length={6} value={code} onChange={setCode} />
          <p className="mt-1 text-center text-[12px] text-on-surface-variant">
            Introduce el código de 6 dígitos de tu aplicación de autenticación.
          </p>
        </div>

        <button type="submit" disabled={!email.trim() || code.length !== 6 || submitting} className="ps-btn-primary">
          {submitting ? "Verificando…" : "Verificar"}
        </button>

        <div className="pt-1 text-center">
          <Link to="/login" className="border-b border-primary/20 pb-1 text-[12px] font-semibold text-primary transition-colors hover:text-on-primary-container">
            Try another way
          </Link>
        </div>
      </form>

      <SecurityFooter />
    </AuthShell>
  );
}
