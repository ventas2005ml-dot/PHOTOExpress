const db = require('../../config/database')
const PDFDocument = require('pdfkit')
const { enviarMailComprobante } = require('../../config/mailer')

const generarComprobante = async (req, res) => {
  try {
    const { pedido_ids, cliente_id } = req.body
    if (!pedido_ids?.length) return res.status(400).json({ error: 'No se indicaron pedidos' })

    const clienteRes = await db.query('SELECT nombre, email FROM usuarios WHERE id = $1', [cliente_id])
    const cliente = clienteRes.rows[0]

    // Obtener configuracion de pagos
    const configRes = await db.query('SELECT clave, valor FROM configuracion')
    const config = {}
    configRes.rows.forEach(r => { config[r.clave] = r.valor })
    const descuentoPct = parseFloat(config.descuento_transferencia || 0)

    // Obtener pedidos con items
    const pedidos = []
    for (const pid of pedido_ids) {
      const p = await db.query('SELECT * FROM pedidos WHERE id = $1', [pid])
      if (!p.rows.length) continue
      const items = await db.query(
        `SELECT pi.cantidad, pi.precio_unitario, pi.subtotal, s.nombre as servicio_nombre, s.precio as precio_catalogo
         FROM pedido_items pi LEFT JOIN servicios s ON pi.servicio_id = s.id
         WHERE pi.pedido_id = $1`, [pid]
      )
      pedidos.push({ ...p.rows[0], items: items.rows })
    }

    // Agrupar tamaños entre todos los pedidos
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

    // Calcular totales
    const subtotal = lineas.reduce((sum, l) => sum + l.precio_unitario * l.cantidad, 0)
    const descuento = subtotal * (descuentoPct / 100)
    const total = subtotal - descuento

    // Número de comprobante
    const nroRes = await db.query('SELECT COUNT(*) FROM comprobantes')
    const nro = String(parseInt(nroRes.rows[0].count) + 1).padStart(6, '0')

    // Guardar en DB
    await db.query(
      'INSERT INTO comprobantes (numero, cliente_id, pedido_ids, total, creado_en) VALUES ($1, $2, $3, $4, NOW())',
      [nro, cliente_id, pedido_ids, total]
    )

    // Marcar pedidos como cobrado
    await db.query(
      'UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = ANY($2::int[])',
      ['cobrado', pedido_ids]
    )

    // Generar PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))

    await new Promise(resolve => {
      doc.on('end', resolve)

      const fmt = n => `$${parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

      // Titulo comprobante
      doc.fontSize(14).font('Helvetica-Bold')
        .text(`Comprobante A ${String(nro).padStart(10, '0')}`, { align: 'center' })
      doc.fontSize(9).font('Helvetica').fillColor('#444')
        .text(`${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, { align: 'center' })
      doc.moveDown(0.5)

      // Datos laboratorio
      doc.fontSize(9).font('Helvetica').fillColor('#000')
        .text('PHOTOExpress')
        .text(`Alias: ${config.alias || 'photoexpress'}`)
        .text(`Titular: ${config.titular || 'Jose Luis Fortuna'}`)
        .text(`WhatsApp: ${config.whatsapp_numero || '1140396148'}`)
        .text('www.photoexpress.com.ar')
      doc.moveDown(0.3)

      // Datos cliente
      doc.text(`Cliente: ${cliente?.nombre || '-'}`)
      doc.text(`Email: ${cliente?.email || '-'}`)
      doc.moveDown(0.5)

      // Línea separadora
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke()
      doc.moveDown(0.3)

      // Header tabla
      const cols = { num: 50, cantidad: 90, desc: 150, punit: 340, descto: 430, total: 490 }
      const y0 = doc.y
      doc.fontSize(9).font('Helvetica-Bold')
        .text('Nro', cols.num, y0, { width: 35 })
        .text('Cantidad', cols.cantidad, y0, { width: 55 })
        .text('Descripcion', cols.desc, y0, { width: 180 })
        .text('P.Unit', cols.punit, y0, { width: 85 })
        .text('Descuento', cols.descto, y0, { width: 55 })
        .text('Total', cols.total, y0, { width: 55, align: 'right' })
      doc.moveDown(0.3)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke()
      doc.moveDown(0.2)

      // Filas — tamaños agrupados
      lineas.forEach((l, i) => {
        const subtotalLinea = l.precio_unitario * l.cantidad
        const desctoLinea = subtotalLinea * (descuentoPct / 100)
        const totalLinea = subtotalLinea - desctoLinea
        const y = doc.y
        doc.fontSize(9).font('Helvetica').fillColor('#000')
          .text(String(i + 1).padStart(2, '0'), cols.num, y, { width: 35 })
          .text(String(l.cantidad), cols.cantidad, y, { width: 55 })
          .text(l.nombre, cols.desc, y, { width: 180 })
          .text(fmt(l.precio_unitario), cols.punit, y, { width: 85 })
          .text(descuentoPct > 0 ? `${descuentoPct.toFixed(0)}%` : '-', cols.descto, y, { width: 55 })
          .text(fmt(totalLinea), cols.total, y, { width: 55, align: 'right' })
        doc.moveDown(0.4)
      })

      doc.moveDown(0.3)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke()
      doc.moveDown(0.5)

      // Totales
      const rightX = 380
      doc.fontSize(9).font('Helvetica')
        .text(`Subtotal (1) $`, rightX, doc.y, { width: 100 })
        .text(fmt(subtotal), rightX + 110, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' })
      doc.moveDown(0.3)

      if (descuentoPct > 0) {
        doc.text(`Descuento $`, rightX, doc.y, { width: 100 })
          .text(fmt(descuento), rightX + 110, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' })
        doc.moveDown(0.3)
        doc.text(`Subtotal (2) $`, rightX, doc.y, { width: 100 })
          .text(fmt(subtotal - descuento), rightX + 110, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' })
        doc.moveDown(0.3)
      }

      doc.fontSize(10).font('Helvetica-Bold')
        .text(`TOTAL $`, rightX, doc.y, { width: 100 })
        .text(fmt(total), rightX + 110, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' })

      doc.moveDown(1)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke()
      doc.moveDown(0.5)

      // Pie: comandera con detalle de pedidos
      doc.fontSize(8).font('Helvetica-Bold').text('Detalle de ordenes incluidas:')
      doc.moveDown(0.2)
      for (const p of pedidos) {
        const detalleItems = p.items.map(i => `${i.servicio_nombre?.replace(/^Foto /, '')}(${i.cantidad})`).join(', ')
        doc.fontSize(7).font('Helvetica').fillColor('#444')
          .text(`${p.codigo}  ${p.tipo_papel || '-'}  ${detalleItems}  ${p.archivos_urls?.length || 0} archivos  ${fmt(p.total)}`)
        doc.moveDown(0.2)
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
