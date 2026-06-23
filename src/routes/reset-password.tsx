import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | ProcureSpace" },
      { name: "description", content: "Set a new ProcureSpace account password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);

  const checks = useMemo(() => ({
    len: pw.length >= 8,
    sym: /[^A-Za-z0-9]/.test(pw),
    num: /\d/.test(pw),
    case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  }), [pw]);
  const passed = Object.values(checks).filter(Boolean).length;
  const strength = passed <= 1 ? { w: "25%", color: "var(--error)", label: "Weak" }
    : passed === 2 ? { w: "50%", color: "#f5b748", label: "Moderate" }
    : passed === 3 ? { w: "75%", color: "var(--tertiary)", label: "Strong" }
    : { w: "100%", color: "var(--primary)", label: "Excellent" };

  const ok = pw && pw === confirm && passed >= 3;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    navigate({ to: "/login" });
  };

  return (
    <AuthShell maxWidth={520}>
      <BrandHeader subtitle="Secure Payment Orchestration" />

      <div className="glass-panel flex w-full flex-col items-center rounded-xl p-8 text-center shadow-2xl">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-bold text-on-surface">Reset Your Password</h2>
          <p className="mt-2 px-4 text-on-surface-variant">
            Create a new, strong password for your account to ensure continued vault security.
          </p>
        </div>

        <form onSubmit={onSubmit} className="w-full space-y-5 text-left">
          <PwField label="New Password" id="new_password" value={pw} setValue={setPw} show={showA} setShow={setShowA} placeholder="Enter new password" />

          <div className="rounded-lg border border-white/5 bg-surface-container-lowest p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">Security Strength</span>
              <span className="text-[12px] font-semibold uppercase" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div className="h-full transition-all duration-500"
                style={{ width: strength.w, background: strength.color, boxShadow: `0 0 8px ${strength.color}` }} />
            </div>
            <ul className="grid grid-cols-2 gap-2 text-[12px]">
              <Check ok={checks.len} text="8+ characters" />
              <Check ok={checks.sym} text="One symbol" />
              <Check ok={checks.num} text="One number" />
              <Check ok={checks.case} text="Upper/Lower" />
            </ul>
          </div>

          <PwField label="Confirm New Password" id="confirm_password" value={confirm} setValue={setConfirm} show={showB} setShow={setShowB} placeholder="Re-enter password" />

          {confirm && pw !== confirm && (
            <p className="text-[12px] text-error">Passwords do not match.</p>
          )}

          <button type="submit" disabled={!ok} className="ps-btn-primary">
            <span>Update Password</span>
            <span className="material-symbols-outlined text-[20px]">lock_reset</span>
          </button>
        </form>

        <Link to="/login" className="mt-5 flex items-center gap-1 text-[12px] text-on-surface-variant transition-colors hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Cancel and return to sign in
        </Link>
      </div>

      <SecurityFooter />
    </AuthShell>
  );
}

function PwField({ label, id, value, setValue, show, setShow, placeholder }: {
  label: string; id: string; value: string; setValue: (v: string) => void;
  show: boolean; setShow: (v: boolean) => void; placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ps-label ml-1" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="ps-input pr-10"
          placeholder={placeholder}
        />
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined">{show ? "visibility_off" : "visibility"}</span>
        </button>
      </div>
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-1.5" style={{ color: ok ? "var(--tertiary)" : "var(--on-surface-variant)" }}>
      <span className="material-symbols-outlined text-[16px]">{ok ? "check_circle" : "circle"}</span>
      {text}
    </li>
  );
}
