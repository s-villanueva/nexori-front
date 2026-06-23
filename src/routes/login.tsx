import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In | ProcureSpace" },
      { name: "description", content: "Sign in to the ProcureSpace enterprise procurement portal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
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
      navigate({ to: "/app" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell maxWidth={440}>
      <BrandHeader />

      <div className="glass-panel relative w-full overflow-hidden rounded-xl p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-[60px]" />

        <div className="mb-5 flex items-center justify-between rounded-lg border border-white/5 bg-surface-container-low p-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">Authenticating as</span>
            <span className="font-medium text-on-surface">{email}</span>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-white/5"
            onClick={() => {
              const next = window.prompt("Edit email", email);
              if (next) setEmail(next);
            }}
            aria-label="Edit email"
          >
            <span className="material-symbols-outlined">edit_square</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="ps-label">Secure Password</label>
            <div className="relative flex items-center rounded-lg border border-outline-variant bg-surface-container-highest/50 transition-all focus-within:border-primary focus-within:shadow-[0_0_0_1px_var(--primary)]">
              <span
                className="material-symbols-outlined absolute left-3 text-on-surface-variant"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border-none bg-transparent py-4 pl-12 pr-12 text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-0"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 text-on-surface-variant transition-colors hover:text-on-surface"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">{showPw ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <Link to="/forgot-password" className="text-[12px] font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
            <div className="flex items-center gap-2">
              <div className="status-pulse h-2 w-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.5)]" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant">
                Encrypted Link Active
              </span>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="ps-btn-primary">
            <span>{submitting ? "Signing in…" : "Sign In"}</span>
            {!submitting && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-grow bg-outline-variant/30" />
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Or security preference</span>
            <div className="h-px flex-grow bg-outline-variant/30" />
          </div>

          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("2fa_email", email);
              sessionStorage.setItem("2fa_password", password);
              navigate({ to: "/verify" });
            }}
            className="ps-btn-ghost w-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">passkey</span>
            <span>Try another way (TOTP / SSO)</span>
          </button>

          <p className="text-center text-[12px] text-on-surface-variant">
            New to ProcureSpace?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Request access
            </Link>
          </p>
        </form>
      </div>

      <SecurityFooter />
    </AuthShell>
  );
}
