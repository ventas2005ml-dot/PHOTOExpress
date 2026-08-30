const db = require('../../config/database')

const generarCodigo = async () => {
  const result = await db.query('SELECT COUNT(*) FROM pedidos')
  const numero = parseInt(result.rows[0].count) + 1
  return `PE-${String(numero).padStart(5, '0')}`
}

const getPedidos = async (req, res) => {
  try {
    const { estado } = req.query
    let query = `
      SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
    `
    const params = []
    if (estado) {
      query += ' WHERE p.estado = $1'
      params.push(estado)
    }
    query += ' ORDER BY p.creado_en DESC'
    const result = await db.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
}

const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params
    const pedido = await db.query(
      `SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email
       FROM pedidos p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = $1`,
      [id]
    )
    if (pedido.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    const items = await db.query(
      `SELECT pi.*, s.nombre as servicio_nombre
       FROM pedido_items pi
       LEFT JOIN servicios s ON pi.servicio_id = s.id
       WHERE pi.pedido_id = $1`,
      [id]
    )
    res.json({ ...pedido.rows[0], items: items.rows })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedido' })
  }
}

const crearPedido = async (req, res) => {
  try {
    const { usuario_id, notas, items } = req.body
    const codigo = await generarCodigo()

    const pedidoResult = await db.query(
      'INSERT INTO pedidos (codigo, usuario_id, notas, estado) VALUES ($1, $2, $3, $4) RETURNING *',
      [codigo, usuario_id, notas, 'pendiente']
    )
    const pedido = pedidoResult.rows[0]

    let total = 0
    if (items && items.length > 0) {
      for (const item of items) {
        const servicio = await db.query(
          'SELECT precio FROM servicios WHERE id = $1',
          [item.servicio_id]
        )
        const precio = servicio.rows[0].precio
        const subtotal = precio * item.cantidad
        total += subtotal
        await db.query(
          'INSERT INTO pedido_items (pedido_id, servicio_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [pedido.id, item.servicio_id, item.cantidad, precio, subtotal]
        )
      }
      await db.query(
        'UPDATE pedidos SET total = $1 WHERE id = $2',
        [total, pedido.id]
      )
      pedido.total = total
    }

    res.status(201).json({ ...pedido, codigo })
  } catch (error) {
    res.status(500).json({ error: 'Error al crear pedido' })
  }
}

const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body
    const estados = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']
    if (!estados.includes(estado)) {
      return res.status(400).json({ error: 'Estado invalido' })
    }
    const result = await db.query(
      'UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado' })
  }
}

const agregarItem = async (req, res) => {
  try {
    const { id } = req.params
    const { servicio_id, cantidad } = req.body
    const servicio = await db.query(
      'SELECT precio FROM servicios WHERE id = $1',
      [servicio_id]
    )
    if (servicio.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' })
    }
    const precio = servicio.rows[0].precio
    const subtotal = precio * cantidad
    const result = await db.query(
      'INSERT INTO pedido_items (pedido_id, servicio_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, servicio_id, cantidad, precio, subtotal]
    )
    await db.query(
      'UPDATE pedidos SET total = COALESCE(total, 0) + $1, actualizado_en = NOW() WHERE id = $2',
      [subtotal, id]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar item' })
  }
}

module.exports = { getPedidos, getPedidoById, crearPedido, actualizarEstado, agregarItem }