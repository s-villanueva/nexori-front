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
    typeof window !== "undefined" ? sessionStorage.getItem("2fa_email") || "alex.vanguard@enterprise.com" : "alex.vanguard@enterprise.com"
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      const savedEmail = sessionStorage.getItem("2fa_email") || email;
      
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
          <span className="text-on-surface">Verification Required</span>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="text-[12px] text-on-surface-variant">{email}</span>
            <button
              type="button"
              className="text-primary hover:text-primary/80 transition-colors flex items-center"
              onClick={() => {
                const next = window.prompt("Editar email de verificación:", email);
                if (next) {
                  setEmail(next);
                  sessionStorage.setItem("2fa_email", next);
                }
              }}
              aria-label="Edit email"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">edit</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="ps-label ml-1">Authentication Code</label>
          <OtpInput length={6} value={code} onChange={setCode} />
          <p className="mt-1 text-center text-[12px] text-on-surface-variant">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <button type="submit" disabled={code.length !== 6 || submitting} className="ps-btn-primary">
          {submitting ? "Verifying…" : "Verify"}
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
