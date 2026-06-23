import type { ReactNode } from "react";

export function BrandHeader({ subtitle = "" }: { subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-col items-center gap-4">
      <img src="/logo.png" alt="Logo" className="max-h-48 max-w-[480px] w-full object-contain" />
    </div>
  );
}

export function SecurityFooter() {
  return null;
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
