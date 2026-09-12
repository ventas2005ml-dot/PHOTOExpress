import { useState, useEffect } from 'react'

const TABS = ['estadisticas', 'reportes', 'catalogo', 'promos', 'usuarios', 'configuracion']

export default function Admin({ usuario, onLogout }) {
  const [stats, setStats] = useState(null)
  const [config, setConfig] = useState({})
  const [catalogo, setCatalogo] = useState([])
  const [categorias, setCategorias] = useState([])
  const [promos, setPromos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [tab, setTab] = useState('estadisticas')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [nuevoServicio, setNuevoServicio] = useState({ categoria_id: '', nombre: '', descripcion: '', precio: '' })
  const [nuevaPromo, setNuevaPromo] = useState({ nombre: '', descripcion: '', precio: '' })
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '', email: '', password: '' })
  const [editandoServicio, setEditandoServicio] = useState(null)
  const [reporte, setReporte] = useState(null)
  const [fechaDesde, setFechaDesde] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0])
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0])
  const [cargandoReporte, setCargandoReporte] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  useEffect(() => {
    fetch('/api/admin/estadisticas', { headers }).then(r => r.json()).then(setStats)
    fetch('/api/pagos/configuracion', { headers }).then(r => r.json()).then(setConfig)
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(setCatalogo)
    fetch('/api/catalogo/categorias', { headers }).then(r => r.json()).then(setCategorias)
    fetch('/api/pagos/promos', { headers }).then(r => r.json()).then(setPromos)
    fetch('/api/usuarios', { headers }).then(r => r.json()).then(setUsuarios)
  }, [])

  const guardarConfig = async () => {
    setGuardando(true)
    await fetch('/api/pagos/configuracion', { method: 'PUT', headers, body: JSON.stringify(config) })
    setMensaje('Configuración guardada ✓')
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarServicio = async () => {
    if (!nuevoServicio.nombre || !nuevoServicio.precio) return
    await fetch('/api/catalogo/servicios', { method: 'POST', headers, body: JSON.stringify(nuevoServicio) })
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(setCatalogo)
    setNuevoServicio({ categoria_id: '', nombre: '', descripcion: '', precio: '' })
    setMensaje('Servicio agregado ✓')
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarPromo = async () => {
    if (!nuevaPromo.nombre || !nuevaPromo.precio) return
    await fetch('/api/pagos/promos', { method: 'POST', headers, body: JSON.stringify(nuevaPromo) })
    fetch('/api/pagos/promos', { headers }).then(r => r.json()).then(setPromos)
    setNuevaPromo({ nombre: '', descripcion: '', precio: '' })
    setMensaje('Promo agregada ✓')
    setTimeout(() => setMensaje(''), 3000)
  }

  const guardarServicio = async () => {
    const { id, nombre, descripcion, precio, activo } = editandoServicio
    await fetch(`/api/catalogo/servicios/${id}`, { method: 'PUT', headers, body: JSON.stringify({ nombre, descripcion, precio, activo }) })
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(setCatalogo)
    setEditandoServicio(null)
    setMensaje('Servicio actualizado ✓')
    setTimeout(() => setMensaje(''), 3000)
  }

  const crearEmpleado = async () => {
    if (!nuevoEmpleado.nombre || !nuevoEmpleado.email || !nuevoEmpleado.password) return
    const res = await fetch('/api/usuarios/empleado', { method: 'POST', headers, body: JSON.stringify(nuevoEmpleado) })
    const data = await res.json()
    if (!res.ok) { setMensaje('Error: ' + data.error); setTimeout(() => setMensaje(''), 3000); return }
    fetch('/api/usuarios', { headers }).then(r => r.json()).then(setUsuarios)
    setNuevoEmpleado({ nombre: '', email: '', password: '' })
    setMensaje('Empleado creado ✓')
    setTimeout(() => setMensaje(''), 3000)
  }

  const cargarReporte = async () => {
    setCargandoReporte(true)
    const res = await fetch(`/api/admin/reporte?desde=${fechaDesde}&hasta=${fechaHasta}`, { headers })
    const data = await res.json()
    setReporte(data)
    setCargandoReporte(false)
  }

  const BADGE_PAGO = {
    confirmado: 'bg-green-100 text-green-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
  }

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
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'px-4 py-2 rounded-lg text-sm font-medium border transition-colors ' +
                (tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {mensaje && <p className="text-green-600 text-sm mb-4 bg-green-50 px-4 py-2 rounded-lg">{mensaje}</p>}

        {tab === 'estadisticas' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
              {stats.metodos_pago?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Métodos de pago</h3>
                  <div className="space-y-2">
                    {stats.metodos_pago.map(m => (
                      <div key={m.metodo} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{m.metodo}</span>
                        <span className="font-medium text-gray-800">${parseFloat(m.total || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'reportes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Reporte de ventas</h3>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Desde</label>
                  <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                  <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <button onClick={cargarReporte} disabled={cargandoReporte}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {cargandoReporte ? 'Cargando...' : 'Ver reporte'}
                </button>
              </div>
            </div>
            {reporte && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total del período', valor: '$' + parseFloat(reporte.total).toLocaleString(), color: 'text-green-600' },
                    { label: 'Pedidos', valor: reporte.ventas.length, color: 'text-gray-800' },
                    { label: 'Ticket promedio', valor: '$' + (reporte.ventas.length ? Math.round(reporte.total / reporte.ventas.length).toLocaleString() : 0), color: 'text-gray-800' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className={'text-2xl font-semibold ' + s.color}>{s.valor}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Código</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Fecha</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Método</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Monto</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.ventas.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-8 text-gray-400 text-sm">Sin ventas en el período</td></tr>
                      ) : reporte.ventas.map((v, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{v.codigo}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{v.cliente || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(v.creado_en).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{v.metodo || '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">${parseFloat(v.monto_final || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (BADGE_PAGO[v.pago_estado] || 'bg-gray-100 text-gray-500')}>
                              {v.pago_estado || 'sin pago'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'catalogo' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar servicio</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoría</label>
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
                  <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                  <input value={nuevoServicio.descripcion} onChange={e => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Descripción opcional"/>
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
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Categoría</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Descripción</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Precio</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogo.map(s => {
                    const editando = editandoServicio?.id === s.id
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {editando
                            ? <input value={editandoServicio.nombre} onChange={e => setEditandoServicio({ ...editandoServicio, nombre: e.target.value })}
                                className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            : <span className="text-gray-800">{s.nombre}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{s.categoria_nombre}</td>
                        <td className="px-4 py-3 text-sm">
                          {editando
                            ? <input value={editandoServicio.descripcion || ''} onChange={e => setEditandoServicio({ ...editandoServicio, descripcion: e.target.value })}
                                className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            : <span className="text-gray-500">{s.descripcion || '—'}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editando
                            ? <input type="number" value={editandoServicio.precio} onChange={e => setEditandoServicio({ ...editandoServicio, precio: e.target.value })}
                                className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            : <span className="font-medium text-gray-800">${parseFloat(s.precio).toLocaleString()}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editando ? (
                            <div className="flex gap-2">
                              <button onClick={guardarServicio} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Guardar</button>
                              <button onClick={() => setEditandoServicio(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditandoServicio({ ...s })} className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
                  <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                  <input value={nuevaPromo.descripcion} onChange={e => setNuevaPromo({ ...nuevaPromo, descripcion: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qué incluye"/>
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
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Descripción</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-6 text-gray-400 text-sm">No hay promos cargadas</td></tr>
                  ) : promos.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
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

        {tab === 'usuarios' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Crear empleado</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={nuevoEmpleado.nombre} onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre completo"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input type="email" value={nuevoEmpleado.email} onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@ejemplo.com"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Contraseña</label>
                  <input type="password" value={nuevoEmpleado.password} onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mínimo 6 caracteres"/>
                </div>
              </div>
              <button onClick={crearEmpleado} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Crear empleado
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Nombre</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rol</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Estado</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No hay usuarios</td></tr>
                  ) : usuarios.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{u.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-600">{u.rol}</td>
                      <td className="px-4 py-3">
                        <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(u.creado_en).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'configuracion' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Configuración de pagos y cuenta</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'descuento_transferencia', label: 'Descuento transferencia (%)' },
                { key: 'descuento_efectivo', label: 'Descuento efectivo (%)' },
                { key: 'recargo_mp', label: 'Recargo MercadoPago (%)' },
                { key: 'cbu', label: 'CBU' },
                { key: 'alias', label: 'Alias' },
                { key: 'titular', label: 'Titular de cuenta' },
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