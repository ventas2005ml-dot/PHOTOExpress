const express = require('express')
const router = express.Router()
const { 
  getCategorias, 
  getServicios, 
  crearCategoria, 
  crearServicio,
  actualizarServicio
} = require('./catalogo.controller')

router.get('/categorias', getCategorias)
router.get('/servicios', getServicios)
router.post('/categorias', crearCategoria)
router.post('/servicios', crearServicio)
router.put('/servicios/:id', actualizarServicio)

module.exports = router