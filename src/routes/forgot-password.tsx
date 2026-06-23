import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Account Recovery | ProcureSpace" },
      { name: "description", content: "Recover your ProcureSpace account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setTimeout(() => navigate({ to: "/reset-password" }), 900);
  };

  return (
    <AuthShell maxWidth={480}>
      <BrandHeader subtitle="Enterprise Tier Security" />

      <div className="glass-panel relative w-full rounded-xl p-8 shadow-2xl">
        <div className="absolute right-0 top-0 h-12 w-12 rounded-tr-xl border-r-2 border-t-2 border-primary/20" />

        <header className="mb-6">
          <h2 className="font-display text-2xl font-semibold text-on-surface">Account Recovery</h2>
          <p className="mt-1 text-on-surface-variant">
            Enter your work email to receive a 6-digit recovery code.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="ps-label" style={{ color: "var(--primary)" }}>Work Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                mail
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="ps-input pl-11"
              />
            </div>
          </div>

          <button type="submit" disabled={sent} className="ps-btn-primary">
            <span>{sent ? "Code Sent" : "Send Code"}</span>
            <span className="material-symbols-outlined text-[20px]">
              {sent ? "check_circle" : "arrow_forward"}
            </span>
          </button>
        </form>

        <div className="mt-6 flex justify-center border-t border-white/5 pt-4">
          <Link to="/login" className="group flex items-center gap-1 text-[12px] text-on-surface-variant transition-colors hover:text-primary">
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            Back to Sign In
          </Link>
        </div>
      </div>

      <SecurityFooter />
    </AuthShell>
  );
}
