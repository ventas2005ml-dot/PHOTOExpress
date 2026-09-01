import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

function App() {
  const [usuario, setUsuario] = useState(null)

  const handleLogout = () => setUsuario(null)

  if (!usuario) return <Login onLogin={setUsuario} />
  if (usuario.rol === 'admin') return <Admin usuario={usuario} onLogout={handleLogout} />
  return <Dashboard usuario={usuario} onLogout={handleLogout} />
}

export default App