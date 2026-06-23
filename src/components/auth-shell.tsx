import type { ReactNode } from "react";

export function BrandHeader({ subtitle = "Enterprise Secure Gateway" }: { subtitle?: string }) {
  return (
    <div className="mb-10 flex flex-col items-center gap-4">
<img src="/logo.png" alt="Logo" className="max-h-48 max-w-[480px] w-full object-contain" />
      <div className="mt-1 flex items-center gap-2">
        <span className="status-pulse h-2 w-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">{subtitle}</span>
      </div>
    </div>
  );
}

export function SecurityFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 opacity-70">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-bold text-on-surface">AES-256</span>
            <span className="text-[10px] text-on-surface-variant">Encrypted</span>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_good</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-bold text-on-surface">ISO 27001</span>
            <span className="text-[10px] text-on-surface-variant">Certified</span>
          </div>
        </div>
      </div>
      <p className="max-w-[320px] text-center text-[11px] leading-relaxed text-on-surface-variant/70">
        Your connection to ProcureSpace is end-to-end encrypted. Standard corporate session policies apply.
      </p>
    </footer>
  );
}

export function AuthShell({ children, maxWidth = 480 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <main style={{ maxWidth }} className="relative z-10 flex w-full flex-col items-center">
        {children}
      </main>
      <footer className="pointer-events-none absolute bottom-4 left-0 flex w-full justify-between px-6 text-[10px] text-on-surface-variant/40">
        <span>SECURE NODE: 0x82…F2</span>
        <span>ORCHESTRATION: V4.2.1</span>
      </footer>
    </div>
  );
}
