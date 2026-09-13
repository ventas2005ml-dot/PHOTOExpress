import { useState, useEffect } from 'react'

const BADGE = {
  ingresado: 'bg-gray-100 text-gray-600',
  facturado: 'bg-yellow-100 text-yellow-700',
  cobrado: 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-orange-100 text-orange-700',
  finalizado: 'bg-green-100 text-green-700',
}

const TIPOS_PAPEL = ['MATE', 'MATE BORDE BLANCO', 'BRILLO', 'BRILLO BORDE BLANCO']

export default function PanelCliente({ usuario, onLogout }) {
  const [vista, setVista] = useState('dashboard')
  const [modalPerfil, setModalPerfil] = useState(false)
  const [perfilTab, setPerfilTab] = useState('datos')
  const [perfilForm, setPerfilForm] = useState({ nombre: usuario.nombre.split(' ')[0] || '', apellido: usuario.nombre.split(' ').slice(1).join(' ') || '' })
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [perfilMsg, setPerfilMsg] = useState('')
  const [perfilErr, setPerfilErr] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [servicios, setServicios] = useState([])

  // Formulario de nuevo pedido
  const [tipoPapel, setTipoPapel] = useState('')
  const [tamaniosSeleccionados, setTamaniosSeleccionados] = useState({})
  const [archivos, setArchivos] = useState([])
  const [cantidadPorFoto, setCantidadPorFoto] = useState({})
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  useEffect(() => {
    fetch(`/api/pedidos?usuario_id=${usuario.id}`, { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPedidos(data)
    })
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setServicios(data)
    })
  }, [])

  const tamaniosIds = Object.keys(tamaniosSeleccionados).map(Number)
  const tamaniosFotos = servicios

  const toggleTamanio = (servicioId) => {
    setTamaniosSeleccionados(prev => {
      const next = { ...prev }
      if (next[servicioId] !== undefined) delete next[servicioId]
      else next[servicioId] = 1
      return next
    })
  }

  const totalPedido = () => {
    return tamaniosIds.reduce((acc, sid) => {
      const s = servicios.find(x => x.id === sid)
      if (!s) return acc
      const copias = archivos.reduce((sum, f) => sum + (cantidadPorFoto[f.name]?.[sid] || 1), 0)
      return acc + parseFloat(s.precio) * copias
    }, 0)
  }

  const resetForm = () => {
    setTipoPapel(''); setTamaniosSeleccionados({})
    setArchivos([]); setCantidadPorFoto({}); setNotas(''); setMensaje('')
  }

  const enviarPedido = async () => {
    if (!tipoPapel) { setMensaje('Seleccioná el tipo de papel'); return }
    if (tamaniosIds.length === 0) { setMensaje('Seleccioná al menos un tamaño'); return }
    if (archivos.length === 0) { setMensaje('Subí al menos una foto'); return }
    setEnviando(true); setMensaje('')

    let archivosUrls = []
    for (const archivo of archivos) {
      const fd = new FormData(); fd.append('archivo', archivo)
      const res = await fetch('/api/upload/comprobante', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
      const data = await res.json()
      if (data.url) archivosUrls.push(data.url)
    }

    const items = tamaniosIds.map(sid => {
      const totalCopias = archivos.reduce((sum, f) => sum + (cantidadPorFoto[f.name]?.[sid] || 1), 0)
      return { servicio_id: sid, cantidad: totalCopias }
    })

    const res = await fetch('/api/pedidos', {
      method: 'POST', headers,
      body: JSON.stringify({ usuario_id: usuario.id, notas: `Papel: ${tipoPapel}${notas ? '\n' + notas : ''}`, archivos_urls: archivosUrls, items })
    })
    const data = await res.json()
    setEnviando(false)
    if (!res.ok) { setMensaje('Error al crear pedido'); return }
    setPedidos(prev => [data, ...prev])
    resetForm(); setVista('dashboard')
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 border-b border-blue-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📷</span>
          <span className="font-semibold text-white">PHOTOExpress</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-blue-100">{usuario.nombre}</span>
          <button onClick={() => { setModalPerfil(true); setPerfilMsg(''); setPerfilErr('') }}
            className="w-8 h-8 rounded-full bg-white text-blue-600 text-sm font-semibold flex items-center justify-center hover:bg-blue-50" title="Mi perfil">
            {usuario.nombre.charAt(0).toUpperCase()}
          </button>
          <button onClick={() => { resetForm(); setVista('nuevo') }}
            className="bg-white text-blue-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50">
            + Nuevo pedido
          </button>
          <button onClick={onLogout} className="text-sm text-blue-200 hover:text-white">Salir</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* DASHBOARD */}
        {vista === 'dashboard' && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Mis pedidos</h2>
            {pedidos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm mb-4">Todavía no tenés pedidos</p>
                <button onClick={() => setVista('nuevo')} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
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

        {/* NUEVO PEDIDO — todo en una pantalla */}
        {vista === 'nuevo' && (
          <div>
            {/* Tabs visuales */}
            <div className="flex gap-2 mb-4">
              {['1. Papel / medidas', '2. Archivos y copias', '3. Resumen final'].map((label, i) => (
                <div key={i} className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center bg-blue-600 text-white">{label}</div>
              ))}
            </div>

            {mensaje && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{mensaje}</p>}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

              {/* SECCIÓN 1: Papel y medidas */}
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                <div className="p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Descripción</p>
                  <div className="space-y-2">
                    {TIPOS_PAPEL.map(tipo => (
                      <label key={tipo} className={'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ' +
                        (tipoPapel === tipo ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                        <input type="radio" name="papel" checked={tipoPapel === tipo} onChange={() => setTipoPapel(tipo)} className="text-blue-600"/>
                        <span className="text-sm text-gray-700">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Medidas</p>
                  {!tipoPapel ? (
                    <p className="text-sm text-gray-300 italic">Seleccioná un tipo de papel</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                      {tamaniosFotos.map(s => (
                        <label key={s.id} className={'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ' +
                          (tamaniosSeleccionados[s.id] !== undefined ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                          <input type="checkbox" checked={tamaniosSeleccionados[s.id] !== undefined}
                            onChange={() => toggleTamanio(s.id)} className="text-blue-600 rounded"/>
                          <span className="text-sm text-gray-700">{s.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: Archivos y copias */}
              <div className="p-5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observaciones</p>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Indicaciones especiales, retoque de colores, etc."/>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 transition-colors mb-3"
                  onClick={() => document.getElementById('file-input').click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setArchivos(prev => [...prev, ...Array.from(e.dataTransfer.files)]) }}>
                  <p className="text-sm text-gray-400">Arrastrá carpetas o archivos acá</p>
                  <input id="file-input" type="file" multiple accept="image/*" className="hidden"
                    onChange={e => setArchivos(prev => [...prev, ...Array.from(e.target.files)])}/>
                </div>
                <button onClick={() => document.getElementById('file-input').click()}
                  className="text-sm border border-gray-200 px-4 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 mb-4">
                  Elegir archivos
                </button>

                {archivos.length > 0 && tamaniosIds.length > 0 && (
                  <div>
                    <div className="flex items-center bg-gray-50 rounded-t-lg px-3 py-2 border border-gray-200">
                      <span className="flex-1 text-xs font-semibold text-gray-500 uppercase">Nombre</span>
                      {tamaniosIds.map(sid => {
                        const s = servicios.find(x => x.id === sid)
                        return <span key={sid} className="w-20 text-center text-xs font-semibold text-gray-500 uppercase">{s?.nombre}</span>
                      })}
                    </div>
                    <div className="border-x border-b border-gray-200 rounded-b-lg divide-y divide-gray-100">
                      {archivos.map((f, i) => (
                        <div key={i} className="flex items-center px-3 py-2">
                          <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                          {tamaniosIds.map(sid => (
                            <select key={sid} value={cantidadPorFoto[f.name]?.[sid] || 1}
                              onChange={e => setCantidadPorFoto(prev => ({ ...prev, [f.name]: { ...prev[f.name], [sid]: parseInt(e.target.value) } }))}
                              className="w-20 border border-gray-200 rounded px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500">
                              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {archivos.length > 0 && tamaniosIds.length === 0 && (
                  <p className="text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                    Seleccioná al menos un tamaño arriba para asignar cantidades
                  </p>
                )}
              </div>

              {/* SECCIÓN 3: Resumen y botones */}
              <div className="p-5 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  {tipoPapel && tamaniosIds.length > 0 && archivos.length > 0 && (
                    <span>
                      <span className="font-semibold text-gray-800">{tipoPapel}</span>
                      {' · '}{tamaniosIds.map(sid => servicios.find(x => x.id === sid)?.nombre).join(', ')}
                      {' · '}{archivos.length} foto{archivos.length !== 1 ? 's' : ''}
                      {' · Total: '}
                      <span className="font-semibold text-gray-800">${totalPedido().toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { resetForm(); setVista('dashboard') }} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">
                    ← Cancelar
                  </button>
                  <button onClick={enviarPedido} disabled={enviando}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {enviando ? 'Enviando...' : 'Confirmar pedido'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Modal perfil */}
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
                <button onClick={guardarPerfil} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Guardar</button>
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
                <button onClick={guardarPassword} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Cambiar contraseña</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
