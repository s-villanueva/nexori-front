import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setToken, decodeJwt } from "../api/client.ts";

export type Role = "BUYER" | "SUPPLIER" | "ADMIN";

export interface User {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  role: Role;
  id_empresa?: string;
  id_sucursal?: string;
  nombreEmpresa?: string;
  idProveedor?: string | null;
}

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<User>;
  signIn2FA: (data: string, code: string) => Promise<User>;
  signOut: () => void;
};

const AuthCtx = createContext<AuthState | null>(null);

export async function buildSession(token: string): Promise<User> {
  const payload = decodeJwt(token);
  const userId = payload?.jti || payload?.sub;

  if (!userId) {
    throw new Error("Invalid token: user identifier not found.");
  }

  const params = new URLSearchParams({ uId: userId.toString() }).toString();
  // Fetch user information from the API
  const usuario = await api.get(`/api/v1/usuarios/user-info?${params}`);
  
  if (!usuario) {
    throw new Error("Usuario no encontrado en el sistema.");
  }

  console.log("Usuario info loaded:", usuario);

  const esAdmin = usuario.nombreRol?.toLowerCase() === "admin";
  const esProveedor = usuario.nombreRol?.toLowerCase() === "proveedor";

  const mappedRole: Role = esAdmin ? "ADMIN" : esProveedor ? "SUPPLIER" : "BUYER";

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    activo: usuario.activo,
    role: mappedRole,
    id_empresa: usuario.idEmpresa?.id,
    id_sucursal: usuario.idSucursal?.id,
    nombreEmpresa: usuario.idEmpresa?.nombre,
    idProveedor: usuario.idProveedor?.id || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const token = localStorage.getItem("b2b_token");
        const storedUser = localStorage.getItem("b2b_user");
        
        if (token && storedUser) {
          const payload = decodeJwt(token);
          // Check if token has not expired
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser(JSON.parse(storedUser));
          } else {
            // Clean up expired session
            setToken(null);
            localStorage.removeItem("b2b_user");
          }
        }
      } catch (err) {
        console.error("Failed to initialize authentication", err);
        setToken(null);
        localStorage.removeItem("b2b_user");
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (email: string, password = "") => {
        // 1. Post to login endpoint
        const response = await api.post("/api/v1/auth/login", { email, password });
        // Expected response format: { access_token: string }
        const token = response?.access_token || response?.token || response?.jwt || response?.accessToken;
        if (!token) {
          throw new Error("No token returned from server.");
        }

        // 2. Save the token
        setToken(token);

        // 3. Build session details
        const sessionData = await buildSession(token);

        // 4. Save session and update state
        localStorage.setItem("b2b_user", JSON.stringify(sessionData));
        setUser(sessionData);
        return sessionData;
      },
      signIn2FA: async (data: string, code: string) => {
        // 1. Post to login/2fa endpoint
        const response = await api.post("/api/v1/auth/login/2fa", { data, code });
        // Expected response format: { access_token: string }
        const token = response?.access_token || response?.token || response?.jwt || response?.accessToken;
        if (!token) {
          throw new Error("No token returned from server.");
        }

        // 2. Save the token
        setToken(token);

        // 3. Build session details
        const sessionData = await buildSession(token);

        // 4. Save session and update state
        localStorage.setItem("b2b_user", JSON.stringify(sessionData));
        setUser(sessionData);
        return sessionData;
      },
      signOut: () => {
        setToken(null);
        localStorage.removeItem("b2b_user");
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

