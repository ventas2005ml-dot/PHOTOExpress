import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [usuario, setUsuario] = useState(null)

  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  return <Dashboard usuario={usuario} onLogout={() => setUsuario(null)} />
}

export default App