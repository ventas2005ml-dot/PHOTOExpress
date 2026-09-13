import { useState, useEffect } from 'react'

const BADGE = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  listo: 'bg-green-100 text-green-700',
  entregado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-100 text-red-600',
}

export default function PanelCliente({ usuario, onLogout }) {
  const [vista, setVista] = useState('dashboard')
  const [modalPerfil, setModalPerfil] = useState(false)
  const [perfilTab, setPerfilTab] = useState('datos')
  const [perfilForm, setPerfilForm] = useState({ nombre: usuario.nombre.split(' ')[0] || '', apellido: usuario.nombre.split(' ').slice(1).join(' ') || '' })
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [perfilMsg, setPerfilMsg] = useState('')
  const [perfilErr, setPerfilErr] = useState('') // dashboard | nuevo
  const [pedidos, setPedidos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [servicios, setServicios] = useState([])

  // Wizard
  const [paso, setPaso] = useState(1)
  const [categoriaId, setCategoriaId] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [archivos, setArchivos] = useState([])
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  useEffect(() => {
    const hace3meses = new Date()
    hace3meses.setMonth(hace3meses.getMonth() - 3)
    fetch(`/api/pedidos?usuario_id=${usuario.id}`, { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPedidos(data)
    })
    fetch('/api/catalogo/categorias', { headers }).then(r => r.json()).then(setCategorias)
  }, [])

  useEffect(() => {
    if (!categoriaId) { setServicios([]); return }
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(data => {
      setServicios(data.filter(s => s.categoria_id == categoriaId))
    })
  }, [categoriaId])

  const servicioSeleccionado = servicios.find(s => s.id == servicioId)

  const enviarPedido = async () => {
    if (!servicioId) { setMensaje('Seleccioná un servicio'); return }
    setEnviando(true)
    setMensaje('')

    let archivosUrls = []
    for (const archivo of archivos) {
      const formData = new FormData()
      formData.append('archivo', archivo)
      const res = await fetch('/api/upload/comprobante', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: formData
      })
      const data = await res.json()
      if (data.url) archivosUrls.push({ nombre: archivo.name, url: data.url })
    }

    const res = await fetch('/api/pedidos', {
      method: 'POST', headers,
      body: JSON.stringify({
        usuario_id: usuario.id,
        notas: notas + (archivosUrls.length ? '\nArchivos: ' + archivosUrls.map(a => a.nombre).join(', ') : ''),
        items: [{ servicio_id: servicioId, cantidad }]
      })
    })
    const data = await res.json()
    setEnviando(false)
    if (!res.ok) { setMensaje('Error al crear pedido'); return }
    setPedidos(prev => [data, ...prev])
    setVista('dashboard')
    setPaso(1); setCategoriaId(''); setServicioId(''); setCantidad(1); setArchivos([]); setNotas('')
  }

  const guardarPerfil = async () => {
    if (!perfilForm.nombre || !perfilForm.apellido) { setPerfilErr('Completá nombre y apellido'); return }
    setPerfilErr('')
    const res = await fetch(`/api/auth/perfil/${usuario.id}`, { method: 'PUT', headers, body: JSON.stringify({ nombre: perfilForm.nombre + ' ' + perfilForm.apellido }) })
    if (res.ok) { setPerfilMsg('Datos actualizados ✓'); setTimeout(() => setPerfilMsg(''), 3000) }
    else setPerfilErr('Error al guardar')
  }

  const guardarPassword = async () => {
    if (!passForm.actual || !passForm.nueva) { setPerfilErr('Completá todos los campos'); return }
    if (passForm.nueva !== passForm.confirmar) { setPerfilErr('Las contraseñas no coinciden'); return }
    if (passForm.nueva.length < 6) { setPerfilErr('Mínimo 6 caracteres'); return }
    setPerfilErr('')
    const res = await fetch(`/api/auth/password/${usuario.id}`, { method: 'PUT', headers, body: JSON.stringify({ password_actual: passForm.actual, password_nueva: passForm.nueva }) })
    const data = await res.json()
    if (res.ok) { setPerfilMsg('Contraseña actualizada ✓'); setPassForm({ actual: '', nueva: '', confirmar: '' }); setTimeout(() => setPerfilMsg(''), 3000) }
    else setPerfilErr(data.error || 'Error al cambiar contraseña')
  }

  const resetWizard = () => { setPaso(1); setCategoriaId(''); setServicioId(''); setCantidad(1); setArchivos([]); setNotas(''); setMensaje('') }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 border-b border-blue-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📷</span>
          <span className="font-semibold text-white">PHOTOExpress</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-blue-100">{usuario.nombre}</span>
          <button onClick={() => { setModalPerfil(true); setPerfilMsg(''); setPerfilErr('') }}
            className="w-8 h-8 rounded-full bg-white text-blue-600 text-sm font-semibold flex items-center justify-center hover:bg-blue-50"
            title="Mi perfil">
            {usuario.nombre.charAt(0).toUpperCase()}
          </button>
          <button onClick={() => { resetWizard(); setVista('nuevo') }}
            className="bg-white text-blue-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50">
            + Nuevo pedido
          </button>
          <button onClick={onLogout} className="text-sm text-blue-200 hover:text-white">Salir</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {vista === 'dashboard' && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Mis pedidos</h2>
            {pedidos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm mb-4">Todavía no tenés pedidos</p>
                <button onClick={() => setVista('nuevo')}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Hacer mi primer pedido
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">{p.codigo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(p.creado_en).toLocaleDateString()}</p>
                      {p.notas && <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{p.notas}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-800">${parseFloat(p.total || 0).toLocaleString()}</span>
                      <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (BADGE[p.estado] || 'bg-gray-100 text-gray-500')}>
                        {p.estado?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vista === 'nuevo' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => { resetWizard(); setVista('dashboard') }} className="text-sm text-gray-400 hover:text-gray-600">← Volver</button>
            </div>

            {/* Indicador de pasos */}
            <div className="flex gap-2 mb-6">
              {['Servicio', 'Archivos y notas', 'Confirmar'].map((label, i) => (
                <div key={i} className={'flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center ' +
                  (paso === i + 1 ? 'bg-blue-600 text-white' : paso > i + 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400')}>
                  {i + 1}. {label}
                </div>
              ))}
            </div>

            {mensaje && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{mensaje}</p>}

            {paso === 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-4">¿Qué tipo de producto querés?</h3>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                  <select value={categoriaId} onChange={e => { setCategoriaId(e.target.value); setServicioId('') }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccioná una categoría...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                {categoriaId && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1">Tamaño / Producto</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {servicios.map(s => (
                        <label key={s.id} className={'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ' +
                          (servicioId == s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="servicio" value={s.id} checked={servicioId == s.id}
                              onChange={() => setServicioId(s.id)} className="text-blue-600"/>
                            <span className="text-sm text-gray-700">{s.nombre}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-800">${parseFloat(s.precio).toLocaleString()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {servicioId && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1">Cantidad de copias</label>
                    <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
                      className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                )}
                <button onClick={() => { if (!servicioId) { setMensaje('Seleccioná un servicio'); return } setMensaje(''); setPaso(2) }}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Siguiente →
                </button>
              </div>
            )}

            {paso === 2 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Subí tus archivos</h3>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-2">Fotos a imprimir</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => document.getElementById('file-input').click()}>
                    <p className="text-sm text-gray-400">Arrastrá archivos acá o hacé clic para seleccionar</p>
                    <p className="text-xs text-gray-300 mt-1">JPG, PNG — máx. 10MB por archivo</p>
                    <input id="file-input" type="file" multiple accept="image/*" className="hidden"
                      onChange={e => setArchivos(Array.from(e.target.files))}/>
                  </div>
                  {archivos.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {archivos.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded">
                          <span>{f.name}</span>
                          <span>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1">Observaciones</label>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Indicaciones especiales, retoque de colores, etc."/>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPaso(1)} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">← Atrás</button>
                  <button onClick={() => setPaso(3)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {paso === 3 && servicioSeleccionado && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Resumen del pedido</h3>
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Producto</span>
                    <span className="text-gray-800 font-medium">{servicioSeleccionado.nombre}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cantidad</span>
                    <span className="text-gray-800">{cantidad} copia{cantidad > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Archivos</span>
                    <span className="text-gray-800">{archivos.length} archivo{archivos.length !== 1 ? 's' : ''}</span>
                  </div>
                  {notas && <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Notas</span>
                    <span className="text-gray-800 text-right max-w-xs">{notas}</span>
                  </div>}
                  <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold">
                    <span className="text-gray-700">Total</span>
                    <span className="text-gray-800">${(parseFloat(servicioSeleccionado.precio) * cantidad).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-4">El tiempo de confección es de 48 a 72 horas. Te avisamos cuando esté listo.</p>
                <div className="flex gap-3">
                  <button onClick={() => setPaso(2)} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">← Atrás</button>
                  <button onClick={enviarPedido} disabled={enviando}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {enviando ? 'Enviando...' : 'Confirmar pedido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {modalPerfil && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Mi perfil</h3>
              <button onClick={() => setModalPerfil(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
            <div className="flex gap-2 mb-4">
              {['datos', 'contraseña'].map(t => (
                <button key={t} onClick={() => { setPerfilTab(t); setPerfilMsg(''); setPerfilErr('') }}
                  className={'flex-1 py-1.5 text-xs font-medium rounded-lg ' + (perfilTab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500')}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {perfilMsg && <p className="text-green-600 text-xs mb-3 bg-green-50 px-3 py-2 rounded-lg">{perfilMsg}</p>}
            {perfilErr && <p className="text-red-500 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{perfilErr}</p>}
            {perfilTab === 'datos' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={perfilForm.nombre} onChange={e => setPerfilForm({ ...perfilForm, nombre: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Apellido</label>
                  <input value={perfilForm.apellido} onChange={e => setPerfilForm({ ...perfilForm, apellido: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <button onClick={guardarPerfil} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            )}
            {perfilTab === 'contraseña' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Contraseña actual</label>
                  <input type="password" value={passForm.actual} onChange={e => setPassForm({ ...passForm, actual: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nueva contraseña</label>
                  <input type="password" value={passForm.nueva} onChange={e => setPassForm({ ...passForm, nueva: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contraseña</label>
                  <input type="password" value={passForm.confirmar} onChange={e => setPassForm({ ...passForm, confirmar: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <button onClick={guardarPassword} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Cambiar contraseña
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
