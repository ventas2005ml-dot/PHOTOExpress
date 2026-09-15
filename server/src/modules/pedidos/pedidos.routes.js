const express = require('express')
const router = express.Router()
const db = require('../../config/database')
const {
  getPedidos,
  getPedidoById,
  crearPedido,
  actualizarEstado,
  agregarItem
} = require('./pedidos.controller')

router.get('/', getPedidos)
router.get('/:id', getPedidoById)
router.post('/', crearPedido)
router.put('/:id/estado', actualizarEstado)
router.put('/:id/archivos', async (req, res) => {
  try {
    const { id } = req.params
    const { archivos_urls } = req.body
    await db.query('UPDATE pedidos SET archivos_urls = $1 WHERE id = $2', [archivos_urls, id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar archivos' })
  }
})

router.get('/:id/descargar', async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query('SELECT codigo, archivos_urls FROM pedidos WHERE id = $1', [id])
    if (!result.rows.length) return res.status(404).json({ error: 'Pedido no encontrado' })
    
    const { codigo, archivos_urls } = result.rows[0]
    if (!archivos_urls?.length) return res.status(404).json({ error: 'Sin archivos' })

    const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.3:8090'
    const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER || 'Photoexpress'
    const NEXTCLOUD_PASS = process.env.NEXTCLOUD_PASS || 'w2Gp2-gmFTN-cGyGp-HYXZE-BEj2i'
    const auth = Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASS}`).toString('base64')

    const archiver = require('archiver')
    const archive = archiver('zip', { zlib: { level: 9 } })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename=${codigo}.zip`)
    archive.pipe(res)

    for (const url of archivos_urls) {
      const filename = url.split('/').pop()
      const fileRes = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
      if (fileRes.ok) {
        const buffer = await fileRes.arrayBuffer()
        archive.append(Buffer.from(buffer), { name: filename })
      }
    }

    await archive.finalize()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al descargar archivos' })
  }
})
router.post('/:id/items', agregarItem)

module.exports = router