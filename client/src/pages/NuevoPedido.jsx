import { useState, useEffect } from 'react'

export default function NuevoPedido({ usuario, onVolver }) {
  const [catalogo, setCatalogo] = useState([])
  const [items, setItems] = useState([])
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [pedidoCreado, setPedidoCreado] = useState(null)

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }

  useEffect(() => {
    fetch('/api/catalogo/servicios', { headers }).then(r => r.json()).then(setCatalogo)
  }, [])

  const agregarItem = (servicio) => {
    const existe = items.find(i => i.servicio_id === servicio.id)
    if (existe) {
      setItems(items.map(i => i.servicio_id === servicio.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, { servicio_id: servicio.id, nombre: servicio.nombre, precio: parseFloat(servicio.precio), cantidad: 1 }])
    }
  }

  const cambiarCantidad = (servicio_id, cantidad) => {
    if (cantidad <= 0) {
      setItems(items.filter(i => i.servicio_id !== servicio_id))
    } else {
      setItems(items.map(i => i.servicio_id === servicio_id ? { ...i, cantidad } : i))
    }
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)

  const crearPedido = async () => {
    if (items.length === 0) return
    setGuardando(true)
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ usuario_id: usuario.id, notas, items: items.map(i => ({ servicio_id: i.servicio_id, cantidad: i.cantidad })) })
    })
    const data = await res.json()
    setPedidoCreado(data)
    setGuardando(false)
  }

  if (pedidoCreado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Pedido creado</h2>
          <p className="text-2xl font-bold text-blue-600 mb-1">{pedidoCreado.codigo}</p>
          <p className="text-gray-500 text-sm mb-4">Total: <span className="font-semibold text-gray-800">${parseFloat(pedidoCreado.total).toLocaleString()}</span></p>
          <button onClick={onVolver} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
            Volver al panel
          </button>
        </div>
      </div>
    )
  }

  const categorias = [...new Set(catalogo.map(s => s.categoria_nombre))]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button onClick={onVolver} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
        <span className="font-semibold text-gray-800">Nuevo pedido</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {categorias.map(cat => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{cat}</h3>
              <div className="space-y-2">
                {catalogo.filter(s => s.categoria_nombre === cat).map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800">{s.nombre}</p>
                      <p className="text-xs text-gray-400">${parseFloat(s.precio).toLocaleString()} c/u</p>
                    </div>
                    <button onClick={() => agregarItem(s)}
                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100">
                      + Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">Notas del pedido</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Instrucciones especiales, nombre del cliente, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen</h3>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Agregá servicios</p>
            ) : (
              <div className="space-y-3">
                {items.map(i => (
                  <div key={i.servicio_id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{i.nombre}</span>
                      <span className="font-medium">${(i.precio * i.cantidad).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => cambiarCantidad(i.servicio_id, i.cantidad - 1)}
                        className="w-6 h-6 rounded border border-gray-200 text-gray-500 text-xs hover:bg-gray-50">−</button>
                      <span className="text-xs text-gray-600">{i.cantidad}</span>
                      <button onClick={() => cambiarCantidad(i.servicio_id, i.cantidad + 1)}
                        className="w-6 h-6 rounded border border-gray-200 text-gray-500 text-xs hover:bg-gray-50">+</button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="text-sm font-bold text-gray-800">${total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <button onClick={crearPedido} disabled={items.length === 0 || guardando}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {guardando ? 'Creando...' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}