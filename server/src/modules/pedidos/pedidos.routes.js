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
router.post('/:id/items', agregarItem)

module.exports = router