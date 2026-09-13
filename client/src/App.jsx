import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import PanelCliente from './pages/PanelCliente'
import Registro from './pages/Registro'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [pantalla, setPantalla] = useState('login') // login | registro

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
    setPantalla('login')
  }

  if (!usuario) {
    if (pantalla === 'registro') return <Registro onVolver={() => setPantalla('login')} />
    return <Login onLogin={setUsuario} onRegistro={() => setPantalla('registro')} />
  }

  if (usuario.rol === 'admin') return <Admin usuario={usuario} onLogout={handleLogout} />
  if (usuario.rol === 'cliente') return <PanelCliente usuario={usuario} onLogout={handleLogout} />
  return <Dashboard usuario={usuario} onLogout={handleLogout} />
}

export default App