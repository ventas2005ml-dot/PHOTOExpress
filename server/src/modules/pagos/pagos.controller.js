const db = require('../../config/database')

const getConfiguracion = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM configuracion')
    const config = {}
    result.rows.forEach(r => { config[r.clave] = r.valor })
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuracion' })
  }
}

const actualizarConfiguracion = async (req, res) => {
  try {
    const updates = req.body
    for (const [clave, valor] of Object.entries(updates)) {
      await db.query('UPDATE configuracion SET valor = $1 WHERE clave = $2', [valor, clave])
    }
    const result = await db.query('SELECT * FROM configuracion')
    const config = {}
    result.rows.forEach(r => { config[r.clave] = r.valor })
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuracion' })
  }
}

const calcularMonto = async (req, res) => {
  try {
    const { pedido_id, metodo } = req.body
    const pedido = await db.query('SELECT total FROM pedidos WHERE id = $1', [pedido_id])
    if (pedido.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' })
    const monto_original = parseFloat(pedido.rows[0].total)
    const config = await db.query('SELECT * FROM configuracion')
    const cfg = {}
    config.rows.forEach(r => { cfg[r.clave] = parseFloat(r.valor) || 0 })
    let descuento_pct = 0
    let recargo_pct = 0
    if (metodo === 'transferencia') descuento_pct = cfg.descuento_transferencia || 0
    if (metodo === 'efectivo') descuento_pct = cfg.descuento_efectivo || 0
    if (metodo === 'mercadopago') recargo_pct = cfg.recargo_mp || 0
    const monto_final = monto_original * (1 - descuento_pct / 100) * (1 + recargo_pct / 100)
    res.json({ monto_original, descuento_pct, recargo_pct, monto_final: Math.round(monto_final), ahorro: Math.round(monto_original - monto_final) })
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular monto' })
  }
}

const crearPago = async (req, res) => {
  try {
    const { pedido_id, metodo } = req.body
    const pedido = await db.query('SELECT total FROM pedidos WHERE id = $1', [pedido_id])
    if (pedido.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' })
    const monto_original = parseFloat(pedido.rows[0].total)
    const config = await db.query('SELECT * FROM configuracion')
    const cfg = {}
    config.rows.forEach(r => { cfg[r.clave] = parseFloat(r.valor) || 0 })
    let descuento_pct = 0
    let recargo_pct = 0
    if (metodo === 'transferencia') descuento_pct = cfg.descuento_transferencia || 0
    if (metodo === 'efectivo') descuento_pct = cfg.descuento_efectivo || 0
    if (metodo === 'mercadopago') recargo_pct = cfg.recargo_mp || 0
    const monto_final = Math.round(monto_original * (1 - descuento_pct / 100) * (1 + recargo_pct / 100))
    const result = await db.query(
      "INSERT INTO pagos (pedido_id, metodo, monto_original, descuento_pct, recargo_pct, monto_final, estado) VALUES ($1, $2, $3, $4, $5, $6, 'pendiente') RETURNING *",
      [pedido_id, metodo, monto_original, descuento_pct, recargo_pct, monto_final]
    )
    const pago = result.rows[0]
    const cbu = (await db.query("SELECT valor FROM configuracion WHERE clave='cbu'")).rows[0]?.valor
    const alias = (await db.query("SELECT valor FROM configuracion WHERE clave='alias'")).rows[0]?.valor
    const titular = (await db.query("SELECT valor FROM configuracion WHERE clave='titular'")).rows[0]?.valor
    const linkMP = (await db.query("SELECT valor FROM configuracion WHERE clave='link_mp'")).rows[0]?.valor
    let msgPago = ''
    if (metodo === 'transferencia') msgPago = 'Datos para transferir:\nCBU: ' + cbu + '\nAlias: ' + alias + '\nTitular: ' + titular
    else if (metodo === 'mercadopago') msgPago = 'Paga por MercadoPago desde este link:\n' + linkMP
    else if (metodo === 'efectivo') msgPago = 'Abonas en efectivo al retirar.'
    const pedidoData = await db.query("SELECT p.codigo, u.nombre FROM pedidos p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = $1", [pedido_id])
    const { codigo, nombre } = pedidoData.rows[0]
    const desc = descuento_pct > 0 ? ' (' + descuento_pct + '% de descuento aplicado)' : ''
    const rec = recargo_pct > 0 ? ' (incluye ' + recargo_pct + '% de recargo)' : ''
    const mensajeWA = 'Hola ' + nombre + '! Tu pedido *' + codigo + '* fue recibido.\n\n*Total a abonar: $' + monto_final.toLocaleString() + '*' + desc + rec + '\n\n' + msgPago + '\n\nEl procesamiento comienza una vez confirmado el pago.'
    res.status(201).json({ pago, mensajeWA })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear pago' })
  }
}

const confirmarComprobante = async (req, res) => {
  try {
    const { id } = req.params
    const { comprobante_url } = req.body
    const pago = await db.query("UPDATE pagos SET estado = 'confirmado', comprobante_url = $1 WHERE id = $2 RETURNING *", [comprobante_url, id])
    if (pago.rows.length === 0) return res.status(404).json({ error: 'Pago no encontrado' })
    await db.query("UPDATE pedidos SET estado = 'en_proceso', actualizado_en = NOW() WHERE id = $1", [pago.rows[0].pedido_id])
    const pedidoData = await db.query("SELECT p.codigo, u.nombre FROM pedidos p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = $1", [pago.rows[0].pedido_id])
    const { codigo, nombre } = pedidoData.rows[0]
    const mensajeWA = 'Hola ' + nombre + '! Recibimos tu comprobante de pago.\n\nTu pedido *' + codigo + '* esta siendo procesado.\n\nTe avisamos cuando este listo para retirar.'
    res.json({ pago: pago.rows[0], mensajeWA })
  } catch (error) {
    res.status(500).json({ error: 'Error al confirmar comprobante' })
  }
}

const getPromos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM promos WHERE activo = true ORDER BY nombre')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener promos' })
  }
}

const crearPromo = async (req, res) => {
  try {
    const { nombre, descripcion, precio } = req.body
    const result = await db.query('INSERT INTO promos (nombre, descripcion, precio) VALUES ($1, $2, $3) RETURNING *', [nombre, descripcion, precio])
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al crear promo' })
  }
}

module.exports = { getConfiguracion, actualizarConfiguracion, calcularMonto, crearPago, confirmarComprobante, getPromos, crearPromo }