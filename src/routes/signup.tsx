import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { useAuth } from "../lib/auth";
import { api } from "../api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Corporate Onboarding | ProcureSpace" },
      { name: "description", content: "Request access to ProcureSpace — enterprise orchestration portal." },
    ],
  }),
  component: SignupPage,
});

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 12) s += 2;
  else if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(s, 5);
}

function SignupPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
    branch: "",
    role: "BUYER",
    terms: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const score = useMemo(() => scorePassword(form.password), [form.password]);
  const meter = [
    { w: "10%", color: "var(--error)", label: "Weak" },
    { w: "25%", color: "var(--error)", label: "Weak" },
    { w: "50%", color: "#f5b748", label: "Fair" },
    { w: "70%", color: "var(--tertiary)", label: "Strong" },
    { w: "90%", color: "var(--tertiary)", label: "Strong" },
    { w: "100%", color: "var(--primary)", label: "Excellent" },
  ][score];

  const canSubmit = form.name && form.email && form.password.length >= 12 && form.company && form.branch && form.terms && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("El registro de usuarios aún no está disponible (Endpoint de registro pendiente de implementación en el servidor).");
  };

  return (
    <AuthShell maxWidth={560}>
      <div className="glass-card w-full rounded-xl p-6 md:p-8 shadow-2xl">
        <header className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.png" alt="Logo" className="max-h-14 max-w-[240px] object-contain rounded-lg" />
          <h2 className="text-lg text-on-surface font-semibold mt-1">Corporate Onboarding</h2>
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">
            Enterprise Orchestration Portal
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Name">
              <input className="ps-input" placeholder="John Doe" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Institutional Email">
              <input className="ps-input" type="email" placeholder="j.doe@company.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
          </div>

          <Field label="Password">
            <div className="relative">
              <input
                className="ps-input pr-10"
                type={showPw ? "text" : "password"}
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">{showPw ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-variant">
              <div className="h-full transition-all duration-500"
                style={{ width: meter.w, background: meter.color }} />
            </div>
            <p className="mt-1 flex justify-between text-[10px] font-medium text-on-surface-variant">
              <span>Min. 12 characters</span>
              <span style={{ color: meter.color }} className="uppercase">Security: {meter.label}</span>
            </p>
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Empresa">
              <select className="ps-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required>
                <option value="">Select Company</option>
                <option value="nova">Nova Corp International</option>
                <option value="zenith">Zenith Logistics SA</option>
                <option value="atlas">Atlas Manufacturing</option>
              </select>
            </Field>
            <Field label="Sucursal">
              <select className="ps-input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required>
                <option value="">Select Branch</option>
                <option value="hq">Global Headquarters</option>
                <option value="eu">EU Regional Office</option>
                <option value="apac">APAC Distribution</option>
              </select>
            </Field>
          </div>

          <Field label="Rol de Usuario">
            <select className="ps-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="BUYER">BUYER — Purchasing Operations</option>
              <option value="SUPPLIER">SUPPLIER — Inventory Management</option>
              <option value="ADMIN">ADMIN — System Governance</option>
            </select>
          </Field>

          <label className="mt-1 flex items-start gap-2 text-[12px] text-on-surface-variant">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-white/10 bg-surface-variant text-primary focus:ring-primary"
              checked={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.checked })}
            />
            <span>
              I accept the ProcureSpace <a href="#" className="text-primary hover:underline">Enterprise Terms</a> and{" "}
              <a href="#" className="text-primary hover:underline">Data Processing Agreement</a>.
            </span>
          </label>

          <button type="submit" disabled={!canSubmit} className="ps-btn-primary mt-2">
            <span>Provision Account</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>

          <p className="text-center text-[12px] text-on-surface-variant">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>

      <SecurityFooter />
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="ps-label px-1">{label}</label>
      {children}
    </div>
  );
}
