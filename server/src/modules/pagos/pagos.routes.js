const express = require('express')
const router = express.Router()
const { getConfiguracion, actualizarConfiguracion, calcularMonto, crearPago, confirmarComprobante, getPromos, crearPromo } = require('./pagos.controller')

router.get('/configuracion', getConfiguracion)
router.put('/configuracion', actualizarConfiguracion)
router.post('/calcular', calcularMonto)
router.post('/', crearPago)
router.put('/:id/comprobante', confirmarComprobante)
router.get('/promos', getPromos)
router.post('/promos', crearPromo)

module.exports = router