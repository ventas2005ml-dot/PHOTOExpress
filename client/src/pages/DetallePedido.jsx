import { useState, useEffect } from 'react'

const SIGUIENTE = { pendiente: 'en_proceso', en_proceso: 'listo', listo: 'entregado' }
const LABEL_BTN = { pendiente: 'Iniciar proceso', en_proceso: 'Marcar listo', listo: 'Marcar entregado' }
const BADGE = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  entregado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-100 text-red-600'
}

export default function DetallePedido({ pedidoId, usuario, onVolver }) {
  const [pedido, setPedido] = useState(null)
  const [metodo, setMetodo] = useState('transferencia')
  const [mensajeWA, setMensajeWA] = useState('')
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  const cargar = async () => {
    setCargando(true)
    const res = await fetch('/api/pedidos/' + pedidoId, { headers })
    const data = await res.json()
    setPedido(data)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [pedidoId])

  const avanzarEstado = async () => {
    const nuevoEstado = SIGUIENTE[pedido.estado]
    if (!nuevoEstado) return
    await fetch('/api/pedidos/' + pedidoId + '/estado', {
      method: 'PUT', headers,
      body: JSON.stringify({ estado: nuevoEstado })
    })
    cargar()
  }

  const generarMensajeWA = async () => {
    setGenerando(true)
    const res = await fetch('/api/pagos', {
      method: 'POST', headers,
      body: JSON.stringify({ pedido_id: pedidoId, metodo })
    })
    const data = await res.json()
    setMensajeWA(data.mensajeWA)
    setGenerando(false)
  }

  const abrirWhatsApp = () => {
    const texto = encodeURIComponent(mensajeWA)
    window.open('https://wa.me/?text=' + texto, '_blank')
  }

  if (cargando) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button onClick={onVolver} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
        <span className="font-semibold text-gray-800">Pedido {pedido.codigo}</span>
        <span className={'text-xs px-2 py-1 rounded-full font-medium ' + BADGE[pedido.estado]}>
          {pedido.estado.replace('_', ' ')}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Información del pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="text-gray-800">{pedido.cliente_nombre || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="text-gray-800">{new Date(pedido.creado_en).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Notas</span>
                <span className="text-gray-800 text-right max-w-xs">{pedido.notas || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Servicios</h3>
            <div className="space-y-2">
              {pedido.items?.map(i => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{i.servicio_nombre} ×{i.cantidad}</span>
                  <span className="font-medium text-gray-800">${parseFloat(i.subtotal).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>${parseFloat(pedido.total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {SIGUIENTE[pedido.estado] && (
            <button onClick={avanzarEstado}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700">
              {LABEL_BTN[pedido.estado]} →
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Generar mensaje de pago</h3>
            <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="transferencia">Transferencia bancaria</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="efectivo">Efectivo</option>
            </select>
            <button onClick={generarMensajeWA} disabled={generando}
              className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {generando ? 'Generando...' : 'Generar mensaje WhatsApp'}
            </button>
          </div>

          {mensajeWA && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mensaje generado</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 mb-3">{mensajeWA}</pre>
              <button onClick={abrirWhatsApp}
                className="w-full bg-green-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-600">
                Abrir en WhatsApp →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}