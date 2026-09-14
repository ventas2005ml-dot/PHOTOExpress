const express = require('express')
const router = express.Router()
const { generarComprobante, getPedidosFacturados } = require('./comprobantes.controller')

router.get('/facturados/:cliente_id', getPedidosFacturados)
router.post('/generar', generarComprobante)

module.exports = router
