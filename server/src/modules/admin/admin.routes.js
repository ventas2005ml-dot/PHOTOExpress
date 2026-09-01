const express = require('express')
const router = express.Router()
const { getEstadisticas, getReporteVentas } = require('./admin.controller')

router.get('/estadisticas', getEstadisticas)
router.get('/reporte-ventas', getReporteVentas)

module.exports = router