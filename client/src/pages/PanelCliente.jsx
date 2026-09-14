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
  const [pantalla, setPantalla] = useState(1)
  const [modalPerfil, setModalPerfil] = useState(false)
  const [perfilTab, setPerfilTab] = useState('datos')
  const [perfilForm, setPerfilForm] = useState({ nombre: usuario.nombre.split(' ')[0] || '', apellido: usuario.nombre.split(' ').slice(1).join(' ') || '' })
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [perfilMsg, setPerfilMsg] = useState('')
  const [perfilErr, setPerfilErr] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [servicios, setServicios] = useState([])
  const [filtros, setFiltros] = useState({ fecha: '', codigo: '', archivos: '', copias: '', medidas: '', estado: '', fechaFin: '', notas: '' })
  const [ordenCol, setOrdenCol] = useState('creado_en')
  const [ordenDir, setOrdenDir] = useState('desc')
  const [pedidoModal, setPedidoModal] = useState(null)

  // Formulario de orden actual
  const [tipoPapel, setTipoPapel] = useState('')
  const [tamaniosSeleccionados, setTamaniosSeleccionados] = useState({})
  const [archivos, setArchivos] = useState([])
  const [cantidadPorFoto, setCantidadPorFoto] = useState({})
  const [notas, setNotas] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Lista de ordenes acumuladas en pantalla 3
  const [ordenes, setOrdenes] = useState([])

  // Modales
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [modalProgreso, setModalProgreso] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [pedidosEnviados, setPedidosEnviados] = useState([])

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
  const tamaniosFotos = servicios.filter(s => s.categoria_id === 5)

  const toggleTamanio = (servicioId) => {
    setTamaniosSeleccionados(prev => {
      const next = { ...prev }
      if (next[servicioId] !== undefined) delete next[servicioId]
      else next[servicioId] = 1
      return next
    })
  }

  const totalOrden = () => {
    return tamaniosIds.reduce((acc, sid) => {
      const s = servicios.find(x => x.id === sid)
      if (!s) return acc
      const copias = archivos.reduce((sum, f) => sum + (cantidadPorFoto[f.name]?.[sid] || 1), 0)
      return acc + parseFloat(s.precio) * copias
    }, 0)
  }

  const resetOrden = () => {
    setTipoPapel(''); setTamaniosSeleccionados({})
    setArchivos([]); setCantidadPorFoto({}); setNotas(''); setMensaje('')
  }

  const agregarOrdenALista = () => {
    if (archivos.length === 0) { setMensaje('Subi al menos una foto'); return }
    const nuevaOrden = {
      id: Date.now(),
      tipoPapel,
      tamaniosIds: [...tamaniosIds],
      archivos: [...archivos],
      cantidadPorFoto: { ...cantidadPorFoto },
      notas,
      total: totalOrden(),
    }
    setOrdenes(prev => [...prev, nuevaOrden])
    resetOrden()
    setPantalla(3)
  }

  const eliminarOrden = (id) => {
    setOrdenes(prev => prev.filter(o => o.id !== id))
  }

  const enviarTodo = async () => {
    setModalConfirmar(false)
    setModalProgreso(true)
    const resultados = []

    for (const orden of ordenes) {
      // Crear el pedido primero para obtener el código
      const items = orden.tamaniosIds.map(sid => {
        const totalCopias = orden.archivos.reduce((sum, f) => sum + (orden.cantidadPorFoto[f.name]?.[sid] || 1), 0)
        return { servicio_id: sid, cantidad: totalCopias }
      })

      const resPedido = await fetch('/api/pedidos', {
        method: 'POST', headers,
        body: JSON.stringify({ usuario_id: usuario.id, tipo_papel: orden.tipoPapel, notas: orden.notas, archivos_urls: [], items })
      })
      const pedidoData = await resPedido.json()
      if (!resPedido.ok) continue

      const codigo = pedidoData.codigo

      // Subir archivos en carpeta del pedido
      const archivosUrls = []
      for (const archivo of orden.archivos) {
        const fd = new FormData()
        fd.append('archivo', archivo)
        fd.append('codigo', codigo)
        const resUp = await fetch('/api/upload/comprobante', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
        const upData = await resUp.json()
        if (upData.url) archivosUrls.push(upData.url)
      }

      // Actualizar el pedido con las URLs
      if (archivosUrls.length > 0) {
        await fetch(`/api/pedidos/${pedidoData.id}/archivos`, {
          method: 'PUT', headers,
          body: JSON.stringify({ archivos_urls: archivosUrls })
        })
      }

      resultados.push({ numero: codigo, archivos: archivosUrls.length })
      setPedidos(prev => [pedidoData, ...prev])
    }

    setModalProgreso(false)
    setPedidosEnviados(resultados)
    setOrdenes([])
    resetOrden()
    setModalExito(true)
  }

  const guardarPerfil = async () => {
    if (!perfilForm.nombre || !perfilForm.apellido) { setPerfilErr('Completa nombre y apellido'); return }
    setPerfilErr('')
    const res = await fetch(`/api/auth/perfil/${usuario.id}`, { method: 'PUT', headers, body: JSON.stringify({ nombre: perfilForm.nombre + ' ' + perfilForm.apellido }) })
    if (res.ok) { setPerfilMsg('Datos actualizados'); setTimeout(() => setPerfilMsg(''), 3000) }
    else setPerfilErr('Error al guardar')
  }

  const guardarPassword = async () => {
    if (!passForm.actual || !passForm.nueva) { setPerfilErr('Completa todos los campos'); return }
    if (passForm.nueva !== passForm.confirmar) { setPerfilErr('Las contrasenas no coinciden'); return }
    if (passForm.nueva.length < 6) { setPerfilErr('Minimo 6 caracteres'); return }
    setPerfilErr('')
    const res = await fetch(`/api/auth/password/${usuario.id}`, { method: 'PUT', headers, body: JSON.stringify({ password_actual: passForm.actual, password_nueva: passForm.nueva }) })
    const data = await res.json()
    if (res.ok) { setPerfilMsg('Contrasena actualizada'); setPassForm({ actual: '', nueva: '', confirmar: '' }); setTimeout(() => setPerfilMsg(''), 3000) }
    else setPerfilErr(data.error || 'Error al cambiar contrasena')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 border-b border-blue-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img src="/logo.jpg" alt="PHOTOExpress" className="h-10 w-10 rounded-full object-cover"/>
          <nav className="flex items-center gap-5">
            <button onClick={() => setVista('dashboard')} className="text-sm text-blue-100 hover:text-white font-medium">Inicio</button>
            <button onClick={() => setVista('dashboard')} className="text-sm text-blue-100 hover:text-white">Mis pedidos</button>
            <button onClick={() => setVista('precios')} className="text-sm text-blue-100 hover:text-white">Lista de precios</button>
            <button className="text-sm text-blue-100 hover:text-white">Contacto</button>
          </nav>
        </div>

        {/* Centro: resumen pedidos ingresados */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-blue-200 font-medium uppercase tracking-wide">Pedidos recibidos</span>
          <div className="bg-white rounded px-3 py-1 text-center min-w-[48px]">
            <span className="text-base font-bold text-gray-900">
              {pedidos.filter(p => p.estado === 'ingresado').length}
            </span>
          </div>
          <span className="text-xs text-blue-200 font-medium uppercase tracking-wide">Importe a abonar</span>
          <div className="bg-white rounded px-3 py-1 text-center min-w-[80px]">
            <span className="text-base font-bold text-gray-900">
              ${pedidos.filter(p => p.estado === 'ingresado').reduce((sum, p) => sum + parseFloat(p.total || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-100">{usuario.nombre}</span>
          <button onClick={() => { setModalPerfil(true); setPerfilMsg(''); setPerfilErr('') }}
            className="w-8 h-8 rounded-full bg-white text-blue-600 text-sm font-semibold flex items-center justify-center hover:bg-blue-50" title="Mi perfil">
            {usuario.nombre.charAt(0).toUpperCase()}
          </button>
          <button onClick={() => { resetOrden(); setOrdenes([]); setPantalla(1); setVista('nuevo') }}
            className="bg-white text-blue-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50">
            + Nuevo pedido
          </button>
          <button onClick={onLogout} className="text-sm text-blue-200 hover:text-white">Cerrar sesión</button>
        </div>
      </div>

      <div className="w-full px-4 py-4">

        {vista === 'dashboard' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        { key: 'creado_en', label: 'Fecha Creación' },
                        { key: 'codigo', label: 'Nro. Orden' },
                        { key: 'tipo_papel', label: 'Papel' },
                        { key: 'archivos', label: 'Cant. Archivos' },
                        { key: 'copias', label: 'Cant. Copias' },
                        { key: 'medidas', label: 'Medidas' },
                        { key: 'estado', label: 'Estado' },
                        { key: 'finalizado_en', label: 'Fecha Finalización' },
                        { key: 'notas', label: 'Comentarios' },
                        { key: 'total', label: 'Total' },
                      ].map(col => (
                        <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none whitespace-nowrap border border-gray-200"
                          onClick={() => { setOrdenCol(col.key); setOrdenDir(prev => ordenCol === col.key && prev === 'asc' ? 'desc' : 'asc') }}>
                          {col.label} {ordenCol === col.key ? (ordenDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-white">
                      {['fecha', 'codigo', 'papel', 'archivos', 'copias', 'medidas', 'estado', 'fechaFin', 'notas', 'total'].map(k => (
                        <th key={k} className="px-2 py-1 border border-gray-200">
                          <input value={filtros[k] || ''} onChange={e => setFiltros(prev => ({ ...prev, [k]: e.target.value }))}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder=""/>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos
                      .filter(p => {
                        const f = filtros
                        const medidas = p.items?.map(i => `${i.servicio_nombre?.replace(/^Foto /, '')}(${i.cantidad})`).join(', ') || ''
                        return (
                          (!f.fecha || new Date(p.creado_en).toLocaleDateString().includes(f.fecha)) &&
                          (!f.codigo || p.codigo?.toLowerCase().includes(f.codigo.toLowerCase())) &&
                          (!f.papel || (p.tipo_papel || '').toLowerCase().includes(f.papel.toLowerCase())) &&
                          (!f.estado || p.estado?.toLowerCase().includes(f.estado.toLowerCase())) &&
                          (!f.medidas || medidas.toLowerCase().includes(f.medidas.toLowerCase())) &&
                          (!f.notas || (p.notas || '').toLowerCase().includes(f.notas.toLowerCase()))
                        )
                      })
                      .sort((a, b) => {
                        let va = a[ordenCol] || ''; let vb = b[ordenCol] || ''
                        return ordenDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
                      })
                      .map(p => {
                        const medidas = p.items?.map(i => `${i.servicio_nombre?.replace(/^Foto /, '')}(${i.cantidad})`).join(', ') || '—'
                        const totalCopias = p.items?.reduce((sum, i) => sum + i.cantidad, 0) || 0
                        return (
                          <tr key={p.id} className="hover:bg-blue-50">
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap border border-gray-200">{new Date(p.creado_en).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-blue-600 font-medium whitespace-nowrap border border-gray-200 cursor-pointer hover:underline" onClick={() => setPedidoModal(p)}>{p.codigo}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap border border-gray-200">{p.tipo_papel || '—'}</td>
                            <td className="px-3 py-2 text-center text-gray-700 border border-gray-200">{p.archivos_urls?.length || 0}</td>
                            <td className="px-3 py-2 text-center text-gray-700 border border-gray-200">{totalCopias || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap border border-gray-200">{medidas}</td>
                            <td className="px-3 py-2 whitespace-nowrap border border-gray-200">
                              <span className={'text-xs px-2 py-1 rounded-full font-medium ' + ({
                                ingresado: 'bg-gray-100 text-gray-600',
                                facturado: 'bg-yellow-100 text-yellow-700',
                                cobrado: 'bg-blue-100 text-blue-700',
                                en_proceso: 'bg-orange-100 text-orange-700',
                                finalizado: 'bg-green-100 text-green-700',
                              }[p.estado] || 'bg-gray-100 text-gray-500')}>
                                {p.estado?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-400 whitespace-nowrap text-xs border border-gray-200">
                              {p.finalizado_en ? new Date(p.finalizado_en).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs border border-gray-200" style={{maxWidth:'200px'}}>{p.notas || '—'}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-800 whitespace-nowrap border border-gray-200">${parseFloat(p.total || 0).toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    {pedidos.length === 0 && (
                      <tr><td colSpan="10" className="px-3 py-8 text-center text-gray-400 border border-gray-200">No tenés pedidos todavía</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {vista === 'precios' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Lista de precios</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto / Tamaño</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 text-xs">{s.categoria_nombre}</td>
                      <td className="px-4 py-2 text-gray-700">{s.nombre}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">${parseFloat(s.precio).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vista === 'nuevo' && (
          <div>
            <div className="flex gap-2 mb-4">
              {['1. Papel / medidas', '2. Archivos y copias', '3. Resumen final'].map((label, i) => (
                <div key={i} className={'flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center ' +
                  (pantalla === i + 1 ? 'bg-blue-600 text-white' : pantalla > i + 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400')}>
                  {label}
                </div>
              ))}
            </div>

            {mensaje && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{mensaje}</p>}

            {pantalla === 1 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Descripcion</p>
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
                      <p className="text-sm text-gray-300 italic">Selecciona un tipo de papel</p>
                    ) : (
                      <div className="space-y-1.5 overflow-y-auto" style={{maxHeight: 'calc(100vh - 280px)'}}>
                        {tamaniosFotos.map(s => (
                          <label key={s.id} className={'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ' +
                            (tamaniosSeleccionados[s.id] !== undefined ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                            <input type="checkbox" checked={tamaniosSeleccionados[s.id] !== undefined}
                              onChange={() => toggleTamanio(s.id)} className="text-blue-600 rounded"/>
                            <span className="text-sm text-gray-700">{s.nombre.replace(/^Foto /, '')}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => { resetOrden(); setOrdenes([]); setVista('dashboard') }} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
                  <button onClick={() => {
                    if (!tipoPapel) { setMensaje('Selecciona el tipo de papel'); return }
                    if (tamaniosIds.length === 0) { setMensaje('Selecciona al menos un tamano'); return }
                    setMensaje(''); setPantalla(2)
                  }} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {pantalla === 2 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observaciones</p>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Indicaciones especiales, retoque de colores, etc."/>
                </div>
                <div className="p-5 border-b border-gray-100">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 transition-colors mb-3"
                    onClick={() => document.getElementById('file-input').click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const validos = Array.from(e.dataTransfer.files).filter(f => f.type === 'image/jpeg')
                      if (validos.length < e.dataTransfer.files.length) setMensaje('Solo se aceptan archivos JPG/JPEG')
                      else setMensaje('')
                      setArchivos(prev => [...prev, ...validos])
                    }}>
                    <p className="text-sm text-gray-400">Arrastra archivos JPG/JPEG aca</p>
                    <p className="text-xs text-gray-300 mt-1">Solo se aceptan archivos .jpg / .jpeg</p>
                    <input id="file-input" type="file" multiple accept=".jpg,.jpeg,image/jpeg" className="hidden"
                      onChange={e => {
                        const validos = Array.from(e.target.files).filter(f => f.type === 'image/jpeg')
                        if (validos.length < e.target.files.length) setMensaje('Solo se aceptan archivos JPG/JPEG')
                        else setMensaje('')
                        setArchivos(prev => [...prev, ...validos])
                      }}/>
                  </div>
                  <button onClick={() => document.getElementById('file-input').click()}
                    className="text-sm border border-gray-200 px-4 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
                    Elegir archivos
                  </button>
                  {archivos.length > 0 && tamaniosIds.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center bg-gray-50 rounded-t-lg px-3 py-2 border border-gray-200">
                        <span className="flex-1 text-xs font-semibold text-gray-500 uppercase">Nombre</span>
                        {tamaniosIds.map(sid => {
                          const s = servicios.find(x => x.id === sid)
                          return <span key={sid} className="w-20 text-center text-xs font-semibold text-gray-500 uppercase">{s?.nombre.replace(/^Foto /, '')}</span>
                        })}
                      </div>
                      <div className="border-x border-b border-gray-200 rounded-b-lg divide-y divide-gray-100">
                        {archivos.map((f, i) => (
                          <div key={i} className="flex items-center px-3 py-2">
                            <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                            {tamaniosIds.map(sid => (
                              <select key={sid} value={cantidadPorFoto[f.name]?.[sid] || 1}
                                onChange={e => setCantidadPorFoto(prev => ({ ...prev, [f.name]: { ...prev[f.name], [sid]: parseInt(e.target.value) } }))}
                                className="w-20 border border-gray-200 rounded px-1 py-1 text-sm text-center">
                                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-5 bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {tamaniosIds.length > 0 && archivos.length > 0 && (
                      <span>
                        <span className="font-semibold text-gray-800">{tipoPapel}</span>
                        {' - '}{tamaniosIds.map(sid => servicios.find(x => x.id === sid)?.nombre.replace(/^Foto /, '')).join(', ')}
                        {' - '}{archivos.length} foto{archivos.length !== 1 ? 's' : ''}
                        {' - Total: '}
                        <span className="font-semibold text-gray-800">${totalOrden().toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setMensaje(''); setPantalla(1) }} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">Atras</button>
                    <button onClick={agregarOrdenALista}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pantalla === 3 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Pedido</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Papel</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Archivos</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Copias</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Detalle</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenes.map((o, i) => (
                        <tr key={o.id} className="border-b border-gray-50">
                          <td className="py-3 text-sm text-gray-700">{i + 1}</td>
                          <td className="py-3 text-sm text-gray-700">{o.tipoPapel}</td>
                          <td className="py-3 text-sm text-gray-700">{o.archivos.length}</td>
                          <td className="py-3 text-sm text-gray-700">
                            {o.tamaniosIds.reduce((sum, sid) => sum + o.archivos.reduce((s, f) => s + (o.cantidadPorFoto[f.name]?.[sid] || 1), 0), 0)}
                          </td>
                          <td className="py-3 text-sm text-gray-700">
                            {o.tamaniosIds.map(sid => {
                              const s = servicios.find(x => x.id === sid)
                              const copias = o.archivos.reduce((sum, f) => sum + (o.cantidadPorFoto[f.name]?.[sid] || 1), 0)
                              return `${s?.nombre.replace(/^Foto /, '')}(${copias})`
                            }).join(', ')}
                          </td>
                          <td className="py-3 text-sm font-medium text-gray-800">${o.total.toLocaleString()}</td>
                          <td className="py-3">
                            <button onClick={() => eliminarOrden(o.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ordenes.length > 0 && (
                    <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                      <span className="text-sm font-semibold text-gray-800">
                        Total: ${ordenes.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex justify-end gap-3 mb-2">
                    <button onClick={() => { resetOrden(); setOrdenes([]); setVista('dashboard') }}
                      className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">Cancelar</button>
                    <button onClick={() => { resetOrden(); setPantalla(1) }}
                      className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
                      Cargar nueva orden
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => ordenes.length > 0 && setModalConfirmar(true)} disabled={ordenes.length === 0}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal detalle pedido */}
      {pedidoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Pedido {pedidoModal.codigo}</h3>
              <button onClick={() => setPedidoModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
                  <p className="text-gray-800">{new Date(pedidoModal.creado_en).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Tipo de papel</p>
                  <p className="text-gray-800 font-medium">{pedidoModal.tipo_papel || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Estado</p>
                  <span className={'text-xs px-2 py-1 rounded-full font-medium ' + ({
                    ingresado: 'bg-gray-100 text-gray-600',
                    facturado: 'bg-yellow-100 text-yellow-700',
                    cobrado: 'bg-blue-100 text-blue-700',
                    en_proceso: 'bg-orange-100 text-orange-700',
                    finalizado: 'bg-green-100 text-green-700',
                  }[pedidoModal.estado] || 'bg-gray-100 text-gray-500')}>
                    {pedidoModal.estado?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Total</p>
                  <p className="text-gray-800 font-semibold">${parseFloat(pedidoModal.total || 0).toLocaleString()}</p>
                </div>
              </div>

              {pedidoModal.items?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Composición</p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-gray-200">Tamaño</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 border border-gray-200">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoModal.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700 border border-gray-200">{item.servicio_nombre?.replace(/^Foto /, '')}</td>
                          <td className="px-3 py-2 text-center text-gray-700 border border-gray-200">{item.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pedidoModal.archivos_urls?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Archivos ({pedidoModal.archivos_urls.length})</p>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {pedidoModal.archivos_urls.map((url, i) => {
                      const nombre = url.split('/').pop()
                      return (
                        <div key={i} className="px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-gray-400 text-xs">{i + 1}.</span>
                          <span>{nombre}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {pedidoModal.notas && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{pedidoModal.notas}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setPedidoModal(null)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal perfil */}
      {modalPerfil && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Mi perfil</h3>
              <button onClick={() => setModalPerfil(false)} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
            </div>
            <div className="flex gap-2 mb-4">
              {['datos', 'contrasena'].map(t => (
                <button key={t} onClick={() => { setPerfilTab(t); setPerfilMsg(''); setPerfilErr('') }}
                  className={'flex-1 py-1.5 text-xs font-medium rounded-lg ' + (perfilTab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500')}>
                  {t === 'datos' ? 'Datos' : 'Contrasena'}
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
            {perfilTab === 'contrasena' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Contrasena actual</label>
                  <input type="password" value={passForm.actual} onChange={e => setPassForm({ ...passForm, actual: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nueva contrasena</label>
                  <input type="password" value={passForm.nueva} onChange={e => setPassForm({ ...passForm, nueva: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contrasena</label>
                  <input type="password" value={passForm.confirmar} onChange={e => setPassForm({ ...passForm, confirmar: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <button onClick={guardarPassword} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Cambiar contrasena</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmacion */}
      {modalConfirmar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Confirmar envio</h3>
            <p className="text-sm text-gray-500 mb-2">Se van a enviar <strong>{ordenes.length}</strong> orden{ordenes.length !== 1 ? 'es' : ''} al laboratorio.</p>
            <p className="text-sm font-semibold text-gray-800 mb-6">Total: ${ordenes.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalConfirmar(false)} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={enviarTodo} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Si, confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal progreso */}
      {modalProgreso && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-xl text-center">
            <p className="text-sm font-medium text-gray-700 mb-4">Aguarda mientras procesamos tu trabajo</p>
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"/>
          </div>
        </div>
      )}

      {/* Modal exito */}
      {modalExito && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Ordenes enviadas correctamente</h3>
            <div className="w-full bg-blue-600 rounded-full h-1.5 mb-4"/>
            <table className="w-full mb-5">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Pedido</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Numero de Orden</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Archivos</th>
                </tr>
              </thead>
              <tbody>
                {pedidosEnviados.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 text-sm text-gray-700">{i + 1}</td>
                    <td className="py-2 text-sm text-gray-700">{p.numero}</td>
                    <td className="py-2 text-sm text-gray-700">{p.archivos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setModalExito(false); setPantalla(1); setVista('dashboard') }}
                className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Volver a inicio</button>
              <button onClick={() => { setModalExito(false); onLogout() }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Cerrar Sesion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
