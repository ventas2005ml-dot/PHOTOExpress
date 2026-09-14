const db = require('../../config/database')
const PDFDocument = require('pdfkit')
const { enviarMailComprobante } = require('../../config/mailer')

const generarComprobante = async (req, res) => {
  try {
    const { pedido_ids, cliente_id, monto_recibido } = req.body
    if (!pedido_ids?.length) return res.status(400).json({ error: 'No se indicaron pedidos' })

    const clienteRes = await db.query('SELECT nombre, email FROM usuarios WHERE id = $1', [cliente_id])
    const cliente = clienteRes.rows[0]

    const configRes = await db.query('SELECT clave, valor FROM configuracion')
    const config = {}
    configRes.rows.forEach(r => { config[r.clave] = r.valor })
    const descuentoPct = parseFloat(config.descuento_transferencia || 0)

    const pedidos = []
    for (const pid of pedido_ids) {
      const p = await db.query('SELECT * FROM pedidos WHERE id = $1', [pid])
      if (!p.rows.length) continue
      const items = await db.query(
        `SELECT pi.cantidad, pi.precio_unitario, s.nombre as servicio_nombre, s.precio as precio_catalogo
         FROM pedido_items pi LEFT JOIN servicios s ON pi.servicio_id = s.id
         WHERE pi.pedido_id = $1`, [pid]
      )
      pedidos.push({ ...p.rows[0], items: items.rows })
    }

    // Agrupar tamaños
    const tamanosMap = {}
    for (const p of pedidos) {
      for (const item of p.items) {
        const nombre = item.servicio_nombre?.replace(/^Foto /, '') || item.servicio_nombre
        if (!tamanosMap[nombre]) {
          tamanosMap[nombre] = { nombre, cantidad: 0, precio_unitario: parseFloat(item.precio_catalogo || item.precio_unitario || 0) }
        }
        tamanosMap[nombre].cantidad += item.cantidad
      }
    }
    const lineas = Object.values(tamanosMap).sort((a, b) => a.nombre.localeCompare(b.nombre))

    const subtotal = lineas.reduce((sum, l) => sum + l.precio_unitario * l.cantidad, 0)
    const descuento = subtotal * (descuentoPct / 100)
    const totalComprobante = subtotal - descuento

    // Saldo anterior del cliente
    const saldoRes = await db.query(
      'SELECT saldo FROM saldos_clientes WHERE cliente_id = $1', [cliente_id]
    )
    const saldoAnterior = saldoRes.rows.length ? parseFloat(saldoRes.rows[0].saldo) : 0

    // Calcular saldo a favor y deuda
    const deudaReal = totalComprobante - saldoAnterior // deuda ajustada por saldo previo
    let saldoAFavor = 0
    let deuda = 0
    let nuevoSaldo = 0

    if (monto_recibido !== null && monto_recibido !== undefined) {
      const pagado = parseFloat(monto_recibido)
      const diferencia = pagado - deudaReal
      if (diferencia > 0) {
        saldoAFavor = diferencia
        nuevoSaldo = diferencia
      } else if (diferencia < 0) {
        deuda = Math.abs(diferencia)
        nuevoSaldo = diferencia // negativo = deuda
      }
    }

    // Actualizar saldo del cliente
    await db.query(
      `INSERT INTO saldos_clientes (cliente_id, saldo, actualizado_en)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cliente_id) DO UPDATE SET saldo = $2, actualizado_en = NOW()`,
      [cliente_id, nuevoSaldo]
    )

    const nroRes = await db.query('SELECT COUNT(*) FROM comprobantes')
    const nro = String(parseInt(nroRes.rows[0].count) + 1).padStart(6, '0')

    await db.query(
      'INSERT INTO comprobantes (numero, cliente_id, pedido_ids, total, creado_en) VALUES ($1, $2, $3, $4, NOW())',
      [nro, cliente_id, pedido_ids, totalComprobante]
    )
    await db.query(
      'UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = ANY($2::int[])',
      ['cobrado', pedido_ids]
    )

    const fmt = n => `$${parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))

    await new Promise(resolve => {
      doc.on('end', resolve)

      // ---- HEADER ----
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text('PHOTOExpress', 50, 50)
      doc.fontSize(9).font('Helvetica').fillColor('#555')
        .text('Laboratorio fotografico digital', 50, 74)
        .text('www.photoexpress.com.ar', 50, 86)
        .text(`WhatsApp: ${config.whatsapp_numero || '1140396148'}`, 50, 98)
        .text(`Alias: ${config.alias || 'photoexpress'}  |  Titular: ${config.titular || 'Jose Luis Fortuna'}`, 50, 110)

      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000')
        .text(`COMPROBANTE N ${nro}`, 300, 50, { width: 245, align: 'right' })
      doc.fontSize(9).font('Helvetica').fillColor('#555')
        .text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 300, 70, { width: 245, align: 'right' })

      doc.moveTo(50, 128).lineTo(545, 128).strokeColor('#aaa').lineWidth(0.5).stroke()

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text('Cliente:', 50, 138)
      doc.fontSize(9).font('Helvetica').text(cliente?.nombre || '-', 110, 138)
        .text(cliente?.email || '-', 110, 150)

      // ---- TABLA ----
      const tY = 175
      const C = { nro: 50, cant: 95, desc: 155, punit: 340, descto: 430, total: 490 }
      const W = { nro: 40, cant: 55, desc: 180, punit: 85, descto: 55, total: 55 }

      doc.rect(50, tY, 495, 18).fill('#e5e7eb')
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151')
      doc.text('Nro', C.nro, tY + 5, { width: W.nro })
        .text('Cantidad', C.cant, tY + 5, { width: W.cant })
        .text('Descripcion', C.desc, tY + 5, { width: W.desc })
        .text('P.Unit', C.punit, tY + 5, { width: W.punit })
        .text('Descuento', C.descto, tY + 5, { width: W.descto })
        .text('Total', C.total, tY + 5, { width: W.total, align: 'right' })

      let y = tY + 18
      lineas.forEach((l, i) => {
        const subtL = l.precio_unitario * l.cantidad
        const totalL = subtL - subtL * (descuentoPct / 100)
        const bg = i % 2 === 0 ? '#f9fafb' : '#fff'
        doc.rect(50, y, 495, 16).fill(bg).stroke('#e5e7eb')
        doc.fontSize(8).font('Helvetica').fillColor('#111')
          .text(String(i + 1).padStart(2, '0'), C.nro, y + 4, { width: W.nro })
          .text(String(l.cantidad), C.cant, y + 4, { width: W.cant })
          .text(l.nombre, C.desc, y + 4, { width: W.desc })
          .text(fmt(l.precio_unitario), C.punit, y + 4, { width: W.punit })
          .text(descuentoPct > 0 ? `${descuentoPct.toFixed(0)}%` : '-', C.descto, y + 4, { width: W.descto })
          .text(fmt(totalL), C.total, y + 4, { width: W.total, align: 'right' })
        y += 16
      })

      // ---- TOTALES ----
      y += 12
      const tCol = 350
      const tW = 195
      const fila = (label, valor, bold = false) => {
        doc.fontSize(8)[bold ? 'font' : 'font'](bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? '#000' : '#555')
          .text(label, tCol, y, { width: tW - 65 })
          .text(valor, tCol + tW - 65, y, { width: 60, align: 'right' })
        y += 13
      }

      fila('Subtotal (1) $', fmt(subtotal))
      if (descuentoPct > 0) {
        fila('Descuento $', fmt(descuento))
        fila('Subtotal (2) $', fmt(subtotal - descuento))
      }
      if (saldoAnterior > 0) fila('Saldo a favor anterior $', fmt(saldoAnterior))
      if (saldoAnterior < 0) fila('Deuda anterior $', fmt(Math.abs(saldoAnterior)))
      fila('Saldo a favor $', saldoAFavor > 0 ? fmt(saldoAFavor) : '-')
      fila('Deuda $', deuda > 0 ? fmt(deuda) : '-')
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
        .text('TOTAL $', tCol, y, { width: tW - 65 })
        .text(fmt(totalComprobante), tCol + tW - 65, y, { width: 60, align: 'right' })
      y += 18

      // ---- PIE: COMANDERA ----
      y += 15
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#aaa').lineWidth(0.5).stroke()
      y += 10

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151')
        .text('Detalle de ordenes incluidas:', 50, y)
      y += 12

      // Tabla comandera
      doc.rect(50, y, 495, 14).fill('#e5e7eb')
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#374151')
        .text('Orden', 53, y + 3, { width: 65 })
        .text('Papel', 123, y + 3, { width: 75 })
        .text('Tamanos y cantidades', 203, y + 3, { width: 210 })
        .text('Archivos', 418, y + 3, { width: 45 })
        .text('Total', 468, y + 3, { width: 72, align: 'right' })
      y += 14

      for (const p of pedidos) {
        const detalleItems = p.items.map(i => `${i.servicio_nombre?.replace(/^Foto /, '')}(${i.cantidad})`).join(', ')
        const bg = pedidos.indexOf(p) % 2 === 0 ? '#f9fafb' : '#fff'
        const h = Math.max(14, Math.ceil(detalleItems.length / 38) * 10 + 4)
        doc.rect(50, y, 495, h).fill(bg).stroke('#e5e7eb')
        doc.fontSize(7).font('Helvetica').fillColor('#333')
          .text(p.codigo, 53, y + 3, { width: 65 })
          .text(p.tipo_papel || '-', 123, y + 3, { width: 75 })
          .text(detalleItems, 203, y + 3, { width: 210 })
          .text(String(p.archivos_urls?.length || 0), 418, y + 3, { width: 45 })
          .text(fmt(p.total), 468, y + 3, { width: 72, align: 'right' })
        y += h
      }

      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    if (cliente?.email) {
      try { await enviarMailComprobante({ nombre: cliente.nombre, email: cliente.email, nro, pdfBuffer }) }
      catch (e) { console.error('Error mail comprobante:', e.message) }
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=comprobante-${nro}.pdf`)
    res.send(pdfBuffer)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al generar comprobante' })
  }
}

const getPedidosFacturados = async (req, res) => {
  try {
    const { cliente_id } = req.params
    const result = await db.query(
      `SELECT p.id, p.codigo, p.tipo_papel, p.total, p.creado_en, p.archivos_urls
       FROM pedidos p WHERE p.estado = 'facturado' AND p.usuario_id = $1
       ORDER BY p.creado_en DESC`, [cliente_id]
    )
    const pedidos = await Promise.all(result.rows.map(async p => {
      const items = await db.query(
        `SELECT pi.cantidad, s.nombre as servicio_nombre FROM pedido_items pi
         LEFT JOIN servicios s ON pi.servicio_id = s.id WHERE pi.pedido_id = $1`, [p.id]
      )
      return { ...p, items: items.rows }
    }))
    res.json(pedidos)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
}

module.exports = { generarComprobante, getPedidosFacturados }
