import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { BuyerDashboard } from "../components/BuyerDashboard";
import { SupplierDashboard } from "../components/SupplierDashboard";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard | ProcureSpace" },
      { name: "description", content: "ProcureSpace procurement command center." },
    ],
  }),
  component: AppDashboard,
});

function AppDashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="status-pulse text-[12px] uppercase tracking-widest text-on-surface-variant">
          Authenticating…
        </div>
      </div>
    );
  }

  const dashboardProps = {
    userEmail: user.email,
    onSignOut: () => {
      signOut();
      navigate({ to: "/login" });
    },
  };

  if (user.role === "SUPPLIER") {
    return <SupplierDashboard {...dashboardProps} />;
  }

  return <BuyerDashboard {...dashboardProps} />;
}
