const express = require('express')
const router = express.Router()
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
router.post('/:id/items', agregarItem)

module.exports = router