import { useState, useEffect } from 'react'
import NuevoPedido from './NuevoPedido'
import DetallePedido from './DetallePedido'

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']
const SIGUIENTE = { pendiente: 'en_proceso', en_proceso: 'listo', listo: 'entregado' }
const LABEL_BTN = { pendiente: 'Iniciar', en_proceso: 'Marcar listo', listo: 'Entregar' }
const BADGE = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  entregado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-100 text-red-600'
}

export default function Dashboard({ usuario, onLogout }) {
  const [pedidos, setPedidos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [cargando, setCargando] = useState(true)
    const [vista, setVista] = useState('lista')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  const cargarPedidos = async () => {
    setCargando(true)
    try {
      const url = filtro === 'todos' ? '/api/pedidos' : '/api/pedidos?estado=' + filtro
      const res = await fetch(url, { headers })
      const data = await res.json()
      setPedidos(data)
    } catch {
      console.error('Error cargando pedidos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarPedidos() }, [filtro])

  const avanzarEstado = async (pedido) => {
    const nuevoEstado = SIGUIENTE[pedido.estado]
    if (!nuevoEstado) return
    await fetch('/api/pedidos/' + pedido.id + '/estado', {
      method: 'PUT', headers,
      body: JSON.stringify({ estado: nuevoEstado })
    })
    cargarPedidos()
  }
  if (vista === 'nuevo') {
    return <NuevoPedido usuario={usuario} onVolver={() => { setVista('lista'); cargarPedidos() }} />
  }
  if (vista === 'detalle') {
    return <DetallePedido pedidoId={pedidoSeleccionado} usuario={usuario} onVolver={() => { setVista('lista'); cargarPedidos() }} />
  }
  

  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const enProceso = pedidos.filter(p => p.estado === 'en_proceso').length
  const listos = pedidos.filter(p => p.estado === 'listo').length
  const totalDia = pedidos.reduce((s, p) => s + parseFloat(p.total || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📷</span>
          <span className="font-semibold text-gray-800">PHOTOExpress</span>
          <span className="text-sm text-gray-400">Panel de empleados</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setVista('nuevo')}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Nuevo pedido
          </button>
          <span className="text-sm text-gray-600">{usuario.nombre}</span>
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600">Salir</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pendientes', valor: pendientes, color: 'text-yellow-600' },
            { label: 'En proceso', valor: enProceso, color: 'text-blue-600' },
            { label: 'Listos', valor: listos, color: 'text-green-600' },
            { label: 'Total del día', valor: '$' + totalDia.toLocaleString(), color: 'text-gray-800' }
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={'text-2xl font-semibold ' + stat.color}>{stat.valor}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {['todos', ...ESTADOS].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={'px-3 py-1 rounded-full text-sm border transition-colors ' +
                (filtro === e ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}>
              {e.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Código</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Notas</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400 text-sm">Cargando...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400 text-sm">No hay pedidos</td></tr>
              ) : pedidos.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-blue-600 text-sm cursor-pointer hover:underline" onClick={() => { setPedidoSeleccionado(p.id); setVista('detalle') }}>{p.codigo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{p.notas || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">${parseFloat(p.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-1 rounded-full font-medium ' + BADGE[p.estado]}>
                      {p.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {SIGUIENTE[p.estado] ? (
                      <button onClick={() => avanzarEstado(p)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        {LABEL_BTN[p.estado]} →
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}