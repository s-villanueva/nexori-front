import { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, decodeJwt } from './api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('b2b_token')
    const stored = localStorage.getItem('b2b_user')
    if (token && stored) {
      try {
        const payload = decodeJwt(token)
        console.log("Decoded JWT payload:", payload)
        if (payload && payload.exp * 1000 > Date.now()) {
          setSession(JSON.parse(stored))
        } else {
          setToken(null)
          localStorage.removeItem('b2b_user')
        }
      } catch {
        setToken(null)
        localStorage.removeItem('b2b_user')
      }
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    localStorage.setItem('b2b_user', JSON.stringify(userData))
    setSession(userData)
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('b2b_user')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export async function buildSession(token) {
  const payload = decodeJwt(token)
  const userId = payload?.jti

  const params = new URLSearchParams({ uId: userId }).toString()
  const [usuario_info, proveedores] = await Promise.all([
    api.get(`/api/v1/usuarios/user-info?${params}`),
    api.get('/api/v1/proveedores'),
  ])

  const usuario = usuario_info || {}
  console.log("Usuario info:", usuario)
  if (!usuario) throw new Error('Usuario no encontrado en el sistema.')

  const esAdmin = usuario.nombreRol?.toLowerCase() === 'admin'
  const esProveedor = usuario.nombreRol?.toLowerCase() === 'proveedor'

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    activo: usuario.activo,
    rol: esAdmin ? 'admin' : esProveedor ? 'proveedor' : 'empresa',
    id_empresa: usuario.idEmpresa?.id,
    id_sucursal: usuario.idSucursal?.id,
    idEmpresa: usuario.idEmpresa,
    idSucursal: usuario.idSucursal,
    nombreEmpresa: usuario.idEmpresa?.nombre,
    idProveedor: esProveedor?.id || null,
  }
}

export const useAuth = () => useContext(AuthContext)
