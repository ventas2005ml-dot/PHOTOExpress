const express = require('express')
const router = express.Router()
const { getUsuarios, crearEmpleado, actualizarEstadoUsuario, eliminarUsuario } = require('./usuarios.controller')

router.get('/', getUsuarios)
router.post('/empleado', crearEmpleado)
router.put('/:id/estado', actualizarEstadoUsuario)
router.delete('/:id', eliminarUsuario)

module.exports = router