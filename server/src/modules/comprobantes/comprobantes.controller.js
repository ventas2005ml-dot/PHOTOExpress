const db = require('../../config/database')
const PDFDocument = require('pdfkit')
const { enviarMailComprobante } = require('../../config/mailer')

const generarComprobante = async (req, res) => {
  try {
    const { pedido_ids, cliente_id } = req.body
    if (!pedido_ids?.length) return res.status(400).json({ error: 'No se indicaron pedidos' })

    const clienteRes = await db.query('SELECT nombre, email FROM usuarios WHERE id = $1', [cliente_id])
    const cliente = clienteRes.rows[0]

    const pedidos = []
    for (const pid of pedido_ids) {
      const p = await db.query(
        `SELECT p.* FROM pedidos p WHERE p.id = $1`, [pid]
      )
      if (!p.rows.length) continue
      const items = await db.query(
        `SELECT pi.cantidad, pi.precio_unitario, pi.subtotal, s.nombre as servicio_nombre
         FROM pedido_items pi LEFT JOIN servicios s ON pi.servicio_id = s.id
         WHERE pi.pedido_id = $1`, [pid]
      )
      pedidos.push({ ...p.rows[0], items: items.rows })
    }

    const nroRes = await db.query('SELECT COUNT(*) FROM comprobantes')
    const nro = String(parseInt(nroRes.rows[0].count) + 1).padStart(6, '0')
    const totalGeneral = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0)

    await db.query(
      `INSERT INTO comprobantes (numero, cliente_id, pedido_ids, total, creado_en) VALUES ($1, $2, $3, $4, NOW())`,
      [nro, cliente_id, pedido_ids, totalGeneral]
    )

    await db.query(
      `UPDATE pedidos SET estado = 'cobrado', actualizado_en = NOW() WHERE id = ANY($1::int[])`,
      [pedido_ids]
    )

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))

    await new Promise(resolve => {
      doc.on('end', resolve)

      doc.fontSize(18).font('Helvetica-Bold').text('PHOTOExpress', 50, 50)
      doc.fontSize(9).font('Helvetica').fillColor('#666')
        .text('Laboratorio fotografico digital', 50, 72)
        .text('www.photoexpress.com.ar  |  WhatsApp: 1140396148', 50, 84)

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
        .text(`COMPROBANTE N ${nro}`, 350, 50, { align: 'right' })
      doc.fontSize(9).font('Helvetica').fillColor('#666')
        .text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 350, 72, { align: 'right' })

      doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#ddd').stroke()

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Cliente:', 50, 125)
      doc.fontSize(10).font('Helvetica').text(cliente?.nombre || '-', 110, 125).text(cliente?.email || '-', 110, 139)

      let y = 168
      const colWidths = [85, 85, 190, 60, 75]
      const headers = ['Nro. Orden', 'Papel', 'Tamanos y cantidades', 'Archivos', 'Total']

      doc.rect(50, y, 495, 18).fill('#f3f4f6')
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151')
      let x = 50
      headers.forEach((h, i) => { doc.text(h, x + 3, y + 5, { width: colWidths[i] - 3 }); x += colWidths[i] })
      y += 18

      for (const p of pedidos) {
        const tamanosStr = p.items.map(i => `${i.servicio_nombre?.replace(/^Foto /, '')} x${i.cantidad}`).join(', ')
        const rowH = Math.max(20, Math.ceil(tamanosStr.length / 32) * 11 + 8)
        doc.rect(50, y, 495, rowH).stroke('#e5e7eb')
        doc.fontSize(8).font('Helvetica').fillColor('#111')
        doc.text(p.codigo, 53, y + 5, { width: 82 })
        doc.text(p.tipo_papel || '-', 138, y + 5, { width: 82 })
        doc.text(tamanosStr, 223, y + 5, { width: 187 })
        doc.text(String(p.archivos_urls?.length || 0), 413, y + 5, { width: 57 })
        doc.text(`$${parseFloat(p.total || 0).toLocaleString('es-AR')}`, 473, y + 5, { width: 67, align: 'right' })
        y += rowH
      }

      y += 10
      doc.rect(370, y, 175, 22).fill('#1d4ed8')
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff')
        .text('TOTAL:', 375, y + 6)
        .text(`$${totalGeneral.toLocaleString('es-AR')}`, 375, y + 6, { width: 165, align: 'right' })

      y += 45
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke()
      y += 10
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151').text('DETALLE DE ORDENES INCLUIDAS', 50, y)
      y += 14

      for (const p of pedidos) {
        const linea = `${p.codigo}  ${p.tipo_papel || '-'}  ${p.items.map(i => `${i.servicio_nombre?.replace(/^Foto /, '')}(${i.cantidad})`).join(', ')}  ${p.archivos_urls?.length || 0} archivos  $${parseFloat(p.total || 0).toLocaleString('es-AR')}`
        doc.fontSize(7).font('Helvetica').fillColor('#555').text(`• ${linea}`, 50, y, { width: 495 })
        y += 11
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
