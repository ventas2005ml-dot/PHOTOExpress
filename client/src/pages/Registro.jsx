import { useState } from 'react'

export default function Registro({ onVolver }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', confirmar: '' })
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.password) { setError('Completá todos los campos'); return }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setCargando(true)
    setError('')
    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: form.nombre + ' ' + form.apellido, email: form.email, password: form.password, rol: 'cliente' })
    })
    const data = await res.json()
    setCargando(false)
    if (!res.ok) { setError(data.error || 'Error al registrarse'); return }
    setMensaje(data.mensaje)
  }

  if (mensaje) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">¡Registro exitoso!</h2>
        <p className="text-sm text-gray-500 mb-6">{mensaje}</p>
        <button onClick={onVolver} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Volver al inicio
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">📷</span>
          <span className="font-semibold text-gray-800">PHOTOExpress</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Crear cuenta</h2>
        <p className="text-xs text-gray-500 mb-6">Tu cuenta será activada por el administrador antes de poder ingresar.</p>

        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Apellido</label>
            <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu apellido"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Contraseña</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Confirmar contraseña</label>
            <input type="password" value={form.confirmar} onChange={e => setForm({ ...form, confirmar: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repetí la contraseña"/>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={cargando}
          className="w-full mt-5 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {cargando ? 'Registrando...' : 'Crear cuenta'}
        </button>

        <button onClick={onVolver} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600">
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}
