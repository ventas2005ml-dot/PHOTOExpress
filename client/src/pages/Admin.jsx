import { useState, useEffect } from 'react'

export default function Admin({ usuario, onLogout }) {
  const [stats, setStats] = useState(null)
  const [config, setConfig] = useState({})
  const [catalogo, setCatalogo] = useState([])
  const [promos, setPromos] = useState([])
  const [tab, setTab] = useState('estadisticas')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [nuevoServicio, setNuevoServicio] = useState({ categoria_id: '', nombre: '', descripcion: '', precio: '' })
  const [nuevaPromo, setNuevaPromo] = useState({ nombre: '', descripcion: '', precio: '' })

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  useEffect(() => {
    fetch('/api/admin/estadisticas', { headers }).then(r => r.json()).then(setStats)
    fetch('/api/pagos/configuracion', { headers }).then(r => r.json()).then(setConfig)
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(setCatalogo)
    fetch('/api/catalogo/categorias', { headers }).then(r => r.json()).then(data => {
      setCategorias(data)
    })
    fetch('/api/pagos/promos', { headers }).then(r => r.json()).then(setPromos)
  }, [])

  const [categorias, setCategorias] = useState([])

  const guardarConfig = async () => {
    setGuardando(true)
    await fetch('/api/pagos/configuracion', { method: 'PUT', headers, body: JSON.stringify(config) })
    setMensaje('Configuracion guardada')
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarServicio = async () => {
    if (!nuevoServicio.nombre || !nuevoServicio.precio) return
    await fetch('/api/catalogo/servicios', { method: 'POST', headers, body: JSON.stringify(nuevoServicio) })
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(setCatalogo)
    setNuevoServicio({ categoria_id: '', nombre: '', descripcion: '', precio: '' })
    setMensaje('Servicio agregado')
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarPromo = async () => {
    if (!nuevaPromo.nombre || !nuevaPromo.precio) return
    await fetch('/api/pagos/promos', { method: 'POST', headers, body: JSON.stringify(nuevaPromo) })
    fetch('/api/pagos/promos', { headers }).then(r => r.json()).then(setPromos)
    setNuevaPromo({ nombre: '', descripcion: '', precio: '' })
    setMensaje('Promo agregada')
    setTimeout(() => setMensaje(''), 3000)
  }

  const TABS = ['estadisticas', 'catalogo', 'promos', 'configuracion']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📷</span>
          <span className="font-semibold text-gray-800">PHOTOExpress</span>
          <span className="text-sm text-gray-400">Panel Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{usuario.nombre}</span>
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600">Salir</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'px-4 py-2 rounded-lg text-sm font-medium border transition-colors ' +
                (tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200')}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {mensaje && <p className="text-green-600 text-sm mb-4 bg-green-50 px-4 py-2 rounded-lg">{mensaje}</p>}

        {tab === 'estadisticas' && stats && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Pedidos hoy', valor: stats.pedidos_hoy },
                { label: 'Ingresos hoy', valor: '$' + stats.ingresos_hoy.toLocaleString() },
                { label: 'Ingresos totales', valor: '$' + stats.ingresos_totales.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-semibold text-gray-800">{s.valor}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pedidos por estado</h3>
              <div className="space-y-2">
                {stats.pedidos_por_estado.map(e => (
                  <div key={e.estado} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{e.estado.replace('_', ' ')}</span>
                    <span className="font-medium text-gray-800">{e.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'catalogo' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar servicio</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoria</label>
                  <select value={nuevoServicio.categoria_id} onChange={e => setNuevoServicio({ ...nuevoServicio, categoria_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={nuevoServicio.nombre} onChange={e => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Foto 20x30"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Descripcion</label>
                  <input value={nuevoServicio.descripcion} onChange={e => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Descripcion opcional"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Precio</label>
                  <input type="number" value={nuevoServicio.precio} onChange={e => setNuevoServicio({ ...nuevoServicio, precio: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0"/>
                </div>
              </div>
              <button onClick={agregarServicio} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Agregar servicio
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Servicio</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Categoria</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogo.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{s.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.categoria_nombre}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">${parseFloat(s.precio).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'promos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar promo</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={nuevaPromo.nombre} onChange={e => setNuevaPromo({ ...nuevaPromo, nombre: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Pack Familiar"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Descripcion</label>
                  <input value={nuevaPromo.descripcion} onChange={e => setNuevaPromo({ ...nuevaPromo, descripcion: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Que incluye"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Precio</label>
                  <input type="number" value={nuevaPromo.precio} onChange={e => setNuevaPromo({ ...nuevaPromo, precio: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0"/>
                </div>
              </div>
              <button onClick={agregarPromo} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Agregar promo
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Promo</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Descripcion</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-6 text-gray-400 text-sm">No hay promos cargadas</td></tr>
                  ) : promos.map(p => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.descripcion}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">${parseFloat(p.precio).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'configuracion' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Configuracion de pagos y cuenta</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'descuento_transferencia', label: 'Descuento transferencia (%)' },
                { key: 'descuento_efectivo', label: 'Descuento efectivo (%)' },
                { key: 'recargo_mp', label: 'Recargo MercadoPago (%)' },
                { key: 'cbu', label: 'CBU' },
                { key: 'alias', label: 'Alias' },
                { key: 'titular', label: 'Titular cuenta' },
                { key: 'link_mp', label: 'Link MercadoPago' },
                { key: 'whatsapp_numero', label: 'WhatsApp laboratorio' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs text-gray-500 block mb-1">{field.label}</label>
                  <input value={config[field.key] || ''} onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              ))}
            </div>
            <button onClick={guardarConfig} disabled={guardando}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}