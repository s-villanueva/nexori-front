import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In | Nexori" },
      { name: "description", content: "Sign in to the Nexori enterprise procurement portal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  useEffect(() => {
    window.location.href = "/?login=true";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EAEFEF]">
      <div className="status-pulse text-[12px] uppercase tracking-widest text-[#0F6E56]">
        Redirecting to Nexori secure gateway...
      </div>
    </div>
  );
}
