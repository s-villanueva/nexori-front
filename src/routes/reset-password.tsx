import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { api } from "../api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer Contraseña | Nexori" },
      { name: "description", content: "Establecer una nueva contraseña de cuenta Nexori." },
    ],
  }),
  component: ResetPasswordPage,
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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [loading, setLoading] = useState(false);

  // Retrieve email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmail(sessionStorage.getItem("reset_email") || "");
    }
  }, []);

  const checks = useMemo(() => ({
    len: pw.length >= 8,
    sym: /[^A-Za-z0-9]/.test(pw),
    num: /\d/.test(pw),
    case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  }), [pw]);
  
  const passed = Object.values(checks).filter(Boolean).length;
  const strength = passed <= 1 ? { w: "25%", color: "var(--error)", label: "Débil" }
    : passed === 2 ? { w: "50%", color: "#f5b748", label: "Moderada" }
    : passed === 3 ? { w: "75%", color: "var(--tertiary)", label: "Fuerte" }
    : { w: "100%", color: "var(--primary)", label: "Excelente" };

  const ok = email && code.trim() && pw && pw === confirm && passed >= 3 && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    setLoading(true);

    try {
      // Hit endpoint as RequestParam (query string)
      await api.post(
        `/api/v1/auth/password-reset/confirm?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code.trim())}&newPassword=${encodeURIComponent(pw)}`,
        {}
      );

      toast.success("Contraseña actualizada correctamente");
      sessionStorage.removeItem("reset_email");
      
      // Redirect to landing page with login modal triggered
      window.location.href = "/?login=true";
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al actualizar la contraseña. Verifique el código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell maxWidth={520}>
      <BrandHeader />

      <div className="glass-panel flex w-full flex-col items-center rounded-xl p-8 text-center shadow-2xl bg-white border border-[#CBD6D4]">
        <div className="mb-6 text-left w-full">
          <h2 className="font-display text-2xl font-bold text-[#122A25]">Restablecer Contraseña</h2>
          <p className="mt-1.5 text-xs text-[#3B534E] leading-relaxed">
            Ingrese el código de recuperación enviado a su correo y establezca su nueva contraseña.
          </p>
        </div>

        <form onSubmit={onSubmit} className="w-full space-y-5 text-left">
          {/* Email input (read-only or changeable if empty) */}
          <div className="space-y-1.5">
            <label className="ps-label font-bold text-xs uppercase tracking-wide text-[#3B534E]" htmlFor="email_reset">Correo Electrónico</label>
            <input
              id="email_reset"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ps-input w-full"
              placeholder="usuario@empresa.com"
              required
            />
          </div>

          {/* Recovery Code */}
          <div className="space-y-1.5">
            <label className="ps-label font-bold text-xs uppercase tracking-wide text-[#3B534E]" htmlFor="code_reset">Código de Confirmación</label>
            <input
              id="code_reset"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="ps-input w-full tracking-widest text-center font-bold text-sm"
              placeholder="Ingrese el código"
              required
            />
          </div>

          <PwField label="Nueva Contraseña" id="new_password" value={pw} setValue={setPw} show={showA} setShow={setShowA} placeholder="Mínimo 8 caracteres" />

          <div className="rounded-xl border border-[#CBD6D4]/60 bg-[#EAEFEF]/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-[#3B534E] font-semibold">Fortaleza de Seguridad</span>
              <span className="text-[11px] font-bold uppercase" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full transition-all duration-500"
                style={{ width: strength.w, background: strength.color }} />
            </div>
            <ul className="grid grid-cols-2 gap-2 text-[11px]">
              <Check ok={checks.len} text="8+ caracteres" />
              <Check ok={checks.sym} text="Un símbolo (e.g. @, !)" />
              <Check ok={checks.num} text="Un número" />
              <Check ok={checks.case} text="Mayús. y Minús." />
            </ul>
          </div>

          <PwField label="Confirmar Nueva Contraseña" id="confirm_password" value={confirm} setValue={setConfirm} show={showB} setShow={setShowB} placeholder="Repita la contraseña" />

          {confirm && pw !== confirm && (
            <p className="text-[11px] font-bold text-red-600">Las contraseñas no coinciden.</p>
          )}

          <button type="submit" disabled={!ok} className="ps-btn-primary w-full flex items-center justify-center gap-2">
            <span>{loading ? "Actualizando..." : "Actualizar Contraseña"}</span>
            <span className="material-symbols-outlined text-[20px]">lock_reset</span>
          </button>
        </form>

        <Link to="/" search={{ login: "true" }} className="mt-5 flex items-center gap-1.5 text-[12px] text-[#3B534E] font-semibold hover:text-[#0F6E56] transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Cancelar y volver a iniciar sesión
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
      <label className="ps-label font-bold text-xs uppercase tracking-wide text-[#3B534E]" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="ps-input pr-10 w-full"
          placeholder={placeholder}
          required
        />
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3B534E] hover:text-[#122A25]">
          <span className="material-symbols-outlined text-[20px]">{show ? "visibility_off" : "visibility"}</span>
        </button>
      </div>
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-1.5" style={{ color: ok ? "#0F6E56" : "#3B534E" }}>
      <span className="material-symbols-outlined text-[15px]">{ok ? "check_circle" : "circle"}</span>
      <span className={ok ? "font-bold text-[#0F6E56]" : "opacity-85"}>{text}</span>
    </li>
  );
}
